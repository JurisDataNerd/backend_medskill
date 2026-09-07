import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const { Client } = pg;

const client = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '6543'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Connecting to PostgreSQL...");
    await client.connect();
    console.log("Connected to PostgreSQL DB successfully.");

    const sqlFile = path.join(process.cwd(), 'supabase/migrations/20260819000000_remove_simulation_segments.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log("Executing remove simulation segments migration...");
    await client.query(sql);
    console.log("✅ Migration applied successfully!");

    // Force PostgREST schema cache reload
    console.log("Reloading PostgREST schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("✅ PostgREST schema cache reloaded successfully!");

  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await client.end();
  }
}

run();
