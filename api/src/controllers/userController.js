import { query } from '../config/database.js';

// Admin: one user plus every business linked to them.
export async function getUserById(req, res, next) {
  try {
    const userResult = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const businesses = await query(
      `SELECT b.id, b.name, b.city, b.plan,
              (b.plan <> 'free' AND b.plan_expires_at > NOW()) AS plan_active,
              c.name AS category_name,
              COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
              COUNT(DISTINCT r.id)::int AS review_count
       FROM user_businesses ub
       JOIN businesses b ON b.id = ub.business_id AND b.is_active = true
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN reviews r ON r.business_id = b.id
       WHERE ub.user_id = $1
       GROUP BY b.id, c.name
       ORDER BY b.name`,
      [req.params.id]
    );

    res.json({ ...user, businesses: businesses.rows });
  } catch (err) {
    next(err);
  }
}

// Admin: list all users with how many businesses each is linked to.
export async function getUsers(req, res, next) {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              COUNT(ub.business_id)::int AS business_count
       FROM users u
       LEFT JOIN user_businesses ub ON ub.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC, u.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}
