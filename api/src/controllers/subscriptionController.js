import { query, getClient } from '../config/database.js';
import { PLANS, PLAN_DURATION_DAYS } from '../config/plans.js';

export function getPlans(_req, res) {
  res.json(Object.values(PLANS));
}

// Build a masked, human-readable payment reference from the (simulated)
// payment details. Only the masked form is ever stored — never the full
// card number or phone.
function buildPaymentReference(method, details = {}) {
  if (method === 'momo') {
    const phone = String(details.phone || '').replace(/\D/g, '');
    if (phone.length < 9) return { error: 'Enter a valid MoMo phone number.' };
    const masked = `${phone.slice(0, 3)}****${phone.slice(-3)}`;
    return { reference: `MoMo ${masked}` };
  }
  if (method === 'card') {
    const number = String(details.card_number || '').replace(/\D/g, '');
    if (number.length < 13) return { error: 'Enter a valid card number.' };
    if (!/^\d{2}\/\d{2}$/.test(String(details.expiry || ''))) return { error: 'Enter a valid card expiry (MM/YY).' };
    if (!/^\d{3,4}$/.test(String(details.cvv || ''))) return { error: 'Enter a valid card CVV.' };
    return { reference: `VISA ****${number.slice(-4)}` };
  }
  return { error: 'Choose a payment method: MoMo or card.' };
}

export async function subscribe(req, res, next) {
  const client = await getClient();
  try {
    const { business_id, plan, payment_method, payment_details } = req.body;

    const planDef = PLANS[plan];
    if (!planDef) {
      return res.status(400).json({ message: 'Unknown plan. Choose basic, standard, or premium.' });
    }

    // Simulated checkout — validate details and produce a masked reference.
    const payment = buildPaymentReference(payment_method, payment_details);
    if (payment.error) {
      return res.status(400).json({ message: payment.error });
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
      `INSERT INTO subscriptions (business_id, user_id, plan, amount_rwf, expires_at, payment_method, payment_reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [business_id, req.user.id, plan, planDef.price_rwf, expiresAt, payment_method, payment.reference]
    );

    await client.query(
      'UPDATE businesses SET plan = $1, plan_expires_at = $2, updated_at = NOW() WHERE id = $3',
      [plan, expiresAt, business_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: `${business.name} is now on the ${planDef.name} plan`,
      payment_reference: payment.reference,
      subscription: sub.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

// Admin: per-plan share and revenue, plus the latest subscriptions.
export async function getSubscriptionStats(req, res, next) {
  try {
    const perPlan = await query(
      `SELECT plan,
              COUNT(*) FILTER (WHERE expires_at > NOW())::int AS active_count,
              COUNT(*)::int AS total_count,
              COALESCE(SUM(amount_rwf) FILTER (WHERE expires_at > NOW()), 0)::int AS revenue_active_rwf,
              COALESCE(SUM(amount_rwf), 0)::int AS revenue_total_rwf
       FROM subscriptions
       GROUP BY plan`
    );

    const recent = await query(
      `SELECT s.id, s.plan, s.amount_rwf, s.starts_at, s.expires_at,
              b.name AS business_name, u.name AS user_name
       FROM subscriptions s
       JOIN businesses b ON b.id = s.business_id
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC
       LIMIT 10`
    );

    res.json({ plans: perPlan.rows, recent: recent.rows });
  } catch (err) {
    next(err);
  }
}

export async function getMySubscriptions(req, res, next) {
  try {
    const result = await query(
      `SELECT s.id, s.business_id, s.plan, s.amount_rwf, s.starts_at, s.expires_at,
              s.payment_method, s.payment_reference,
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
