import express from 'express';
import {
  getAllStases,
  getStaseById,
  createStase,
  updateStase,
  deleteStase
} from '../controllers/staseController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllStases);
router.get('/:id', getStaseById);

// Admin only routes
router.post('/', verifyToken, isAdmin, createStase);
router.put('/:id', verifyToken, isAdmin, updateStase);
router.delete('/:id', verifyToken, isAdmin, deleteStase);

export default router;
