import Anthropic from '@anthropic-ai/sdk';
import { query } from '../config/database.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function getRecommendations(req, res, next) {
  try {
    const { preferences, city = 'Kigali', limit = 5 } = req.body;

    const businesses = await query(
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

    const prompt = `You are a local business recommendation assistant for ${city}.
Based on the user's preferences: "${preferences}"

Here are available businesses:
${businesses.rows.map((b, i) =>
  `${i + 1}. ${b.name} (${b.category}) - Rating: ${b.avg_rating}/5 (${b.review_count} reviews)
   ${b.description?.slice(0, 120) || 'No description'}`
).join('\n')}

Recommend the top ${limit} most relevant businesses for the user's needs.
Return a JSON array of objects with fields: name, reason (1 sentence why it matches).
Only return valid JSON, no other text.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    let recommendations;
    try {
      recommendations = JSON.parse(message.content[0].text);
    } catch {
      recommendations = [];
    }

    res.json({ recommendations, city });
  } catch (err) {
    next(err);
  }
}

export async function improveSearch(req, res, next) {
  try {
    const { query: userQuery } = req.body;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Extract search intent from this local business search query: "${userQuery}"
Return JSON with fields: keywords (array of search terms), category (guessed business category or null), city (if mentioned or null).
Only return valid JSON.`,
      }],
    });

    let parsed;
    try {
      parsed = JSON.parse(message.content[0].text);
    } catch {
      parsed = { keywords: [userQuery], category: null, city: null };
    }

    res.json(parsed);
  } catch (err) {
    next(err);
  }
}
