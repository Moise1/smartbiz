import pool from '../config/database.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// 20 business-owner users with randomly paired real Rwandan names. Emails are
// derived from the name (first.last@gmail.com) — the generated logins are
// printed at the end of the run. 5 of the owners, picked at random, get linked
// to random existing businesses through the user_businesses join table.
// Re-runnable: an email that already exists is kept (its role is refreshed).

const OWNER_COUNT = 20;
const LINKED_OWNERS = 5;
const PASSWORD = 'OwnerPass123!';

const FIRST_NAMES = [
  'Aline', 'Eric', 'Diane', 'Patrick', 'Claudine', 'Jean', 'Solange', 'Emmanuel',
  'Josiane', 'Olivier', 'Chantal', 'Fabrice', 'Immaculée', 'Thierry', 'Vestine',
  'Innocent', 'Clarisse', 'Didier', 'Yvonne', 'Pacifique', 'Alphonse', 'Béatrice',
  'Camille', 'Dative', 'Egide', 'Faustin', 'Gaudence', 'Honorine', 'Ignace',
  'Jacqueline', 'Kevin', 'Liliane', 'Médard', 'Nadine', 'Odette', 'Protais',
  'Queen', 'Régis', 'Sandrine', 'Théoneste',
];
const LAST_NAMES = [
  'Uwase', 'Niyonzima', 'Mukamana', 'Habimana', 'Ingabire', 'Nsengimana',
  'Umutoni', 'Bizimana', 'Mukandayisenga', 'Ndayisaba', 'Uwimana', 'Mugisha',
  'Nyirahabimana', 'Rukundo', 'Mukeshimana', 'Twagirimana', 'Uwera',
  'Nshimiyimana', 'Mukansanga', 'Iradukunda', 'Byiringiro', 'Dusabimana',
  'Gasana', 'Hakizimana', 'Kagame', 'Karangwa', 'Maniraguha', 'Munyaneza',
  'Ntagozera', 'Nkurunziza', 'Nyirarukundo', 'Rugamba', 'Rwigema', 'Sibomana',
  'Tuyishime', 'Umuhoza', 'Uwamahoro', 'Uwineza', 'Manzi', 'Keza',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// "Immaculée Nyirahabimana" → "immaculee.nyirahabimana@gmail.com"
function emailFor(first, last) {
  const slug = (s) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  return `${slug(first)}.${slug(last)}@gmail.com`;
}

// Random unique (first, last) pairs: shuffle both pools and zip, so no email
// collides within a single run.
function generateOwners(count) {
  const firsts = shuffle(FIRST_NAMES).slice(0, count);
  const lasts = shuffle(LAST_NAMES).slice(0, count);
  return firsts.map((first, i) => {
    const name = `${first} ${lasts[i]}`;
    return { name, email: emailFor(first, lasts[i]) };
  });
}

async function seedOwners() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // 1. Create the owner users (an existing email is kept, role refreshed)
    const owners = generateOwners(OWNER_COUNT);
    const ownerIds = [];
    for (const owner of owners) {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'business_owner')
         ON CONFLICT (email) DO UPDATE SET role = 'business_owner'
         RETURNING id`,
        [owner.name, owner.email, passwordHash]
      );
      ownerIds.push(rows[0].id);
    }

    // 2. Pick 5 owners at random and link each to 3–6 random businesses
    const { rows: businesses } = await client.query(
      'SELECT id FROM businesses WHERE is_active = true'
    );
    const businessIds = businesses.map((b) => b.id);

    const chosen = shuffle(ownerIds).slice(0, LINKED_OWNERS);
    const linkedIds = new Set(chosen);
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

    console.log(`Seeded ${OWNER_COUNT} business owners (password: ${PASSWORD}):`);
    owners.forEach((owner, i) => {
      const linked = linkedIds.has(ownerIds[i]) ? '  ← linked to businesses' : '';
      console.log(`  ${owner.email.padEnd(38)} ${owner.name}${linked}`);
    });
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
