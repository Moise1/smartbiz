import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

// Data tables wiped by a truncate, children first. Categories are managed by
// the migrations, so they are kept.
export const DATA_TABLES = [
  'business_views',
  'subscriptions',
  'reviews',
  'user_businesses',
  'business_images',
  'businesses',
  'users',
];

export async function truncateTables(client) {
  await client.query(`TRUNCATE TABLE ${DATA_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

// Standalone: `npm run db:truncate` / `node src/db/truncate.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = await pool.connect();
  try {
    await truncateTables(client);
    console.log(`Truncated: ${DATA_TABLES.join(', ')}`);
  } catch (err) {
    console.error('Truncate failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
