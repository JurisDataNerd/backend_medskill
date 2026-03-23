import pool from './config/database.js';
import { hashPassword } from './utils/auth.js';

// Script untuk membuat admin user pertama
const createFirstAdmin = async () => {
  const name = 'Admin MedSkill';
  const email = 'admin@medskillindonesia.com';
  const password = 'Admin123!'; // Ganti setelah login pertama kali

  try {
    // Check if admin already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  Admin user already exists!');
      process.exit(0);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, token_balance) 
       VALUES ($1, $2, $3, 'admin', 0) 
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );

    console.log('✅ Admin user created successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Change password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createFirstAdmin();
