import pool from '../config/database.js';

// Get all stases (public)
export const getAllStases = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, order_index, is_active, created_at 
       FROM stases 
       WHERE is_active = true 
       ORDER BY order_index ASC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get stases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stases',
      error: error.message
    });
  }
};

// Get single stase by ID
export const getStaseById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, description, order_index, is_active, created_at 
       FROM stases 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stase not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get stase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stase',
      error: error.message
    });
  }
};

// Create new stase (admin only)
export const createStase = async (req, res) => {
  const { name, description, order_index } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'Stase name is required'
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO stases (name, description, order_index, is_active) 
       VALUES ($1, $2, $3, true) 
       RETURNING *`,
      [name, description || null, order_index || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Stase created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create stase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stase',
      error: error.message
    });
  }
};

// Update stase (admin only)
export const updateStase = async (req, res) => {
  const { id } = req.params;
  const { name, description, order_index, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE stases 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           order_index = COALESCE($3, order_index),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING *`,
      [name, description, order_index, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stase not found'
      });
    }

    res.json({
      success: true,
      message: 'Stase updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update stase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stase',
      error: error.message
    });
  }
};

// Delete stase (admin only)
export const deleteStase = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM stases WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stase not found'
      });
    }

    res.json({
      success: true,
      message: 'Stase deleted successfully'
    });
  } catch (error) {
    console.error('Delete stase error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete stase',
      error: error.message
    });
  }
};
