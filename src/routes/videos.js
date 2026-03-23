import express from 'express';
import {
  getVideosByStase,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo
} from '../controllers/videoController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { checkVideoAccess } from '../middleware/accessControl.js';

const router = express.Router();

// Public routes (with access control for premium content)
router.get('/stase/:staseId', getVideosByStase);
router.get('/:videoId', getVideoById);

// Protected routes (require auth + access check)
router.get('/:videoId/stream', verifyToken, checkVideoAccess, (req, res) => {
  // Return video URL for streaming
  res.json({
    success: true,
    data: {
      video_url: req.video?.video_url || 'Video URL not available'
    }
  });
});

// Admin only routes
router.post('/', verifyToken, isAdmin, createVideo);
router.put('/:videoId', verifyToken, isAdmin, updateVideo);
router.delete('/:videoId', verifyToken, isAdmin, deleteVideo);

export default router;
