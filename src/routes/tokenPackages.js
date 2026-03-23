import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get token packages
router.get('/packages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM token_packages WHERE is_active = true ORDER BY price ASC'
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch token packages',
      error: error.message
    });
  }
});

export default router;
