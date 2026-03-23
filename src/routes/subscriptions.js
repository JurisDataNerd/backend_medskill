import express from 'express';
import {
  getPackages,
  getUserSubscription,
  getSubscriptionHistory,
  getAllSubscriptions,
  cancelSubscription
} from '../controllers/subscriptionController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/packages', getPackages);

// Protected routes (user)
router.get('/my-subscription', verifyToken, getUserSubscription);
router.get('/history', verifyToken, getSubscriptionHistory);

// Admin only routes
router.get('/', verifyToken, isAdmin, getAllSubscriptions);
router.post('/:id/cancel', verifyToken, isAdmin, cancelSubscription);

export default router;
