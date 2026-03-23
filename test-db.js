import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:dinda2502%40%40%40@db.djigelqahkzfmwvpncvr.supabase.co:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

try {
  const client = await pool.connect();
  const result = await client.query('SELECT NOW()');
  console.log('✅ Connection successful!', result.rows[0]);
  client.release();
  await pool.end();
  process.exit(0);
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
}
