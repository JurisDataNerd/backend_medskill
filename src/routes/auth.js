import express from 'express';
import {
  login,
  getProfile,
  updateProfile,
  changePassword,
  createAdmin
} from '../controllers/authController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes - Login via Supabase Auth
router.post('/login', login);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

// Admin only routes
router.post('/create-admin', createAdmin);

export default router;
