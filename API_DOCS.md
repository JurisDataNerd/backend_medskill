# MedSkill API Documentation

Dokumentasi lengkap API endpoints untuk MedSkill Backend.

Base URL: `http://localhost:5000/api`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Stases](#stases)
3. [Subscriptions](#subscriptions)
4. [Payments](#payments)
5. [Videos](#videos)
6. [Materials](#materials)
7. [Comments](#comments)

---

## Authentication

### Register User

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "token_balance": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "token_balance": 0
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Profile

**Endpoint:** `GET /auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "token_balance": 5,
    "created_at": "2026-03-23T10:00:00.000Z"
  }
}
```

---

## Stases

### Get All Stases

**Endpoint:** `GET /stases`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bedah",
      "description": "Stase Bedah",
      "order_index": 1,
      "is_active": true,
      "created_at": "2026-03-23T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Obgyn",
      "description": "Stase Obstetri & Ginekologi",
      "order_index": 2,
      "is_active": true,
      "created_at": "2026-03-23T10:00:00.000Z"
    }
  ]
}
```

### Get Stase by ID

**Endpoint:** `GET /stases/:id`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Bedah",
    "description": "Stase Bedah",
    "order_index": 1,
    "is_active": true,
    "created_at": "2026-03-23T10:00:00.000Z"
  }
}
```

---

## Subscriptions

### Get Subscription Packages

**Endpoint:** `GET /subscriptions/packages`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "type": "full_access",
      "name": "Full Access",
      "description": "Akses semua stase, video, dan materi",
      "durations": [
        { "months": 1, "price": 99000 },
        { "months": 3, "price": 249000 },
        { "months": 6, "price": 449000 },
        { "months": 12, "price": 799000 }
      ]
    },
    {
      "type": "per_stase",
      "name": "Per Stase (Video + Materi)",
      "description": "Pilih 1 stase, akses video dan materi",
      "durations": [
        { "months": 1, "price": 39000 },
        { "months": 3, "price": 99000 },
        { "months": 6, "price": 179000 },
        { "months": 12, "price": 299000 }
      ]
    }
  ]
}
```

### Get My Subscription

**Endpoint:** `GET /subscriptions/my-subscription`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "package_type": "full_access",
    "stase_id": null,
    "duration": 12,
    "start_date": "2026-03-23",
    "end_date": "2027-03-23",
    "status": "ACTIVE",
    "price": 799000,
    "stase_name": null,
    "created_at": "2026-03-23T10:00:00.000Z"
  }
}
```

---

## Payments

### Create Payment

**Endpoint:** `POST /payments/create`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (Subscription):**
```json
{
  "package_type": "full_access",
  "duration": 12,
  "stase_id": null
}
```

**Request Body (Token Top-up):**
```json
{
  "token_amount": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Payment transaction created",
  "data": {
    "payment_id": 1,
    "order_id": "MEDSKILL-1-1711180800000",
    "amount": 799000,
    "description": "Subscription Full Access - 12 months",
    "redirect_url": "https://app.midtrans.com/snap/v2/...",
    "token": "snap-token-123456"
  }
}
```

### Get Payment History

**Endpoint:** `GET /payments/history`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "subscription_id": 1,
      "amount": 799000,
      "payment_type": "subscription",
      "midtrans_order_id": "MEDSKILL-1-1711180800000",
      "midtrans_transaction_id": "abc123",
      "status": "SUCCESS",
      "payment_method": "credit_card",
      "paid_at": "2026-03-23T10:05:00.000Z",
      "created_at": "2026-03-23T10:00:00.000Z",
      "package_type": "full_access",
      "duration": 12
    }
  ]
}
```

---

### Midtrans Webhook

**Endpoint:** `POST /payments/webhook` or `POST /payments/notification`

**Authentication:** None (secured by IP whitelist + signature validation)

**Request Body (from Midtrans):**
```json
{
  "order_id": "MEDSKILL-1-1711180800000",
  "transaction_status": "settlement",
  "fraud_status": "accept",
  "gross_amount": "799000.00",
  "transaction_id": "abc123",
  "payment_type": "credit_card"
}
```

**Webhook Security:**
1. **IP Whitelist** - Only accepts requests from Midtrans IP addresses
2. **Signature Validation** - Validates `X-Midtrans-Signature` header
3. **Duplicate Prevention** - Prevents processing same transaction twice
4. **Content-Type Check** - Only accepts `application/json`

**Response (200) - Success:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "order_id": "MEDSKILL-1-1711180800000",
  "status": "SUCCESS"
}
```

**Response (403) - Invalid IP:**
```json
{
  "success": false,
  "message": "Access denied - Invalid IP address"
}
```

**Response (403) - Invalid Signature:**
```json
{
  "success": false,
  "message": "Invalid signature"
}
```

**Webhook Flow:**
1. User completes payment on Midtrans
2. Midtrans sends webhook to backend
3. Backend validates IP and signature
4. Backend updates payment status
5. If SUCCESS:
   - For subscription: Activates subscription
   - For token top-up: Adds tokens to user balance
6. Backend sends response to Midtrans

**Testing Webhook Locally:**
```bash
# Use ngrok to expose local server
ngrok http 5000

# Set webhook URL in Midtrans Dashboard
https://your-ngrok-url.ngrok.io/api/payments/webhook
```

**Production Webhook URL:**
```
https://your-domain.com/api/payments/webhook
```

Configure in Midtrans Dashboard:
- Settings > Configuration > Payment Notification
- URL: `https://your-domain.com/api/payments/webhook`
- Method: POST

---

## Videos

### Get Videos by Stase

**Endpoint:** `GET /videos/stase/:staseId`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "stase_id": 1,
      "title": "Pendahuluan Bedah",
      "description": "Video pendahuluan stase bedah",
      "thumbnail_url": "https://storage.medskillindonesia.com/thumbnails/1.jpg",
      "duration": 300,
      "order_index": 1,
      "is_premium": true,
      "created_at": "2026-03-23T10:00:00.000Z"
    }
  ]
}
```

### Get Video by ID

**Endpoint:** `GET /videos/:videoId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "stase_id": 1,
    "stase_name": "Bedah",
    "title": "Pendahuluan Bedah",
    "description": "Video pendahuluan stase bedah",
    "thumbnail_url": "https://storage.medskillindonesia.com/thumbnails/1.jpg",
    "duration": 300,
    "order_index": 1,
    "is_premium": true,
    "created_at": "2026-03-23T10:00:00.000Z"
  }
}
```

**Note:** `video_url` hanya akan ditampilkan jika user memiliki akses subscription.

### Stream Video

**Endpoint:** `GET /videos/:videoId/stream`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "video_url": "https://storage.medskillindonesia.com/videos/1.mp4"
  }
}
```

**Response (403) - No Access:**
```json
{
  "success": false,
  "message": "Access denied. Subscription required to view this video.",
  "reason": "No active subscription"
}
```

---

## Materials

### Get Materials by Stase

**Endpoint:** `GET /materials/stase/:staseId`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "stase_id": 1,
      "title": "Modul Bedah Dasar",
      "description": "Materi dasar-dasar bedah",
      "file_type": "pdf",
      "order_index": 1,
      "is_premium": true,
      "created_at": "2026-03-23T10:00:00.000Z"
    }
  ]
}
```

### Download Material

**Endpoint:** `GET /materials/:materialId/download`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "file_url": "https://storage.medskillindonesia.com/materials/1.pdf"
  }
}
```

---

## Comments

### Get Video Comments

**Endpoint:** `GET /comments/video/:videoId`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "video_id": 1,
      "user_id": 2,
      "content": "Video yang sangat membantu!",
      "token_used": 1,
      "is_deleted": false,
      "created_at": "2026-03-23T10:00:00.000Z",
      "user_name": "John Doe",
      "replies": [
        {
          "id": 1,
          "comment_id": 1,
          "admin_id": 1,
          "content": "Terima kasih atas feedbacknya!",
          "is_deleted": false,
          "created_at": "2026-03-23T11:00:00.000Z",
          "admin_name": "Admin MedSkill"
        }
      ]
    }
  ]
}
```

### Create Comment

**Endpoint:** `POST /comments/video/:videoId`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "Pertanyaan tentang materi ini..."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Comment posted successfully",
  "data": {
    "id": 1,
    "video_id": 1,
    "user_id": 1,
    "content": "Pertanyaan tentang materi ini...",
    "token_used": 1,
    "is_deleted": false,
    "created_at": "2026-03-23T10:00:00.000Z",
    "user_name": "John Doe",
    "balance_after": 4
  }
}
```

**Response (402) - Insufficient Tokens:**
```json
{
  "success": false,
  "message": "Insufficient token balance. Please top up to comment."
}
```

### Get Token History

**Endpoint:** `GET /comments/history`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "payment_id": null,
      "amount": 1,
      "transaction_type": "USAGE",
      "description": "Comment posted",
      "balance_before": 5,
      "balance_after": 4,
      "created_at": "2026-03-23T10:00:00.000Z"
    },
    {
      "id": 2,
      "user_id": 1,
      "payment_id": 1,
      "amount": 10,
      "transaction_type": "PURCHASE",
      "description": "Token Top-up Purchase",
      "balance_before": 0,
      "balance_after": 10,
      "created_at": "2026-03-23T09:00:00.000Z"
    }
  ]
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (access denied)
- `404` - Not Found
- `409` - Conflict (duplicate email, etc.)
- `500` - Internal Server Error

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes per IP
- **Headers:**
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 95
  - `X-RateLimit-Reset`: Unix timestamp

**Response (429) - Rate Limit Exceeded:**
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## CORS Configuration

Allowed origins:
- Development: `http://localhost:5173`
- Production: `https://medskillindonesia.com`

Allowed methods: `GET, POST, PUT, DELETE, PATCH`

Allowed headers: `Content-Type, Authorization`

Credentials: `true`

---

## Testing with cURL

### Register & Login

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get Profile (replace TOKEN with actual JWT token)
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

### Get Stases & Videos

```bash
# Get all stases
curl http://localhost:5000/api/stases

# Get videos for stase 1
curl http://localhost:5000/api/videos/stase/1
```

### Create Subscription Payment

```bash
curl -X POST http://localhost:5000/api/payments/subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "package_type": "full_access",
    "duration": 12
  }'
```

---

## Support

Untuk pertanyaan atau issue terkait API, hubungi:
- Email: support@medskillindonesia.com
- Documentation: https://medskillindonesia.com/api-docs
