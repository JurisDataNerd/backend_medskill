import pool from '../config/database.js';
import { generateToken } from '../utils/auth.js';

// Login user (via Supabase Auth - user harus login dulu di Supabase)
export const login = async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    // Note: Login dilakukan via Supabase Auth API
    // Endpoint ini untuk mendapatkan token setelah user login di Supabase
    // Frontend harus mengirim access_token dari Supabase setelah login
    
    const { access_token } = req.body;
    
    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: 'Access token from Supabase is required'
      });
    }

    // Verify token with Supabase and get user info
    // User info akan diambil dari auth.users Supabase
    const result = await pool.query(
      `SELECT 
         au.id,
         au.email,
         p.name,
         p.role,
         p.token_balance
       FROM auth.users au
       LEFT JOIN profiles p ON p.user_id = au.id
       WHERE au.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Generate JWT token untuk backend
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      token_balance: user.token_balance || 0
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name || 'User',
          email: user.email,
          role: user.role || 'user',
          token_balance: user.token_balance || 0
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         au.id,
         au.email,
         au.created_at,
         p.name,
         p.role,
         p.token_balance,
         p.avatar_url,
         p.phone,
         p.institution
       FROM auth.users au
       LEFT JOIN profiles p ON p.user_id = au.id
       WHERE au.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Update user profile (melengkapi data pengguna di tabel profiles)
export const updateProfile = async (req, res) => {
  const { name, phone, institution, avatar_url } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO profiles (user_id, name, phone, institution, avatar_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         institution = EXCLUDED.institution,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, name, phone, institution, avatar_url]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Change password - melalui Supabase Auth
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  try {
    // Password change harus dilakukan melalui Supabase Auth API
    // Endpoint ini hanya sebagai placeholder
    res.status(501).json({
      success: false,
      message: 'Password change must be done through Supabase Auth API'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// Admin: Create admin user - melalui Supabase Auth
// User harus signup dulu via Supabase Auth, lalu role di-set di profiles
export const createAdmin = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: 'User ID from Supabase is required'
    });
  }

  try {
    // Set role admin di profiles table
    const result = await pool.query(
      `INSERT INTO profiles (user_id, role, token_balance)
       VALUES ($1, 'admin', 0)
       ON CONFLICT (user_id) DO UPDATE SET
         role = 'admin'
       RETURNING *`,
      [user_id]
    );

    res.status(201).json({
      success: true,
      message: 'Admin role assigned successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: error.message
    });
  }
};
