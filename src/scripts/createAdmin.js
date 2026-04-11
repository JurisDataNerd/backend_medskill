import pool from '../config/database.js';

// Script untuk set admin role di profiles table
// User harus signup dulu via Supabase Auth, lalu jalankan script ini untuk set role admin
const createFirstAdmin = async () => {
  const userId = process.env.ADMIN_USER_ID; // UUID dari Supabase Auth

  if (!userId) {
    console.error('❌ ADMIN_USER_ID environment variable is required');
    console.error('Usage: ADMIN_USER_ID=<uuid-from-supabase-auth> npm run create-admin');
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existing = await pool.query(
      'SELECT user_id, role FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0 && existing.rows[0].role === 'admin') {
      console.log('⚠️  Admin role already exists for this user!');
      process.exit(0);
    }

    // Set admin role in profiles
    const result = await pool.query(
      `INSERT INTO profiles (user_id, role, token_balance)
       VALUES ($1, 'admin', 0)
       ON CONFLICT (user_id) DO UPDATE SET
         role = 'admin'
       RETURNING user_id, role, created_at`,
      [userId]
    );

    console.log('✅ Admin role assigned successfully!');
    console.log(`\n📝 Admin User ID: ${userId}`);
    console.log('\n⚠️  Make sure this user has signed up via Supabase Auth first!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createFirstAdmin();
