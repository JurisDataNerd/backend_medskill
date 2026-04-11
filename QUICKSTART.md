# 🚀 Quick Start Guide - MedSkill Backend

Panduan cepat untuk menjalankan backend MedSkill.

---

## Prerequisites

Pastikan sudah terinstall:

- ✅ Node.js >= 18.x
- ✅ PostgreSQL >= 14.x
- ✅ npm atau yarn

---

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

---

## Step 2: Setup Database

### Buat Database PostgreSQL

```bash
# Login ke PostgreSQL
psql -U postgres

# Buat database
CREATE DATABASE medskill_db;

# Exit
\q
```

### Atau gunakan createdb

```bash
createdb -U postgres medskill_db
```

---

## Step 3: Configure Environment

Edit file `.env` di folder `backend`:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medskill_db
DB_USER=postgres
DB_PASSWORD=postgres  # Sesuaikan dengan password PostgreSQL Anda

# JWT
JWT_SECRET=medskill-secret-key-change-in-production-2026
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Midtrans (untuk development, bisa pakai sandbox)
MIDTRANS_SERVER_KEY=SB-Mid-server-SANDBOX-KEY-HERE
MIDTRANS_CLIENT_KEY=SB-Mid-client-CLIENT-KEY-HERE
MIDTRANS_IS_PRODUCTION=false
```

---

## Step 4: Run Database Migration

```bash
npm run migrate
```

Output yang diharapkan:
```
✅ Database connected successfully
✅ All tables created successfully
✅ Initial data seeded successfully
🎉 Migration completed successfully
```

Migration akan:
- Membuat 10 tabel sesuai ERD
- Membuat indexes untuk performa
- Seed 13 stases (Bedah, Obgyn, Mata, dll)
- Seed 4 token packages

---

## Step 5: Create Admin User

```bash
npm run create-admin
```

Output yang diharapkan:
```
✅ Admin user created successfully!

📝 Login credentials:
   Email: admin@medskillindonesia.com
   Password: Admin123!

⚠️  IMPORTANT: Change password after first login!
```

---

## Step 6: Start Server

### Development Mode (dengan auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Output yang diharapkan:
```
╔═══════════════════════════════════════════════╗
║     🏥 MedSkill Backend API Server           ║
║     🚀 Server running on port 5000           ║
║     🌍 Environment: development              ║
║     📦 API: http://localhost:5000/api        ║
╚═══════════════════════════════════════════════╝
```

---

## Step 7: Test API

### Health Check

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "MedSkill API is running",
  "timestamp": "2026-03-23T10:00:00.000Z"
}
```

### Get Stases

```bash
curl http://localhost:5000/api/stases
```

### Authentication Flow (Supabase Auth)

**Step 1: Sign Up via Supabase**
```javascript
// Menggunakan Supabase JS Client
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
})
```

**Step 2: Login & Exchange Token**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Step 3: Complete Profile**
```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "+628123456789",
    "institution": "University of Indonesia"
  }'
```

---

## Step 8: Connect Frontend

Edit file `.env` di folder `frontend`:

```env
VITE_API_URL=http://localhost:5000/api
```

Atau update konfigurasi API di frontend untuk mengarah ke backend.

---

## Troubleshooting

### ❌ Error: Database connection failed

**Solusi:**
1. Pastikan PostgreSQL running
2. Cek credentials di `.env`
3. Test koneksi:
   ```bash
   psql -U postgres -d medskill_db
   ```

### ❌ Error: Port 5000 already in use

**Solusi:**
1. Ganti PORT di `.env`
   ```env
   PORT=5001
   ```
2. Atau stop proses yang menggunakan port 5000:
   ```bash
   lsof -i :5000
   kill -9 <PID>
   ```

### ❌ Error: JWT_SECRET not defined

**Solusi:**
1. Pastikan file `.env` ada dan berisi JWT_SECRET
2. Restart server setelah edit `.env`

### ❌ Migration failed

**Solusi:**
1. Drop dan recreate database:
   ```bash
   dropdb -U postgres medskill_db
   createdb -U postgres medskill_db
   npm run migrate
   ```

---

## Next Steps

Setelah backend berjalan, Anda bisa:

1. **Test semua API endpoints** - Lihat `API_DOCS.md`
2. **Connect frontend** - Update API URL di frontend
3. **Setup Midtrans** - Dapatkan sandbox keys dari midtrans.com
4. **Upload konten** - Gunakan admin panel untuk upload videos & materials
5. **Test subscription flow** - Register user, buat payment, test akses

---

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database config
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth & access control
│   ├── routes/          # API routes
│   ├── database/        # Migration scripts
│   ├── utils/           # Helper functions
│   ├── scripts/         # Admin scripts
│   └── server.js        # Main entry point
├── .env                 # Environment variables
├── .env.example         # Template
├── package.json
├── README.md
└── API_DOCS.md
```

---

## Available Scripts

```bash
npm start           # Run production server
npm dev            # Run development server (auto-reload)
npm run migrate    # Run database migration
npm run create-admin  # Create first admin user
```

---

## Default Credentials

### Admin User
- **Email:** `admin@medskillindonesia.com`
- **Password:** `Admin123!`

⚠️ **PENTING:** Ganti password setelah login pertama kali!

---

## API Endpoints Summary

| Resource | Endpoints | Auth Required |
|----------|-----------|---------------|
| Auth | `/api/auth/*` | Some |
| Stases | `/api/stases/*` | No (Write: Admin) |
| Subscriptions | `/api/subscriptions/*` | Some |
| Payments | `/api/payments/*` | Yes (except webhook) |
| Videos | `/api/videos/*` | Some (Stream: Yes + Access) |
| Materials | `/api/materials/*` | Some (Download: Yes + Access) |
| Comments | `/api/comments/*` | Some |

Lihat `API_DOCS.md` untuk dokumentasi lengkap.

---

## Support

Jika mengalami masalah:

1. Cek log di terminal
2. Pastikan semua dependencies terinstall
3. Verifikasi database connection
4. Lihat dokumentasi: `README.md` dan `API_DOCS.md`

---

**Happy Coding! 🎉**
