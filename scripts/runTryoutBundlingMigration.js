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

    const sqlFile = path.join(process.cwd(), 'supabase/migrations/20260910000000_tryout_bundling_and_components.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log("Executing Tryout Bundling SQL migration...");
    await client.query(sql);
    console.log("Tryout Bundling migration applied successfully!");

    console.log("Reloading PostgREST schema cache...");
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("PostgREST schema cache reloaded successfully!");

  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

run();
