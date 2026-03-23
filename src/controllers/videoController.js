import pool from '../config/database.js';

// Get all videos by stase
export const getVideosByStase = async (req, res) => {
  const { staseId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, stase_id, title, description, thumbnail_url, duration, order_index, is_premium, created_at 
       FROM videos 
       WHERE stase_id = $1 
       ORDER BY order_index ASC`,
      [staseId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch videos',
      error: error.message
    });
  }
};

// Get single video by ID (with access check)
export const getVideoById = async (req, res) => {
  const { videoId } = req.params;

  try {
    const result = await pool.query(
      `SELECT v.*, s.name as stase_name 
       FROM videos v
       JOIN stases s ON v.stase_id = s.id
       WHERE v.id = $1`,
      [videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const video = result.rows[0];

    // Don't expose video_url if user doesn't have access
    const response = {
      id: video.id,
      stase_id: video.stase_id,
      stase_name: video.stase_name,
      title: video.title,
      description: video.description,
      thumbnail_url: video.thumbnail_url,
      duration: video.duration,
      order_index: video.order_index,
      is_premium: video.is_premium,
      created_at: video.created_at
    };

    // If user has access (checked by middleware), include video_url
    if (req.video || !video.is_premium) {
      response.video_url = video.video_url;
    }

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch video',
      error: error.message
    });
  }
};

// Create video (admin only)
export const createVideo = async (req, res) => {
  const { stase_id, title, description, video_url, thumbnail_url, duration, order_index, is_premium } = req.body;

  if (!stase_id || !title || !video_url) {
    return res.status(400).json({
      success: false,
      message: 'Stase ID, title, and video URL are required'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO videos 
       (stase_id, title, description, video_url, thumbnail_url, duration, order_index, is_premium) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [stase_id, title, description, video_url, thumbnail_url, duration, order_index || 0, is_premium ?? true]
    );

    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create video',
      error: error.message
    });
  }
};

// Update video (admin only)
export const updateVideo = async (req, res) => {
  const { videoId } = req.params;
  const { title, description, video_url, thumbnail_url, duration, order_index, is_premium } = req.body;

  try {
    const result = await pool.query(
      `UPDATE videos 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           video_url = COALESCE($3, video_url),
           thumbnail_url = COALESCE($4, thumbnail_url),
           duration = COALESCE($5, duration),
           order_index = COALESCE($6, order_index),
           is_premium = COALESCE($7, is_premium),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $8 
       RETURNING *`,
      [title, description, video_url, thumbnail_url, duration, order_index, is_premium, videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      message: 'Video updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update video',
      error: error.message
    });
  }
};

// Delete video (admin only)
export const deleteVideo = async (req, res) => {
  const { videoId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM videos WHERE id = $1 RETURNING *',
      [videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: error.message
    });
  }
};
