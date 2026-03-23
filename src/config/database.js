import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';

dotenv.config();

// Force IPv4 resolution
const lookupAsync = promisify(dns.lookup);
const originalLookup = dns.getDefaultResultOrder ? dns.getDefaultResultOrder() : 'ipv4first';

// Override DNS to prefer IPv4
dns.setDefaultResultOrder?.('ipv4first');

// Build connection string
const password = encodeURIComponent(process.env.DB_PASSWORD);
const connectionString = `postgresql://${process.env.DB_USER}:${password}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('connect', () => {
  console.log('✅ Database connected successfully (Supabase)');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

export default pool;
