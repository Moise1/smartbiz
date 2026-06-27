import { query } from '../config/database.js';

export async function getBusinessReviews(req, res, next) {
  try {
    const { business_id } = req.params;
    const result = await query(
      `SELECT r.*, u.name AS user_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.business_id = $1
       ORDER BY r.created_at DESC`,
      [business_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createReview(req, res, next) {
  try {
    const { business_id } = req.params;
    const { rating, comment } = req.body;

    const existing = await query(
      'SELECT id FROM reviews WHERE user_id = $1 AND business_id = $2',
      [req.user.id, business_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'You already reviewed this business' });
    }

    const result = await query(
      `INSERT INTO reviews (user_id, business_id, rating, comment)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [req.user.id, business_id, rating, comment]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    await query(
      'DELETE FROM reviews WHERE id = $1 AND (user_id = $2 OR $3 = \'admin\')',
      [id, req.user.id, req.user.role]
    );
    res.json({ message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
}
