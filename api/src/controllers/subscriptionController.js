import { query, getClient } from '../config/database.js';
import { PLANS, PLAN_DURATION_DAYS } from '../config/plans.js';

export function getPlans(_req, res) {
  res.json(Object.values(PLANS));
}

export async function subscribe(req, res, next) {
  const client = await getClient();
  try {
    const { business_id, plan } = req.body;

    const planDef = PLANS[plan];
    if (!planDef) {
      return res.status(400).json({ message: 'Unknown plan. Choose basic, standard, or premium.' });
    }

    const owned = await client.query(
      'SELECT id, name, plan FROM businesses WHERE id = $1 AND is_active = true',
      [business_id]
    );
    const business = owned.rows[0];
    if (!business) return res.status(404).json({ message: 'Business not found' });

    const ownerCheck = await client.query(
      'SELECT 1 FROM user_businesses WHERE business_id = $1 AND user_id = $2',
      [business_id, req.user.id]
    );
    if (!ownerCheck.rows[0] && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only subscribe for your own business' });
    }

    await client.query('BEGIN');

    // Payment is simulated for now — record the subscription and activate it.
    const expiresAt = new Date(Date.now() + PLAN_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const sub = await client.query(
      `INSERT INTO subscriptions (business_id, user_id, plan, amount_rwf, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [business_id, req.user.id, plan, planDef.price_rwf, expiresAt]
    );

    await client.query(
      'UPDATE businesses SET plan = $1, plan_expires_at = $2, updated_at = NOW() WHERE id = $3',
      [plan, expiresAt, business_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: `${business.name} is now on the ${planDef.name} plan`,
      subscription: sub.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

export async function getMySubscriptions(req, res, next) {
  try {
    const result = await query(
      `SELECT s.id, s.business_id, s.plan, s.amount_rwf, s.starts_at, s.expires_at,
              b.name AS business_name,
              (s.expires_at > NOW() AND b.plan = s.plan) AS is_current
       FROM subscriptions s
       JOIN businesses b ON b.id = s.business_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}
