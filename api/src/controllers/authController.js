import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, getClient } from '../config/database.js';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, is_superadmin: user.is_superadmin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Public self-registration always creates a customer account. Business-owner
// accounts are created by an admin (see createBusinessOwner) — never here.
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

// Admin-only: create a business-owner account together with their first
// business. User, business, and the ownership link are created atomically.
export async function createBusinessOwner(req, res, next) {
  const client = await getClient();
  try {
    const { name, email, password, business = {} } = req.body;

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'business_owner')
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );
    const user = userResult.rows[0];

    const bizResult = await client.query(
      `INSERT INTO businesses (owner_id, name, description, category_id, city)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name`,
      [user.id, business.name, business.description, business.category_id, business.city]
    );
    await client.query(
      'INSERT INTO user_businesses (user_id, business_id) VALUES ($1, $2)',
      [user.id, bizResult.rows[0].id]
    );

    await client.query('COMMIT');
    res.status(201).json({ ...user, business: bizResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, name, email, password_hash, role, is_superadmin FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { password_hash, ...safeUser } = user;
    res.json({ token: signToken(safeUser), user: safeUser });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const result = await query(
      'SELECT id, name, email, role, is_superadmin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
