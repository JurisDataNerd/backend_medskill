import express from 'express';
import {
  getVideoComments,
  createComment,
  deleteComment,
  replyToComment,
  deleteReply,
  getTokenHistory
} from '../controllers/commentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get comments for a video (public)
router.get('/video/:videoId', getVideoComments);

// Protected routes
router.post('/video/:videoId', verifyToken, createComment);
router.delete('/:commentId', verifyToken, deleteComment);
router.post('/:commentId/reply', verifyToken, replyToComment);
router.delete('/replies/:replyId', verifyToken, deleteReply);
router.get('/history', verifyToken, getTokenHistory);

export default router;
