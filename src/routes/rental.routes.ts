import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getMannequins, getMannequinById, checkAvailability,
  addToCart, getCart, removeFromCart,
  checkout, getOrders, getOrderById, cancelOrder
} from '../controllers/rental.controller.js';
import { initiatePayment, paymentWebhook } from '../controllers/payment.controller.js';

const router = Router();

// Public
router.get('/mannequins', getMannequins);
router.get('/mannequins/:id', getMannequinById);
router.get('/availability', checkAvailability);

// Payment webhook (no auth — verified by Midtrans signature)
router.post('/payment/webhook', paymentWebhook);

// Authenticated
router.use(requireAuth);
router.get('/cart', getCart);
router.post('/cart', addToCart);
router.delete('/cart/:id', removeFromCart);
router.post('/checkout', checkout);
router.post('/payment/initiate', initiatePayment);
router.get('/orders', getOrders);
router.get('/orders/:id', getOrderById);
router.post('/orders/:id/cancel', cancelOrder);

export default router;
