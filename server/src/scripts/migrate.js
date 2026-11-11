const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function runMigration() {
  const client = await pool.connect();
  try {
    const sqlPath = path.resolve(__dirname, '../../migrations/001_init_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running database migration: 001_init_schema.sql...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration completed successfully! All tables created.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
