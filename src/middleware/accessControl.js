import pool from '../config/database.js';
import { checkAccess } from '../controllers/subscriptionController.js';

// Check if user has access to video
export const checkVideoAccess = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const userId = req.user.id;

    // Get video details
    const videoResult = await pool.query(
      'SELECT stase_id, is_premium FROM videos WHERE id = $1',
      [videoId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const video = videoResult.rows[0];

    // If video is not premium, allow access
    if (!video.is_premium) {
      return next();
    }

    // Check subscription access
    const access = await checkAccess(userId, 'video', video.stase_id);

    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Subscription required to view this video.',
        reason: access.reason
      });
    }

    // Attach video info to request
    req.video = video;
    next();
  } catch (error) {
    console.error('Check video access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify access',
      error: error.message
    });
  }
};

// Check if user has access to material
export const checkMaterialAccess = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const userId = req.user.id;

    // Get material details
    const materialResult = await pool.query(
      'SELECT stase_id, is_premium FROM materials WHERE id = $1',
      [materialId]
    );

    if (materialResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    const material = materialResult.rows[0];

    // If material is not premium, allow access
    if (!material.is_premium) {
      return next();
    }

    // Check subscription access
    const access = await checkAccess(userId, 'material', material.stase_id);

    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Subscription required to view this material.',
        reason: access.reason
      });
    }

    // Attach material info to request
    req.material = material;
    next();
  } catch (error) {
    console.error('Check material access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify access',
      error: error.message
    });
  }
};

// Generate signed URL for video (for protected streaming)
export const generateSignedUrl = (videoUrl, expiresInSeconds = 3600) => {
  // Implement signed URL logic based on your storage provider
  // This is a placeholder - implement based on your CDN/storage solution
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = `${videoUrl}?expires=${expires}`;
  
  return signature;
};
