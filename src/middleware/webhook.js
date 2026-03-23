import pool from '../config/database.js';

// Midtrans IP Addresses (for webhook security)
// Source: https://docs.midtrans.com/en/core-api/webhook.html#webhook-ip-addresses
const MIDTRANS_IPS = [
  '35.197.191.36',
  '35.197.191.37',
  '34.101.52.9',
  '34.101.104.10',
  '34.101.251.161',
  '34.101.251.245',
  '35.240.192.151',
  '35.240.192.152',
  '35.240.192.153',
  '35.240.192.154',
  '35.240.192.155',
  '35.240.192.156',
  '35.240.192.157',
  '35.240.192.158',
  '35.240.192.159',
  '35.240.192.160',
  '35.240.192.161',
  '35.240.192.162',
  '35.240.192.163',
  '35.240.192.164',
  '35.240.192.165',
  '35.240.192.166',
  '35.240.192.167',
  '35.240.192.168',
  '35.240.192.169',
  '35.240.192.170',
  '35.240.192.171',
  '35.240.192.172',
  '35.240.192.173',
  '35.240.192.174',
  '35.240.192.175',
  '35.240.192.176',
  '35.240.192.177',
  '35.240.192.178',
  '35.240.192.179',
  '35.240.192.180',
  '35.240.192.181',
  '35.240.192.182',
  '35.240.192.183',
  '35.240.192.184',
  '35.240.192.185',
  '35.240.192.186',
  '35.240.192.187',
  '35.240.192.188',
  '35.240.192.189',
  '35.240.192.190',
  '35.240.192.191',
  '35.240.192.192',
  '35.240.192.193',
  '35.240.192.194',
  '35.240.192.195',
  '35.240.192.196',
  '35.240.192.197',
  '35.240.192.198',
  '35.240.192.199',
  '35.240.192.200',
  '35.240.192.201',
  '35.240.192.202',
  '35.240.192.203',
  '35.240.192.204',
  '35.240.192.205',
  '35.240.192.206',
  '35.240.192.207',
  '35.240.192.208',
  '35.240.192.209',
  '35.240.192.210',
  '35.240.192.211',
  '35.240.192.212',
  '35.240.192.213',
  '35.240.192.214',
  '35.240.192.215',
  '35.240.192.216',
  '35.240.192.217',
  '35.240.192.218',
  '35.240.192.219',
  '35.240.192.220',
  '35.240.192.221',
  '35.240.192.222',
  '35.240.192.223',
  '35.240.192.224',
  '35.240.192.225',
  '35.240.192.226',
  '35.240.192.227',
  '35.240.192.228',
  '35.240.192.229',
  '35.240.192.230',
  '35.240.192.231',
  '35.240.192.232',
  '35.240.192.233',
  '35.240.192.234',
  '35.240.192.235',
  '35.240.192.236',
  '35.240.192.237',
  '35.240.192.238',
  '35.240.192.239',
  '35.240.192.240',
  '35.240.192.241',
  '35.240.192.242',
  '35.240.192.243',
  '35.240.192.244',
  '35.240.192.245',
  '35.240.192.246',
  '35.240.192.247',
  '35.240.192.248',
  '35.240.192.249',
  '35.240.192.250',
  '35.240.192.251',
  '35.240.192.252',
  '35.240.192.253',
  '35.240.192.254',
  '35.240.192.255'
];

// Middleware to verify webhook request
export const verifyWebhookRequest = (req, res, next) => {
  // Get client IP (handle proxy/load balancer)
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || 
                   req.socket.remoteAddress;

  console.log(`🔍 Webhook request from IP: ${clientIP}`);

  // Check if IP is in Midtrans IP list (only in production)
  if (process.env.MIDTRANS_IS_PRODUCTION === 'true') {
    if (!MIDTRANS_IPS.includes(clientIP)) {
      console.warn(`⚠️ Webhook request from non-Midtrans IP: ${clientIP}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied - Invalid IP address'
      });
    }
  }

  // Verify content type
  if (req.headers['content-type'] !== 'application/json') {
    console.warn('⚠️ Webhook request with invalid content type:', req.headers['content-type']);
    return res.status(400).json({
      success: false,
      message: 'Invalid content type'
    });
  }

  // Verify required fields
  if (!req.body.order_id || !req.body.transaction_status) {
    console.warn('⚠️ Webhook request missing required fields');
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }

  next();
};

// Middleware to prevent duplicate webhook processing
export const preventDuplicateWebhook = async (req, res, next) => {
  const { order_id, transaction_id } = req.body;

  try {
    // Check if this transaction has already been processed
    const result = await pool.query(
      'SELECT * FROM payments WHERE midtrans_transaction_id = $1 AND status = $2',
      [transaction_id, 'SUCCESS']
    );

    if (result.rows.length > 0) {
      console.log(`ℹ️ Duplicate webhook for transaction: ${transaction_id}`);
      // Return success anyway to prevent Midtrans from retrying
      return res.status(200).json({
        success: true,
        message: 'Webhook already processed',
        order_id: order_id,
        status: 'SUCCESS'
      });
    }

    next();
  } catch (error) {
    // Log error but continue (don't block webhook processing)
    console.error('⚠️ Error checking duplicate webhook (continuing anyway):', error.message);
    // Continue to process webhook even if DB check fails
    next();
  }
};
