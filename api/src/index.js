import app from './app.js';
import pool from './config/database.js';

const PORT = process.env.PORT || 5000;

async function start() {
  await pool.query('SELECT 1');
  console.log('PostgreSQL connected');

  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
