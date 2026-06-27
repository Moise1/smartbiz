import { query } from '../config/database.js';

export async function getCategories(_req, res, next) {
  try {
    const result = await query(
      `SELECT c.*, COUNT(b.id) AS business_count
       FROM categories c
       LEFT JOIN businesses b ON b.category_id = c.id AND b.is_active = true
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, description, icon } = req.body;
    const result = await query(
      'INSERT INTO categories (name, description, icon) VALUES ($1,$2,$3) RETURNING *',
      [name, description, icon]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
