import pool from '../config/database.js';

// Get all active mentors
export const getAllMentors = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, position, university, specialty, img_url, bio, is_active, created_at
       FROM mentors
       WHERE is_active = true
       ORDER BY name ASC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get mentors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentors',
      error: error.message
    });
  }
};

// Get mentor by ID
export const getMentorById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, position, university, specialty, img_url, bio, is_active, created_at
       FROM mentors
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get mentor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mentor',
      error: error.message
    });
  }
};

// Create mentor (admin only)
export const createMentor = async (req, res) => {
  const { name, position, university, specialty, img_url, bio } = req.body;

  if (!name || !position || !university) {
    return res.status(400).json({
      success: false,
      message: 'Name, position, and university are required'
    });
  }

  try {
    const specialtyArray = Array.isArray(specialty) ? specialty : [specialty];
    
    const result = await pool.query(
      `INSERT INTO mentors (name, position, university, specialty, img_url, bio, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [name, position, university, specialtyArray, img_url, bio]
    );

    res.status(201).json({
      success: true,
      message: 'Mentor created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create mentor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create mentor',
      error: error.message
    });
  }
};

// Update mentor (admin only)
export const updateMentor = async (req, res) => {
  const { id } = req.params;
  const { name, position, university, specialty, img_url, bio, is_active } = req.body;

  try {
    const specialtyArray = Array.isArray(specialty) ? specialty : [specialty];
    
    const result = await pool.query(
      `UPDATE mentors
       SET name = COALESCE($1, name),
           position = COALESCE($2, position),
           university = COALESCE($3, university),
           specialty = COALESCE($4, specialty),
           img_url = COALESCE($5, img_url),
           bio = COALESCE($6, bio),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, position, university, specialtyArray, img_url, bio, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    res.json({
      success: true,
      message: 'Mentor updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update mentor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update mentor',
      error: error.message
    });
  }
};

// Delete mentor (admin only)
export const deleteMentor = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM mentors WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }

    res.json({
      success: true,
      message: 'Mentor deleted successfully'
    });
  } catch (error) {
    console.error('Delete mentor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete mentor',
      error: error.message
    });
  }
};
