# MedSkill Backend API

Backend API untuk platform MedSkill LMS - sistem subscription untuk pembelajaran kedokteran.

## 🚀 Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Token)
- **Payment Gateway**: Midtrans
- **Security**: Helmet, CORS, Rate Limiting

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── staseController.js   # Stase management
│   │   ├── subscriptionController.js  # Subscription system
│   │   ├── paymentController.js # Payment & Midtrans integration
│   │   ├── videoController.js   # Video management
│   │   ├── materialController.js # Material management
│   │   └── commentController.js # Comments & token economy
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   └── accessControl.js     # Content access control
│   ├── routes/
│   │   ├── auth.js
│   │   ├── stases.js
│   │   ├── subscriptions.js
│   │   ├── payments.js
│   │   ├── tokenPackages.js
│   │   ├── videos.js
│   │   ├── materials.js
│   │   └── comments.js
│   ├── database/
│   │   └── migrate.js           # Database migration
│   ├── utils/
│   │   └── auth.js              # Auth utilities
│   └── server.js                # Express app entry point
├── .env                         # Environment variables
├── .env.example                 # Environment template
└── package.json
```

## 🛠️ Setup & Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` ke `.env` dan sesuaikan:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medskill_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Midtrans
MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
MIDTRANS_IS_PRODUCTION=false
```

### 3. Setup Database

Buat database PostgreSQL:

```bash
createdb medskill_db
```

Jalankan migration:

```bash
npm run migrate
```

### 4. Run Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server akan berjalan di `http://localhost:5000`

## 📚 API Endpoints

### Authentication

**Note:** Registration dan Login dilakukan melalui **Supabase Auth API**.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Exchange Supabase token dengan JWT backend | ❌ |
| GET | `/api/auth/profile` | Get profile user | ✅ |
| PUT | `/api/auth/profile` | Update/Complete profile (profiles table) | ✅ |
| PUT | `/api/auth/change-password` | Ganti password (via Supabase Auth) | ✅ |

### Stases

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/stases` | Get semua stases | ❌ |
| GET | `/api/stases/:id` | Get detail stase | ❌ |
| POST | `/api/stases` | Create stase | ✅ Admin |
| PUT | `/api/stases/:id` | Update stase | ✅ Admin |
| DELETE | `/api/stases/:id` | Delete stase | ✅ Admin |

### Subscriptions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/subscriptions/packages` | Get paket subscription | ❌ |
| GET | `/api/subscriptions/my-subscription` | Get subscription aktif | ✅ |
| GET | `/api/subscriptions/history` | Get riwayat subscription | ✅ |
| GET | `/api/subscriptions` | Get semua subscription | ✅ Admin |
| POST | `/api/subscriptions/:id/cancel` | Cancel subscription | ✅ Admin |

### Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payments/create` | Buat transaksi payment | ✅ |
| POST | `/api/payments/subscription` | Buat subscription + payment | ✅ |
| GET | `/api/payments/history` | Get riwayat payment | ✅ |
| POST | `/api/payments/notification` | Midtrans webhook | ❌ |

### Token Packages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/token-packages/packages` | Get paket token | ❌ |

### Videos

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/videos/stase/:staseId` | Get videos by stase | ❌ |
| GET | `/api/videos/:videoId` | Get detail video | ❌ |
| GET | `/api/videos/:videoId/stream` | Stream video | ✅ + Access |
| POST | `/api/videos` | Create video | ✅ Admin |
| PUT | `/api/videos/:videoId` | Update video | ✅ Admin |
| DELETE | `/api/videos/:videoId` | Delete video | ✅ Admin |

### Materials

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/materials/stase/:staseId` | Get materials by stase | ❌ |
| GET | `/api/materials/:materialId` | Get detail material | ❌ |
| GET | `/api/materials/:materialId/download` | Download material | ✅ + Access |
| POST | `/api/materials` | Create material | ✅ Admin |
| PUT | `/api/materials/:materialId` | Update material | ✅ Admin |
| DELETE | `/api/materials/:materialId` | Delete material | ✅ Admin |

### Comments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/comments/video/:videoId` | Get comments + replies | ❌ |
| POST | `/api/comments/video/:videoId` | Create comment (1 token) | ✅ |
| DELETE | `/api/comments/:commentId` | Delete comment | ✅ |
| POST | `/api/comments/:commentId/reply` | Reply comment | ✅ Admin |
| DELETE | `/api/comments/replies/:replyId` | Delete reply | ✅ Admin |
| GET | `/api/comments/history` | Token transaction history | ✅ |

## 🔐 Authentication

Setiap request yang memerlukan autentikasi harus menyertakan header:

```
Authorization: Bearer <JWT_TOKEN>
```

## 💰 Subscription Packages

### Paket yang Tersedia

1. **Full Access** - Akses semua stase, video, dan materi
2. **Per Stase** - Pilih 1 stase, akses video + materi
3. **Video Only** - Pilih 1 stase, akses video saja
4. **Materi Only** - Pilih 1 stase, akses materi saja

### Durasi

- 1 bulan
- 3 bulan
- 6 bulan
- 12 bulan

## 💳 Payment Flow

1. User memilih paket subscription
2. Backend create transaction di Midtrans
3. User redirect ke Midtrans payment page
4. User melakukan pembayaran
5. Midtrans send webhook ke backend
6. Backend activate subscription
7. User mendapat akses ke konten

## 🪙 Token Economy

- 1 komentar = 1 token
- Token dapat di-top up melalui payment gateway
- Paket token: 10, 25, 50, 100 tokens

## 🛡️ Security Features

- **Password Hashing**: bcrypt (12 rounds)
- **JWT Authentication**: Signed tokens dengan expiry
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Restricted to frontend domain
- **Helmet**: Security headers
- **Input Validation**: Request validation
- **Access Control**: Subscription-based content access

## 📝 Database Migration

Migration file terletak di `src/database/migrate.js`

Untuk menjalankan migration:

```bash
npm run migrate
```

Migration akan:
- Membuat semua tabel sesuai ERD
- Membuat indexes untuk performa
- Seed data awal (13 stases, token packages)

## 🔄 Cron Jobs

### Expire Old Subscriptions

Jalankan setiap hari untuk expire subscription yang sudah lewat:

```javascript
import { expireOldSubscriptions } from './controllers/subscriptionController.js';

// Run daily
setInterval(expireOldSubscriptions, 24 * 60 * 60 * 1000);
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Change `JWT_SECRET` to strong random string
- [ ] Set `MIDTRANS_IS_PRODUCTION=true`
- [ ] Use production database credentials
- [ ] Enable HTTPS/SSL
- [ ] Setup domain
- [ ] Configure Nginx reverse proxy
- [ ] Setup PM2 for process management
- [ ] Enable logging & monitoring
- [ ] Setup database backups

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=5000
DB_HOST=your-db-host
DB_NAME=medskill_production
DB_USER=your-db-user
DB_PASSWORD=strong-password
JWT_SECRET=very-long-random-string-min-32-chars
MIDTRANS_SERVER_KEY=production-server-key
MIDTRANS_IS_PRODUCTION=true
FRONTEND_URL=https://medskillindonesia.com
```

## 📞 API Testing

Gunakan Postman atau curl untuk testing:

```bash
# Login (setelah signup di Supabase)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'

# Get Stases
curl http://localhost:5000/api/stases
```

## 📄 License

ISC © 2026 Fauzan Arisanto - MedSkill Indonesia
