import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();
dns.setDefaultResultOrder?.('ipv4first');

console.log('Testing connection to Supabase Pooler...');
console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`Database: ${process.env.DB_NAME}`);

const password = encodeURIComponent(process.env.DB_PASSWORD);
const connectionString = `postgresql://${process.env.DB_USER}:${password}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()')
  .then(res => {
    console.log('\n✅ Database connected successfully!');
    console.log('Server time:', res.rows[0].now);
    console.log('\n📝 Update .env with these values (already configured):');
    console.log(`   DB_HOST=${process.env.DB_HOST}`);
    console.log(`   DB_PORT=${process.env.DB_PORT}`);
    console.log(`   DB_USER=${process.env.DB_USER}`);
    pool.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Connection failed:', err.message);
    console.error('\n⚠️  Pooler may not be enabled in your Supabase project.');
    console.error('\n📌 SOLUTION:');
    console.error('   1. Go to: https://app.supabase.com/project/_/database/pooler');
    console.error('   2. Click "Enable Pooler"');
    console.error('   3. Copy the Transaction/Session mode connection string');
    console.error('   4. Update .env with the pooler credentials');
    pool.end();
    process.exit(1);
  });
