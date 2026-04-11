import pool from '../config/database.js';

// Check if tables exist before creating
const checkTableExists = async (client, tableName) => {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
};

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if tables already exist (for existing Supabase database)
    // Note: users table tidak dibuat lagi karena menggunakan auth.users dari Supabase
    const tablesToCreate = [
      {
        name: 'profiles',
        sql: `
          CREATE TABLE IF NOT EXISTS profiles (
            user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
            token_balance INTEGER DEFAULT 0,
            avatar_url VARCHAR(500),
            phone VARCHAR(50),
            institution VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'stases',
        sql: `
          CREATE TABLE IF NOT EXISTS stases (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            order_index INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'videos',
        sql: `
          CREATE TABLE IF NOT EXISTS videos (
            id SERIAL PRIMARY KEY,
            stase_id INTEGER NOT NULL REFERENCES stases(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            video_url VARCHAR(500) NOT NULL,
            thumbnail_url VARCHAR(500),
            duration INTEGER,
            order_index INTEGER DEFAULT 0,
            is_premium BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'materials',
        sql: `
          CREATE TABLE IF NOT EXISTS materials (
            id SERIAL PRIMARY KEY,
            stase_id INTEGER NOT NULL REFERENCES stases(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            file_url VARCHAR(500) NOT NULL,
            file_type VARCHAR(50) DEFAULT 'pdf',
            order_index INTEGER DEFAULT 0,
            is_premium BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'subscriptions',
        sql: `
          CREATE TABLE IF NOT EXISTS subscriptions (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            package_type VARCHAR(50) NOT NULL CHECK (package_type IN ('full_access', 'per_stase', 'video_only', 'materi_only')),
            stase_id INTEGER REFERENCES stases(id) ON DELETE SET NULL,
            duration INTEGER NOT NULL CHECK (duration IN (1, 3, 6, 12)),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
            price INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'payments',
        sql: `
          CREATE TABLE IF NOT EXISTS payments (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
            amount INTEGER NOT NULL,
            payment_type VARCHAR(50),
            midtrans_order_id VARCHAR(100) UNIQUE,
            midtrans_transaction_id VARCHAR(100),
            status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED')),
            payment_method VARCHAR(50),
            paid_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'token_packages',
        sql: `
          CREATE TABLE IF NOT EXISTS token_packages (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            token_amount INTEGER NOT NULL,
            price INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'token_transactions',
        sql: `
          CREATE TABLE IF NOT EXISTS token_transactions (
            id SERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
            amount INTEGER NOT NULL,
            transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('PURCHASE', 'USAGE', 'REFUND')),
            description TEXT,
            balance_before INTEGER,
            balance_after INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'comments',
        sql: `
          CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            token_used INTEGER DEFAULT 1,
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      },
      {
        name: 'comment_replies',
        sql: `
          CREATE TABLE IF NOT EXISTS comment_replies (
            id SERIAL PRIMARY KEY,
            comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
            admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            is_deleted BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      }
    ];

    for (const table of tablesToCreate) {
      const exists = await checkTableExists(client, table.name);
      if (exists) {
        console.log(`✓ Table '${table.name}' already exists, skipping...`);
      } else {
        await client.query(table.sql);
        console.log(`✓ Table '${table.name}' created`);
      }
    }

    // Create indexes (safe to run multiple times)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_midtrans_order_id ON payments(midtrans_order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

      CREATE INDEX IF NOT EXISTS idx_videos_stase_id ON videos(stase_id);
      CREATE INDEX IF NOT EXISTS idx_materials_stase_id ON materials(stase_id);

      CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

      CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Database schema ready');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Seed initial data
const seedData = async () => {
  const client = await pool.connect();
  
  try {
    // Seed token packages
    await client.query(`
      INSERT INTO token_packages (name, token_amount, price, is_active) 
      VALUES 
        ('10 Tokens', 10, 10000, true),
        ('25 Tokens', 25, 24000, true),
        ('50 Tokens', 50, 45000, true),
        ('100 Tokens', 100, 85000, true)
      ON CONFLICT DO NOTHING
    `);

    // Seed stases (13 stases from documentation)
    const stases = [
      'Bedah',
      'Obgyn',
      'Mata',
      'THT',
      'Forensik',
      'Hematologi',
      'Pulmo',
      'Neuro',
      'Psikiatri',
      'Pediatri',
      'Infeksi Tropis',
      'Jantung',
      'Endokrin'
    ];

    for (let i = 0; i < stases.length; i++) {
      await client.query(
        `INSERT INTO stases (name, order_index, is_active) 
         VALUES ($1, $2, true) 
         ON CONFLICT DO NOTHING`,
        [stases[i], i + 1]
      );
    }

    console.log('✅ Initial data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Main migration function
const migrate = async () => {
  try {
    await createTables();
    await seedData();
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (process.argv[1]?.includes('migrate.js')) {
  migrate();
}

export { createTables, seedData, migrate };
