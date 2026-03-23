import express from 'express';
import {
  createPayment,
  paymentNotification,
  createSubscriptionPayment,
  getPaymentHistory
} from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/auth.js';
import { verifyWebhookRequest, preventDuplicateWebhook } from '../middleware/webhook.js';

const router = express.Router();

// Protected routes
router.post('/create', verifyToken, createPayment);
router.post('/subscription', verifyToken, createSubscriptionPayment);
router.get('/history', verifyToken, getPaymentHistory);

// Webhook endpoints (public - called by Midtrans)
// Apply webhook verification middleware for security
router.post('/webhook', verifyWebhookRequest, preventDuplicateWebhook, paymentNotification);
router.post('/notification', verifyWebhookRequest, preventDuplicateWebhook, paymentNotification);

// Testing endpoint (GET for manual testing)
router.get('/webhook', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is ready. Use POST for actual webhook calls.'
  });
});

export default router;
