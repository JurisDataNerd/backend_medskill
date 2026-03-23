import express from 'express';
import {
  getAllMentors,
  getMentorById,
  createMentor,
  updateMentor,
  deleteMentor
} from '../controllers/mentorController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getAllMentors);
router.get('/:id', getMentorById);

// Admin only routes
router.post('/', verifyToken, isAdmin, createMentor);
router.put('/:id', verifyToken, isAdmin, updateMentor);
router.delete('/:id', verifyToken, isAdmin, deleteMentor);

export default router;
