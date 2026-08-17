import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  try {
    for (const file of files) {
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`✓ ${file}`);
    }
    console.log('All migrations completed successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
