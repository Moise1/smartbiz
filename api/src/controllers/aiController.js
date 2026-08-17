import { GoogleGenerativeAI } from '@google/generative-ai';
import { query } from '../config/database.js';

const genAI = new GoogleGenerativeAI(process.env.SMARTBIZ_GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function generate(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}

const KIGALI_DISTRICTS = ['gasabo', 'kicukiro', 'nyarugenge'];

export async function getRecommendations(req, res, next) {
  try {
    const { preferences, city = 'Kigali', limit = 5 } = req.body;

    const isKigali = city.toLowerCase().includes('kigali') ||
      KIGALI_DISTRICTS.includes(city.toLowerCase());

    let businesses;
    if (isKigali) {
      businesses = await query(
        `SELECT b.name, b.description, b.city, b.address,
                c.name AS category,
                COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
                COUNT(DISTINCT r.id) AS review_count
         FROM businesses b
         LEFT JOIN categories c ON c.id = b.category_id
         LEFT JOIN reviews r ON r.business_id = b.id
         WHERE b.is_active = true
           AND LOWER(b.city) = ANY($1)
         GROUP BY b.id, c.name
         ORDER BY avg_rating DESC, review_count DESC
         LIMIT 50`,
        [KIGALI_DISTRICTS]
      );
    } else {
      businesses = await query(
        `SELECT b.name, b.description, b.city, b.address,
                c.name AS category,
                COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
                COUNT(DISTINCT r.id) AS review_count
         FROM businesses b
         LEFT JOIN categories c ON c.id = b.category_id
         LEFT JOIN reviews r ON r.business_id = b.id
         WHERE b.is_active = true AND b.city ILIKE $1
         GROUP BY b.id, c.name
         ORDER BY avg_rating DESC, review_count DESC
         LIMIT 50`,
        [`%${city}%`]
      );
    }

    // If no city-specific results, fetch top businesses globally
    if (businesses.rows.length === 0) {
      businesses = await query(
        `SELECT b.name, b.description, b.city, b.address,
                c.name AS category,
                COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
                COUNT(DISTINCT r.id) AS review_count
         FROM businesses b
         LEFT JOIN categories c ON c.id = b.category_id
         LEFT JOIN reviews r ON r.business_id = b.id
         WHERE b.is_active = true
         GROUP BY b.id, c.name
         ORDER BY avg_rating DESC, review_count DESC
         LIMIT 50`
      );
    }

    const prompt = `You are a local business recommendation assistant for ${city}, Rwanda.
Based on the user's preferences: "${preferences}"

Here are available businesses:
${businesses.rows.map((b, i) =>
  `${i + 1}. ${b.name} (${b.category}) - Rating: ${b.avg_rating}/5 (${b.review_count} reviews)
   ${b.description?.slice(0, 120) || 'No description'}`
).join('\n')}

Recommend the top ${limit} most relevant businesses for the user's needs.
Return ONLY a valid JSON array of objects with fields: name (string), reason (string, 1 sentence).
No markdown, no code fences, no extra text — just the raw JSON array.`;

    let recommendations;
    try {
      const text = await generate(prompt);
      const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      recommendations = JSON.parse(cleaned);
    } catch (aiErr) {
      // Gemini unavailable (quota, network) — fall back to top-rated DB results
      recommendations = businesses.rows.slice(0, limit).map((b) => ({
        name: b.name,
        reason: `${b.category} in ${b.city}${parseFloat(b.avg_rating) > 0 ? ` — rated ${b.avg_rating}/5` : ''}.`,
      }));
    }

    res.json({ recommendations, city });
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
