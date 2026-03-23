import pool from '../config/database.js';

// Get all materials by stase
export const getMaterialsByStase = async (req, res) => {
  const { staseId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, stase_id, title, description, file_type, order_index, is_premium, created_at 
       FROM materials 
       WHERE stase_id = $1 
       ORDER BY order_index ASC`,
      [staseId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch materials',
      error: error.message
    });
  }
};

// Get single material by ID (with access check)
export const getMaterialById = async (req, res) => {
  const { materialId } = req.params;

  try {
    const result = await pool.query(
      `SELECT m.*, s.name as stase_name 
       FROM materials m
       JOIN stases s ON m.stase_id = s.id
       WHERE m.id = $1`,
      [materialId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    const material = result.rows[0];

    // Don't expose file_url if user doesn't have access
    const response = {
      id: material.id,
      stase_id: material.stase_id,
      stase_name: material.stase_name,
      title: material.title,
      description: material.description,
      file_type: material.file_type,
      order_index: material.order_index,
      is_premium: material.is_premium,
      created_at: material.created_at
    };

    // If user has access (checked by middleware), include file_url
    if (req.material || !material.is_premium) {
      response.file_url = material.file_url;
    }

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch material',
      error: error.message
    });
  }
};

// Create material (admin only)
export const createMaterial = async (req, res) => {
  const { stase_id, title, description, file_url, file_type, order_index, is_premium } = req.body;

  if (!stase_id || !title || !file_url) {
    return res.status(400).json({
      success: false,
      message: 'Stase ID, title, and file URL are required'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO materials 
       (stase_id, title, description, file_url, file_type, order_index, is_premium) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [stase_id, title, description, file_url, file_type || 'pdf', order_index || 0, is_premium ?? true]
    );

    res.status(201).json({
      success: true,
      message: 'Material created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create material',
      error: error.message
    });
  }
};

// Update material (admin only)
export const updateMaterial = async (req, res) => {
  const { materialId } = req.params;
  const { title, description, file_url, file_type, order_index, is_premium } = req.body;

  try {
    const result = await pool.query(
      `UPDATE materials 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           file_url = COALESCE($3, file_url),
           file_type = COALESCE($4, file_type),
           order_index = COALESCE($5, order_index),
           is_premium = COALESCE($6, is_premium),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 
       RETURNING *`,
      [title, description, file_url, file_type, order_index, is_premium, materialId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      message: 'Material updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update material',
      error: error.message
    });
  }
};

// Delete material (admin only)
export const deleteMaterial = async (req, res) => {
  const { materialId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM materials WHERE id = $1 RETURNING *',
      [materialId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete material',
      error: error.message
    });
  }
};
