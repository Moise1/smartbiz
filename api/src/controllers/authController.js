import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { sendWelcomeEmail } from '../config/mailer.js';

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

// Admin-only: create a business-owner account. The owner then signs in and
// registers their own businesses from their dashboard.
export async function createBusinessOwner(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'business_owner')
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );
    const user = result.rows[0];

    // Welcome the new owner with their login details (never blocks creation).
    const { delivered } = await sendWelcomeEmail({ name, email, password });

    res.status(201).json({ ...user, emailDelivered: delivered });
  } catch (err) {
    next(err);
  }
}

// Any signed-in user edits their own profile (name, email, optional new
// password). Role is never changed here. A fresh token is returned because
// the email lives in the token.
export async function updateProfile(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const clash = await query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, req.user.id]);
    if (clash.rows.length) return res.status(409).json({ message: 'Email already in use' });

    let result;
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      result = await query(
        `UPDATE users SET name = $1, email = $2, password_hash = $3 WHERE id = $4
         RETURNING id, name, email, role, is_superadmin, created_at`,
        [name, email, passwordHash, req.user.id]
      );
    } else {
      result = await query(
        `UPDATE users SET name = $1, email = $2 WHERE id = $3
         RETURNING id, name, email, role, is_superadmin, created_at`,
        [name, email, req.user.id]
      );
    }

    const user = result.rows[0];
    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
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
