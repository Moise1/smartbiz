import { query, getClient } from '../config/database.js';

// Postgres rejects '' for NUMERIC columns — optional fields left blank in the
// form must be stored as NULL.
const orNull = (v) => (v === '' || v === undefined ? null : v);

export async function getBusinesses(req, res, next) {
  try {
    const {
      search = '',
      category_id,
      city,
      page = 1,
      limit = 12,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ['b.is_active = true'];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(b.name ILIKE $${params.length} OR b.description ILIKE $${params.length})`);
    }
    if (category_id) {
      params.push(category_id);
      conditions.push(`b.category_id = $${params.length}`);
    }
    if (city) {
      params.push(`%${city}%`);
      conditions.push(`b.city ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit), offset);
    // Ad-based ranking: paid plans outrank free listings
    // (premium > standard > basic); expired plans rank as free.
    const result = await query(
      `SELECT b.id, b.name, b.description, b.phone, b.email, b.address, b.city,
              b.latitude, b.longitude, b.is_verified, b.created_at,
              b.plan, (b.plan <> 'free' AND b.plan_expires_at > NOW()) AS plan_active,
              c.name AS category_name, c.icon AS category_icon,
              COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
              COUNT(DISTINCT r.id) AS review_count,
              CASE WHEN b.plan_expires_at > NOW() THEN
                CASE b.plan WHEN 'premium' THEN 3 WHEN 'standard' THEN 2 WHEN 'basic' THEN 1 ELSE 0 END
              ELSE 0 END AS plan_rank
       FROM businesses b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN reviews r ON r.business_id = b.id
       ${where}
       GROUP BY b.id, c.name, c.icon
       ORDER BY plan_rank DESC, b.is_verified DESC, avg_rating DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM businesses b ${where}`,
      params.slice(0, -2)
    );

    res.json({
      businesses: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
}

export async function getBusinessById(req, res, next) {
  try {
    const result = await query(
      `SELECT b.*, c.name AS category_name, c.icon AS category_icon,
              u.name AS owner_name,
              COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
              COUNT(DISTINCT r.id) AS review_count
       FROM businesses b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN users u ON u.id = b.owner_id
       LEFT JOIN reviews r ON r.business_id = b.id
       WHERE b.id = $1 AND b.is_active = true
       GROUP BY b.id, c.name, c.icon, u.name`,
      [req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ message: 'Business not found' });

    const images = await query(
      'SELECT id, url, is_primary FROM business_images WHERE business_id = $1 ORDER BY is_primary DESC',
      [req.params.id]
    );

    res.json({ ...result.rows[0], images: images.rows });
  } catch (err) {
    next(err);
  }
}

export async function createBusiness(req, res, next) {
  const client = await getClient();
  try {
    const {
      name, description, category_id, phone, email,
      website, address, city, latitude, longitude,
    } = req.body;

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO businesses
         (owner_id, name, description, category_id, phone, email, website, address, city, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [req.user.id, name, description, category_id, orNull(phone), orNull(email),
       orNull(website), orNull(address), city, orNull(latitude), orNull(longitude)]
    );

    await client.query(
      'INSERT INTO user_businesses (user_id, business_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, result.rows[0].id]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
}

export async function updateBusiness(req, res, next) {
  try {
    const { id } = req.params;
    const ownership = await query(
      'SELECT 1 FROM user_businesses WHERE business_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!ownership.rows[0] && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const {
      name, description, category_id, phone, email,
      website, address, city, latitude, longitude,
    } = req.body;

    const result = await query(
      `UPDATE businesses
       SET name=$1, description=$2, category_id=$3, phone=$4, email=$5,
           website=$6, address=$7, city=$8, latitude=$9, longitude=$10, updated_at=NOW()
       WHERE id=$11
       RETURNING *`,
      [name, description, category_id, orNull(phone), orNull(email), orNull(website),
       orNull(address), city, orNull(latitude), orNull(longitude), id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteBusiness(req, res, next) {
  try {
    const { id } = req.params;
    await query(
      `UPDATE businesses SET is_active = false
       WHERE id = $1 AND (
         EXISTS (SELECT 1 FROM user_businesses ub WHERE ub.business_id = $1 AND ub.user_id = $2)
         OR $3 = 'admin'
       )`,
      [id, req.user.id, req.user.role]
    );
    res.json({ message: 'Business removed' });
  } catch (err) {
    next(err);
  }
}

export async function getMyBusinesses(req, res, next) {
  try {
    const result = await query(
      `SELECT b.*, c.name AS category_name,
              COALESCE(AVG(r.rating), 0)::numeric(3,1) AS avg_rating,
              COUNT(DISTINCT r.id) AS review_count
       FROM businesses b
       JOIN user_businesses ub ON ub.business_id = b.id AND ub.user_id = $1
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN reviews r ON r.business_id = b.id
       WHERE b.is_active = true
       GROUP BY b.id, c.name
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}
