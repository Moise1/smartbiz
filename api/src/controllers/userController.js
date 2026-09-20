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

// Admin: edit a user's name, email, and role. Superadmin accounts are
// protected — their details can't be changed here.
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const existing = await query('SELECT is_superadmin FROM users WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ message: 'User not found' });
    if (existing.rows[0].is_superadmin) {
      return res.status(403).json({ message: 'The super admin account cannot be edited here.' });
    }

    // Guard against taking an email already used by a different account.
    const clash = await query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, id]);
    if (clash.rows.length) return res.status(409).json({ message: 'Email already in use' });

    const result = await query(
      `UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4
       RETURNING id, name, email, role, created_at`,
      [name, email, role, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// Admin: delete a user. Cascades to their businesses, links, reviews, and
// subscriptions. The super admin and your own account can't be deleted.
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }
    const existing = await query('SELECT is_superadmin FROM users WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ message: 'User not found' });
    if (existing.rows[0].is_superadmin) {
      return res.status(403).json({ message: 'The super admin account cannot be deleted.' });
    }

    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}

// Admin: list all users with how many businesses each is linked to.
export async function getUsers(req, res, next) {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_superadmin, u.created_at,
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
