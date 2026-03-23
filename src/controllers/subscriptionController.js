import pool from '../config/database.js';

// Subscription pricing logic
export const calculatePrice = (packageType, duration, staseId = null) => {
  // Base prices (in IDR) - adjust according to your pricing strategy
  const basePrices = {
    full_access: {
      1: 99000,
      3: 249000,
      6: 449000,
      12: 799000
    },
    per_stase: {
      1: 39000,
      3: 99000,
      6: 179000,
      12: 299000
    },
    video_only: {
      1: 29000,
      3: 79000,
      6: 139000,
      12: 229000
    },
    materi_only: {
      1: 19000,
      3: 49000,
      6: 89000,
      12: 149000
    }
  };

  return basePrices[packageType]?.[duration] || 0;
};

// Get available subscription packages
export const getPackages = async (req, res) => {
  try {
    const packages = [
      {
        type: 'full_access',
        name: 'Full Access',
        description: 'Akses semua stase, video, dan materi',
        durations: [
          { months: 1, price: calculatePrice('full_access', 1) },
          { months: 3, price: calculatePrice('full_access', 3) },
          { months: 6, price: calculatePrice('full_access', 6) },
          { months: 12, price: calculatePrice('full_access', 12) }
        ]
      },
      {
        type: 'per_stase',
        name: 'Per Stase (Video + Materi)',
        description: 'Pilih 1 stase, akses video dan materi',
        durations: [
          { months: 1, price: calculatePrice('per_stase', 1) },
          { months: 3, price: calculatePrice('per_stase', 3) },
          { months: 6, price: calculatePrice('per_stase', 6) },
          { months: 12, price: calculatePrice('per_stase', 12) }
        ]
      },
      {
        type: 'video_only',
        name: 'Video Only',
        description: 'Pilih 1 stase, akses video saja',
        durations: [
          { months: 1, price: calculatePrice('video_only', 1) },
          { months: 3, price: calculatePrice('video_only', 3) },
          { months: 6, price: calculatePrice('video_only', 6) },
          { months: 12, price: calculatePrice('video_only', 12) }
        ]
      },
      {
        type: 'materi_only',
        name: 'Materi Only',
        description: 'Pilih 1 stase, akses materi saja',
        durations: [
          { months: 1, price: calculatePrice('materi_only', 1) },
          { months: 3, price: calculatePrice('materi_only', 3) },
          { months: 6, price: calculatePrice('materi_only', 6) },
          { months: 12, price: calculatePrice('materi_only', 12) }
        ]
      }
    ];

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch packages',
      error: error.message
    });
  }
};

// Get user's active subscription
export const getUserSubscription = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, st.name as stase_name
       FROM subscriptions s
       LEFT JOIN stases st ON s.stase_id = st.id
       WHERE s.user_id = $1 AND s.status = 'ACTIVE'
       ORDER BY s.end_date DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No active subscription'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message
    });
  }
};

// Get user's subscription history
export const getSubscriptionHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, st.name as stase_name
       FROM subscriptions s
       LEFT JOIN stases st ON s.stase_id = st.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription history',
      error: error.message
    });
  }
};

// Check if user has access to specific content
export const checkAccess = async (userId, contentType, staseId = null) => {
  const result = await pool.query(
    `SELECT * FROM subscriptions 
     WHERE user_id = $1 
     AND status = 'ACTIVE' 
     AND end_date >= CURRENT_DATE
     ORDER BY created_at DESC`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { hasAccess: false, reason: 'No active subscription' };
  }

  const subscriptions = result.rows;

  // Check for full_access
  const fullAccess = subscriptions.find(s => s.package_type === 'full_access');
  if (fullAccess) {
    return { hasAccess: true, subscription: fullAccess };
  }

  // If staseId is provided, check per-stase subscriptions
  if (staseId) {
    const perStase = subscriptions.find(
      s => s.stase_id === staseId && 
      ['per_stase', 'video_only', 'materi_only'].includes(s.package_type)
    );

    if (perStase) {
      // Check content type compatibility
      if (contentType === 'video' && ['per_stase', 'video_only'].includes(perStase.package_type)) {
        return { hasAccess: true, subscription: perStase };
      }
      if (contentType === 'material' && ['per_stase', 'materi_only'].includes(perStase.package_type)) {
        return { hasAccess: true, subscription: perStase };
      }
    }
  }

  return { hasAccess: false, reason: 'Subscription does not cover this content' };
};

// Create subscription (after payment)
export const createSubscription = async (userId, packageType, duration, staseId, price) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration);

    const result = await client.query(
      `INSERT INTO subscriptions 
       (user_id, package_type, stase_id, duration, start_date, end_date, status, price) 
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7) 
       RETURNING *`,
      [userId, packageType, staseId, duration, startDate, endDate, price]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Admin: Get all subscriptions
export const getAllSubscriptions = async (req, res) => {
  try {
    const { status, package_type } = req.query;
    
    let query = `
      SELECT s.*, u.name as user_name, u.email as user_email, st.name as stase_name
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN stases st ON s.stase_id = st.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (package_type) {
      query += ` AND s.package_type = $${paramIndex}`;
      params.push(package_type);
      paramIndex++;
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscriptions',
      error: error.message
    });
  }
};

// Admin: Cancel subscription
export const cancelSubscription = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE subscriptions 
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND status = 'ACTIVE'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Active subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};

// Expire old subscriptions (cron job function)
export const expireOldSubscriptions = async () => {
  try {
    const result = await pool.query(
      `UPDATE subscriptions 
       SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP 
       WHERE status = 'ACTIVE' AND end_date < CURRENT_DATE`
    );

    console.log(`✅ Expired ${result.rowCount} subscriptions`);
    return result.rowCount;
  } catch (error) {
    console.error('Expire subscriptions error:', error);
    throw error;
  }
};
