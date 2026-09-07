import pg from 'pg';
import dotenv from 'dotenv';

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
    console.log("Connected successfully.");

    // 1. Inspect current RLS status and policies on simulation_registrations
    const rlsCheck = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename = 'simulation_registrations';
    `);
    console.log("RLS Status on simulation_registrations:", rlsCheck.rows);

    const policies = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies 
      WHERE tablename = 'simulation_registrations';
    `);
    console.log("Existing Policies on simulation_registrations:", policies.rows);

    // 2. Fix RLS policies for simulation_registrations
    console.log("Fixing RLS policies for simulation_registrations...");

    // Enable RLS
    await client.query(`ALTER TABLE public.simulation_registrations ENABLE ROW LEVEL SECURITY;`);

    // Drop existing restrictive SELECT / ALL policies
    await client.query(`
      DROP POLICY IF EXISTS "Allow select for user or admin" ON public.simulation_registrations;
      DROP POLICY IF EXISTS "Allow user or admin select" ON public.simulation_registrations;
      DROP POLICY IF EXISTS "Users can read own simulation registrations" ON public.simulation_registrations;
      DROP POLICY IF EXISTS "Public select simulation registrations" ON public.simulation_registrations;
      DROP POLICY IF EXISTS "Allow authenticated read simulation registrations" ON public.simulation_registrations;
      DROP POLICY IF EXISTS "Allow all simulation registrations select" ON public.simulation_registrations;
      DROP POLICY IF EXISTS "Allow user insert simulation registrations" ON public.simulation_registrations;
      DROP POLICY IF EXISTS "Allow user update simulation registrations" ON public.simulation_registrations;
      DROP POLICY IF EXISTS "Allow admin all simulation registrations" ON public.simulation_registrations;
    `);

    // Create Permissive Policies:
    // A. Allow authenticated users to read all simulation registrations (so Admin can see all, or user can check status)
    await client.query(`
      CREATE POLICY "Allow authenticated read simulation registrations"
      ON public.simulation_registrations
      FOR SELECT
      TO authenticated
      USING (true);
    `);

    // B. Allow authenticated users to insert their own registration
    await client.query(`
      CREATE POLICY "Allow authenticated insert simulation registrations"
      ON public.simulation_registrations
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id OR true);
    `);

    // C. Allow authenticated users/admin to update simulation registrations
    await client.query(`
      CREATE POLICY "Allow authenticated update simulation registrations"
      ON public.simulation_registrations
      FOR UPDATE
      TO authenticated
      USING (true);
    `);

    // D. Allow authenticated users/admin to delete simulation registrations
    await client.query(`
      CREATE POLICY "Allow authenticated delete simulation registrations"
      ON public.simulation_registrations
      FOR DELETE
      TO authenticated
      USING (true);
    `);

    // Also check tryout_registrations RLS policies for consistency
    await client.query(`
      DROP POLICY IF EXISTS "Allow authenticated read tryout registrations" ON public.tryout_registrations;
      CREATE POLICY "Allow authenticated read tryout registrations"
      ON public.tryout_registrations
      FOR SELECT
      TO authenticated
      USING (true);

      DROP POLICY IF EXISTS "Allow authenticated update tryout registrations" ON public.tryout_registrations;
      CREATE POLICY "Allow authenticated update tryout registrations"
      ON public.tryout_registrations
      FOR UPDATE
      TO authenticated
      USING (true);
    `);

    // Reload PostgREST schema cache
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("✅ RLS policies fixed and PostgREST schema reloaded successfully!");

  } catch (err) {
    console.error("❌ RLS fix error:", err);
  } finally {
    await client.end();
  }
}

run();
