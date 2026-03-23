import express from 'express';
import {
  getMaterialsByStase,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial
} from '../controllers/materialController.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { checkMaterialAccess } from '../middleware/accessControl.js';

const router = express.Router();

// Public routes (with access control for premium content)
router.get('/stase/:staseId', getMaterialsByStase);
router.get('/:materialId', getMaterialById);

// Protected routes (require auth + access check)
router.get('/:materialId/download', verifyToken, checkMaterialAccess, (req, res) => {
  // Return file URL for download
  res.json({
    success: true,
    data: {
      file_url: req.material?.file_url || 'File URL not available'
    }
  });
});

// Admin only routes
router.post('/', verifyToken, isAdmin, createMaterial);
router.put('/:materialId', verifyToken, isAdmin, updateMaterial);
router.delete('/:materialId', verifyToken, isAdmin, deleteMaterial);

export default router;
