import pool from '../config/database.js';

// Get comments for a video
export const getVideoComments = async (req, res) => {
  const { videoId } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.*, u.name as user_name 
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.video_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at DESC`,
      [videoId]
    );

    // Get replies for each comment
    const comments = await Promise.all(
      result.rows.map(async (comment) => {
        const repliesResult = await pool.query(
          `SELECT cr.*, u.name as admin_name 
           FROM comment_replies cr
           JOIN users u ON cr.admin_id = u.id
           WHERE cr.comment_id = $1 AND cr.is_deleted = false
           ORDER BY cr.created_at ASC`,
          [comment.id]
        );

        return {
          ...comment,
          replies: repliesResult.rows
        };
      })
    );

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments',
      error: error.message
    });
  }
};

// Create comment (requires token)
export const createComment = async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check user token balance
    const userResult = await client.query(
      'SELECT token_balance FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];
    const tokenCost = 1; // 1 token per comment

    if (user.token_balance < tokenCost) {
      return res.status(402).json({
        success: false,
        message: 'Insufficient token balance. Please top up to comment.'
      });
    }

    // Deduct token
    const newBalance = user.token_balance - tokenCost;
    await client.query(
      'UPDATE users SET token_balance = $1 WHERE id = $2',
      [newBalance, userId]
    );

    // Create comment
    const commentResult = await client.query(
      `INSERT INTO comments (video_id, user_id, content, token_used) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [videoId, userId, content, tokenCost]
    );

    // Record token transaction
    await client.query(
      `INSERT INTO token_transactions 
       (user_id, amount, transaction_type, description, balance_before, balance_after) 
       VALUES ($1, $2, 'USAGE', $3, $4, $5)`,
      [userId, tokenCost, 'Comment posted', user.token_balance, newBalance]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: {
        ...commentResult.rows[0],
        user_name: req.user.name,
        balance_after: newBalance
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post comment',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Delete comment (user or admin)
export const deleteComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // Get comment
    const commentResult = await pool.query(
      'SELECT * FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const comment = commentResult.rows[0];

    // Check if user owns the comment or is admin
    if (comment.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete
    await pool.query(
      'UPDATE comments SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [commentId]
    );

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment',
      error: error.message
    });
  }
};

// Reply to comment (admin only)
export const replyToComment = async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  const adminId = req.user.id;

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }

  if (!content || content.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Reply content is required'
    });
  }

  try {
    // Check if comment exists
    const commentResult = await pool.query(
      'SELECT id FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Create reply
    const result = await pool.query(
      `INSERT INTO comment_replies (comment_id, admin_id, content) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [commentId, adminId, content]
    );

    res.status(201).json({
      success: true,
      message: 'Reply posted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Reply comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post reply',
      error: error.message
    });
  }
};

// Delete reply (admin only)
export const deleteReply = async (req, res) => {
  const { replyId } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }

  try {
    await pool.query(
      'UPDATE comment_replies SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [replyId]
    );

    res.json({
      success: true,
      message: 'Reply deleted successfully'
    });
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete reply',
      error: error.message
    });
  }
};

// Get user's token transaction history
export const getTokenHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT tt.*, p.amount as payment_amount, p.payment_type
       FROM token_transactions tt
       LEFT JOIN payments p ON tt.payment_id = p.id
       WHERE tt.user_id = $1
       ORDER BY tt.created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get token history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch token history',
      error: error.message
    });
  }
};
