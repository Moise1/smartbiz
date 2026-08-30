import pool from '../config/database.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// 20 business-owner users (owner1..owner20@smartbiz.rw), then 5 of them
// picked at random get linked to random existing businesses through the
// user_businesses join table. Re-runnable: existing users/links are kept.

const OWNER_COUNT = 20;
const LINKED_OWNERS = 5;
const PASSWORD = 'OwnerPass123!';

const FIRST_NAMES = [
  'Aline', 'Eric', 'Diane', 'Patrick', 'Claudine', 'Jean', 'Solange', 'Emmanuel',
  'Josiane', 'Olivier', 'Chantal', 'Fabrice', 'Immaculée', 'Thierry', 'Vestine',
  'Innocent', 'Clarisse', 'Didier', 'Yvonne', 'Pacifique',
];
const LAST_NAMES = [
  'Uwase', 'Niyonzima', 'Mukamana', 'Habimana', 'Ingabire', 'Nsengimana',
  'Umutoni', 'Bizimana', 'Mukandayisenga', 'Ndayisaba', 'Uwimana', 'Mugisha',
  'Nyirahabimana', 'Rukundo', 'Mukeshimana', 'Twagirimana', 'Uwera',
  'Nshimiyimana', 'Mukansanga', 'Iradukunda',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function seedOwners() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // 1. Create the 20 owner users (skip any that already exist)
    const ownerIds = [];
    for (let i = 1; i <= OWNER_COUNT; i++) {
      const email = `owner${i}@smartbiz.rw`;
      const name = `${FIRST_NAMES[i - 1]} ${LAST_NAMES[i - 1]}`;
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'business_owner')
         ON CONFLICT (email) DO UPDATE SET role = 'business_owner'
         RETURNING id`,
        [name, email, passwordHash]
      );
      ownerIds.push(rows[0].id);
    }

    // 2. Pick 5 owners at random and link each to 3–6 random businesses
    const { rows: businesses } = await client.query(
      'SELECT id FROM businesses WHERE is_active = true'
    );
    const businessIds = businesses.map((b) => b.id);

    const chosen = shuffle(ownerIds).slice(0, LINKED_OWNERS);
    let links = 0;
    for (const userId of chosen) {
      const count = 3 + Math.floor(Math.random() * 4); // 3–6 businesses
      for (const businessId of shuffle(businessIds).slice(0, count)) {
        const res = await client.query(
          `INSERT INTO user_businesses (user_id, business_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, businessId]
        );
        links += res.rowCount;
      }
    }

    await client.query('COMMIT');
    console.log(`Seeded ${OWNER_COUNT} business owners (owner1–owner${OWNER_COUNT}@smartbiz.rw / ${PASSWORD})`);
    console.log(`Linked ${LINKED_OWNERS} random owners to businesses (${links} new links).`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Owner seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedOwners();
