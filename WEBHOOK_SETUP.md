# 🪝 Webhook Setup Guide

Panduan setup dan testing webhook Midtrans untuk MedSkill Backend.

---

## 📋 Webhook Endpoints

Backend menyediakan 2 endpoint webhook (keduanya sama):

1. `POST /api/payments/webhook`
2. `POST /api/payments/notification`

Kedua endpoint ini akan:
- ✅ Menerima notifikasi dari Midtrans
- ✅ Validasi signature dan IP
- ✅ Update payment status
- ✅ Activate subscription / Add tokens

---

## 🔒 Security Features

Webhook dilindungi dengan:

### 1. IP Whitelist
- Hanya menerima request dari IP Midtrans
- IP list ada di `src/middleware/webhook.js`
- Hanya aktif di production (`MIDTRANS_IS_PRODUCTION=true`)

### 2. Signature Validation
- Validasi header `X-Midtrans-Signature`
- SHA512 hash dari: `order_id + status_code + gross_amount + server_key`

### 3. Duplicate Prevention
- Check jika transaction sudah diproses
- Mencegah double activation

### 4. Content-Type Check
- Hanya terima `application/json`

---

## 🧪 Testing Webhook Locally

### Option 1: Using ngrok

1. **Install ngrok** (jika belum):
   ```bash
   npm install -g ngrok
   ```

2. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```

3. **Expose dengan ngrok**:
   ```bash
   ngrok http 5000
   ```

4. **Copy ngrok URL** (contoh: `https://abc123.ngrok.io`)

5. **Test webhook dengan curl**:
   ```bash
   curl -X POST https://abc123.ngrok.io/api/payments/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "order_id": "TEST-123",
       "transaction_status": "settlement",
       "fraud_status": "accept",
       "gross_amount": "99000.00",
       "transaction_id": "test123",
       "payment_type": "credit_card"
     }'
   ```

### Option 2: Using Midtrans Sandbox

1. **Setup payment** di frontend/backend

2. **Set webhook URL** di Midtrans Dashboard:
   - Login ke Midtrans Sandbox
   - Settings > Configuration > Payment Notification
   - URL: `https://your-ngrok-url.ngrok.io/api/payments/webhook`

3. **Test payment** dengan credit card sandbox:
   - Card number: `4811 1111 1111 1114`
   - Exp: `12/25`
   - CVV: `123`

4. **Check webhook logs** di backend terminal

---

## 🧪 Test Scenarios

### Scenario 1: Subscription Payment SUCCESS

```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "MEDSKILL-1-1711180800000",
    "transaction_status": "settlement",
    "fraud_status": "accept",
    "gross_amount": "99000.00",
    "transaction_id": "test-sub-001",
    "payment_type": "credit_card"
  }'
```

Expected:
- Payment status → SUCCESS
- Subscription status → ACTIVE

### Scenario 2: Token Top-up SUCCESS

```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "MEDSKILL-1-1711180800001",
    "transaction_status": "settlement",
    "fraud_status": "accept",
    "gross_amount": "10000.00",
    "transaction_id": "test-token-001",
    "payment_type": "gopay"
  }'
```

Expected:
- Payment status → SUCCESS
- User token balance +10

### Scenario 3: Payment FAILED

```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "MEDSKILL-1-1711180800002",
    "transaction_status": "deny",
    "fraud_status": "deny",
    "gross_amount": "99000.00",
    "transaction_id": "test-fail-001",
    "payment_type": "credit_card"
  }'
```

Expected:
- Payment status → FAILED

### Scenario 4: Payment EXPIRED

```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "MEDSKILL-1-1711180800003",
    "transaction_status": "expire",
    "gross_amount": "99000.00",
    "transaction_id": "test-expire-001",
    "payment_type": "bank_transfer"
  }'
```

Expected:
- Payment status → FAILED

---

## 🛠️ Webhook Configuration

### Midtrans Dashboard

1. Login ke Midtrans Dashboard
2. Settings > Configuration > Payment Notification
3. Set URL:
   ```
   Development: https://your-ngrok-url.ngrok.io/api/payments/webhook
   Production: https://medskillindonesia.com/api/payments/webhook
   ```
4. Click **Save**

### Webhook URL Format

```
https://[YOUR_DOMAIN]/api/payments/webhook
```

Examples:
- Local: `https://abc123.ngrok.io/api/payments/webhook`
- Staging: `https://staging.medskillindonesia.com/api/payments/webhook`
- Production: `https://medskillindonesia.com/api/payments/webhook`

---

## 📊 Monitoring Webhooks

### Check Logs

Backend akan print logs seperti:

```
📥 Webhook received: {
  order_id: 'MEDSKILL-1-1711180800000',
  transaction_status: 'settlement',
  fraud_status: 'accept',
  gross_amount: '99000.00',
  transaction_id: 'abc123'
}
✅ Payment 1 status updated to SUCCESS
✅ Subscription 1 activated
```

### Database Check

```sql
-- Check payment status
SELECT * FROM payments WHERE midtrans_order_id = 'MEDSKILL-1-1711180800000';

-- Check subscription status
SELECT * FROM subscriptions WHERE user_id = 1 ORDER BY created_at DESC;

-- Check token transactions
SELECT * FROM token_transactions WHERE user_id = 1 ORDER BY created_at DESC;
```

---

## ⚠️ Common Issues

### Issue 1: Webhook not received

**Solution:**
- Check ngrok is running
- Verify webhook URL in Midtrans Dashboard
- Check firewall/proxy settings

### Issue 2: Invalid signature

**Solution:**
- Verify MIDTRANS_SERVER_KEY in .env
- Check signature generation logic
- Test with Midtrans sandbox first

### Issue 3: Duplicate webhook processing

**Solution:**
- Middleware already handles this
- Check logs for "Duplicate webhook" message
- Idempotent processing ensures safety

### Issue 4: Subscription not activated

**Solution:**
- Check payment status in database
- Verify subscription_id is linked
- Check backend logs for errors

---

## 🔧 Production Setup

### 1. Update Environment

```env
MIDTRANS_IS_PRODUCTION=true
MIDTRANS_SERVER_KEY=your-production-server-key
```

### 2. Configure Domain

Ensure backend accessible from internet:
```
https://medskillindonesia.com/api/payments/webhook
```

### 3. SSL/HTTPS

Required for production webhook. Setup dengan:
- Nginx reverse proxy
- Let's Encrypt SSL certificate

### 4. Monitoring

Setup monitoring untuk webhook:
- Log all webhook requests
- Alert on failed processing
- Dashboard untuk payment status

---

## 📝 Webhook Payload Reference

### Payment Status Values

| Status | Description |
|--------|-------------|
| `pending` | Payment initiated, waiting for payment |
| `settlement` | Payment successful (credit card, e-wallet) |
| `capture` | Payment captured (credit card) |
| `deny` | Payment denied |
| `expire` | Payment expired |
| `cancel` | Payment cancelled |
| `failure` | Payment failed |
| `refund` | Payment refunded |
| `chargeback` | Chargeback received |

### Fraud Status (Credit Card)

| Status | Description |
|--------|-------------|
| `accept` | Transaction accepted |
| `deny` | Transaction denied |
| `challenge` | Requires manual review |

---

## 🎯 Best Practices

1. ✅ **Always use HTTPS** in production
2. ✅ **Validate signature** on every webhook
3. ✅ **Log all webhook requests** for debugging
4. ✅ **Implement idempotency** (prevent duplicates)
5. ✅ **Monitor webhook failures**
6. ✅ **Test with sandbox** before production
7. ✅ **Keep IP whitelist updated**

---

## 📞 Support

**Midtrans Documentation:**
- Webhook: https://docs.midtrans.com/en/core-api/webhook.html
- API: https://docs.midtrans.com/en/core-api/http-request.html

**Internal:**
- Check `src/middleware/webhook.js`
- Check `src/controllers/paymentController.js`

---

**Happy Webhooking! 🪝**
