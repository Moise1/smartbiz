import { GoogleGenerativeAI } from '@google/generative-ai';
import { Districts, Sectors } from 'rwanda';
import { query } from '../config/database.js';

const genAI = new GoogleGenerativeAI(process.env.SMARTBIZ_GEMINI_API_KEY);
// gemini-1.5-flash was retired by Google — requests to it fail, silently
// dropping every recommendation to the DB fallback.
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function generate(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

const KIGALI_DISTRICTS = ['gasabo', 'kicukiro', 'nyarugenge'];
const DISTRICT_SET = new Set(Districts().map((d) => d.toLowerCase()));

// Kigali sector → parent district. A sector like Remera only appears in a
// handful of names/descriptions, so recommendations must draw from the whole
// parent district and merely *prefer* the sector, not hard-filter on it.
const KIGALI_SECTOR_DISTRICT = Object.fromEntries(Object.entries({
  Gasabo: ['Bumbogo', 'Gatsata', 'Gikomero', 'Gisozi', 'Jabana', 'Jali', 'Kacyiru',
           'Kimihurura', 'Kimironko', 'Kinyinya', 'Ndera', 'Nduba', 'Remera', 'Rusororo', 'Rutunga'],
  Kicukiro: ['Gahanga', 'Gatenga', 'Gikondo', 'Kagarama', 'Kanombe', 'Kicukiro',
             'Kigarama', 'Masaka', 'Niboye', 'Nyarugunga'],
  Nyarugenge: ['Gitega', 'Kanyinya', 'Kigali', 'Kimisagara', 'Mageragere', 'Muhima',
               'Nyakabanda', 'Nyamirambo', 'Nyarugenge', 'Rwezamenyo'],
}).flatMap(([district, sectors]) => sectors.map((s) => [s.toLowerCase(), district])));

// All 30 districts + 416 sectors, used to detect a place name ("Remera",
// "Kicukiro", …) inside the user's free-text preferences. Districts are
// listed first so a district mention wins over a same-named sector.
const KNOWN_LOCATIONS = [...new Set(
  [...Districts(), ...Sectors()].map((n) => n.toLowerCase())
)];

function extractLocation(text = '') {
  const lower = text.toLowerCase();
  if (/\bkigali\b/.test(lower)) return 'kigali';
  return KNOWN_LOCATIONS.find((loc) => new RegExp(`\\b${loc}\\b`).test(lower)) || null;
}

// Duplicate-safe: the DB may hold repeated seed rows; never show the same
// business twice.
function dedupe(rows) {
  const seen = new Set();
  return rows.filter((b) => {
    const key = `${b.name.toLowerCase()}|${(b.city || '').toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Keyword scoring for the no-AI fallback so a "lunch" query surfaces
// restaurants rather than the top-rated business of any kind.
const CATEGORY_HINTS = [
  [/lunch|dinner|breakfast|brunch|food|eat|meal|restaurant|caf[eé]|coffee/, /restaurant/i],
  [/hotel|lodge|guesthouse|accommodation|stay|sleep/, /hotel/i],
  [/pharmacy|medicine|drugs?\b/, /health/i],
  [/clinic|doctor|hospital|health/, /health/i],
  [/salon|hair|beauty|spa|nails?/, /beauty/i],
  [/car ?wash|detailing/, /car wash/i],
  [/car (hire|rental)|rent.{0,8}car|taxi|transport/, /transport/i],
  [/\bbars?\b|drinks?|nightlife|club|entertainment/, /entertainment/i],
  [/fashion|cloth|boutique|shop/, /retail/i],
  [/furniture|carpent|wood|construction/, /construction/i],
];

function scoreBusiness(b, preferences) {
  const prefs = preferences.toLowerCase();
  const hay = `${b.name} ${b.category || ''} ${b.description || ''}`.toLowerCase();
  let score = 0;
  for (const [needRe, catRe] of CATEGORY_HINTS) {
    if (needRe.test(prefs) && catRe.test(b.category || '')) score += 5;
  }
  for (const token of prefs.split(/\W+/).filter((t) => t.length > 2)) {
    if (hay.includes(token)) score += 1;
  }
  return score;
}

// Map the user's need to the category their results must belong to, so a
// "restaurants in Remera" query pools only restaurants — not every business
// in the area. Returns a case-insensitive pattern for `c.name ~* $n`, or null.
function detectCategoryPattern(preferences = '') {
  const prefs = preferences.toLowerCase();
  for (const [needRe, catRe] of CATEGORY_HINTS) {
    if (needRe.test(prefs)) return catRe.source;
  }
  return null;
}

// Append a category condition to a WHERE clause, pushing its param.
function withCat(params, catPattern) {
  if (!catPattern) return '';
  params.push(catPattern);
  return ` AND c.name ~* $${params.length}`;
}

// Run a pool query. `prefer` (optional) is a boolean SQL expression whose
// TRUE rows sort first (used to rank exact-sector matches ahead of the rest).
function poolQuery({ where, params, prefer }) {
  const preferSelect = prefer ? `, (${prefer}) AS in_sector` : '';
  const order = prefer ? 'in_sector DESC, ' : '';
  return query(
    `SELECT b.name, b.description, b.city, b.address, c.name AS category${preferSelect},
            COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
            COUNT(DISTINCT r.id) AS review_count
     FROM businesses b
     LEFT JOIN categories c ON c.id = b.category_id
     LEFT JOIN reviews r ON r.business_id = b.id
     WHERE ${where}
     GROUP BY b.id, c.name
     ORDER BY ${order}avg_rating DESC, review_count DESC
     LIMIT 50`,
    params
  );
}

export async function getRecommendations(req, res, next) {
  try {
    const { preferences = '', city, limit = 5 } = req.body;

    // Location can arrive as an explicit `city` field or embedded in the
    // preferences text ("healthy lunch near Remera"). The requested category
    // (restaurants, hotels, …) tightens the pool so results match the ask.
    const location = extractLocation(`${preferences} ${city || ''}`);
    const catPattern = detectCategoryPattern(preferences);

    let businesses;
    let locationApplied = Boolean(location);
    let approximate = false;   // widened a named sector to its parent district
    let areaLabel = null;      // the wider area a sector was widened to

    if (location === 'kigali') {
      const params = [KIGALI_DISTRICTS];
      const where = `b.is_active = true AND LOWER(b.city) = ANY($1)` + withCat(params, catPattern);
      businesses = await poolQuery({ where, params });
    } else if (location && DISTRICT_SET.has(location)) {
      const params = [location];
      const where = `b.is_active = true AND b.city ILIKE $1` + withCat(params, catPattern);
      businesses = await poolQuery({ where, params });
    } else if (location && KIGALI_SECTOR_DISTRICT[location]) {
      // Kigali sector (e.g. Remera): return businesses ACTUALLY in the sector
      // first — those whose name/description/address names it. Only if none
      // exist do we widen to the parent district (flagged as approximate).
      const exactParams = [`%${location}%`];
      const exactWhere =
        `b.is_active = true AND (b.name ILIKE $1 OR b.description ILIKE $1 OR b.address ILIKE $1)` +
        withCat(exactParams, catPattern);
      businesses = await poolQuery({ where: exactWhere, params: exactParams });

      if (businesses.rows.length === 0) {
        const district = KIGALI_SECTOR_DISTRICT[location];
        const params = [district, `%${location}%`];
        const where = `b.is_active = true AND b.city ILIKE $1` + withCat(params, catPattern);
        businesses = await poolQuery({
          where,
          params,
          prefer: `b.name ILIKE $2 OR b.description ILIKE $2 OR b.address ILIKE $2`,
        });
        approximate = true;
        areaLabel = district;
      }
    } else if (location) {
      // A sector outside Kigali — match it against city, address, name, and
      // description text. Exact only; no district mapping to widen to.
      const params = [location, `%${location}%`];
      const where =
        `b.is_active = true AND (b.city ILIKE $1 OR b.address ILIKE $2 OR b.name ILIKE $2 OR b.description ILIKE $2)` +
        withCat(params, catPattern);
      businesses = await poolQuery({ where, params });
    } else {
      const params = [];
      const where = `b.is_active = true` + withCat(params, catPattern);
      businesses = await poolQuery({ where, params });
    }

    // Spill over to top businesses globally ONLY for a general query (no
    // location named). When the user named a place we keep results exact —
    // an empty pool yields an honest "nothing here" rather than unrelated
    // businesses from across the country.
    if (businesses.rows.length === 0 && !locationApplied) {
      const params = [];
      const where = `b.is_active = true` + withCat(params, catPattern);
      businesses = await poolQuery({ where, params });
      if (businesses.rows.length === 0) {
        businesses = await poolQuery({ where: 'b.is_active = true', params: [] });
      }
    }

    const pool = dedupe(businesses.rows);

    const locationLabel = location
      ? location.charAt(0).toUpperCase() + location.slice(1)
      : 'Rwanda';

    const prompt = `You are a local business recommendation assistant for ${locationLabel}, Rwanda.
The user asked: "${preferences}"

Here are available businesses:
${pool.map((b, i) =>
  `${i + 1}. ${b.name} (${b.category}) - Location: ${b.address || b.city}${b.in_sector ? ` (in ${locationLabel})` : ''} - Rating: ${b.avg_rating}/5 (${b.review_count} reviews)
   ${b.description?.slice(0, 120) || 'No description'}`
).join('\n')}

Recommend up to ${limit} businesses. Rules:
- The TYPE of business must match the user's need first: a food request must only return restaurants/cafes, an accommodation request only hotels, and so on.${locationApplied && !approximate ? `
- Every business in the list is located in ${locationLabel}. Recommend ONLY businesses from this list that match the user's need — do not suggest anywhere outside ${locationLabel}.` : ''}${approximate ? `
- The user asked for ${locationLabel}, but no business is listed exactly there. The list covers the surrounding ${areaLabel} area — recommend the closest matches and make clear in the reason that they are in ${areaLabel}, near ${locationLabel}.` : ''}
- If only a few businesses genuinely match, return only those. Never pad the list with unrelated businesses. If nothing matches, return [].
- Never recommend the same business twice.
Return ONLY a valid JSON array of objects with fields: name (string), reason (string, 1 sentence).
No markdown, no code fences, no extra text — just the raw JSON array.`;

    let recommendations;
    try {
      const text = await generate(prompt);
      const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      recommendations = JSON.parse(cleaned);
    } catch (aiErr) {
      // Gemini unavailable (bad key, quota, retired model) — fall back to a
      // keyword-scored DB ranking so results still match the request type.
      console.error('AI recommendation fallback:', aiErr.message);
      const scored = pool
        .map((b) => ({ b, score: scoreBusiness(b, preferences) }))
        .sort((x, y) => y.score - x.score);
      const relevant = scored.some((s) => s.score > 0)
        ? scored.filter((s) => s.score > 0)
        : scored;
      recommendations = relevant.slice(0, limit).map(({ b }) => ({
        name: b.name,
        reason: `${b.category} in ${b.city}${parseFloat(b.avg_rating) > 0 ? ` — rated ${b.avg_rating}/5` : ''}.`,
      }));
    }

    res.json({ recommendations, location: locationLabel });
  } catch (err) {
    next(err);
  }
}

export async function improveSearch(req, res, next) {
  try {
    const { query: userQuery } = req.body;

    const prompt = `Extract search intent from this local business search query: "${userQuery}"
Return ONLY a valid JSON object with fields: keywords (array of strings), category (string or null), city (string or null).
No markdown, no code fences, no extra text — just the raw JSON object.`;

    const text = await generate(prompt);

    let parsed;
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/,'').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { keywords: [userQuery], category: null, city: null };
    }

    res.json(parsed);
  } catch (err) {
    next(err);
  }
}
