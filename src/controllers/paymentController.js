import midtransClient from 'midtrans-client';
import pool from '../config/database.js';
import { calculatePrice, createSubscription } from './subscriptionController.js';
import { createHash } from 'crypto';

// Initialize Midtrans
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Create payment transaction
export const createPayment = async (req, res) => {
  const { package_type, duration, stase_id, token_amount } = req.body;
  const userId = req.user.id;

  try {
    // Validate input
    if (!package_type && !token_amount) {
      return res.status(400).json({
        success: false,
        message: 'Package type or token amount is required'
      });
    }

    let amount = 0;
    let description = '';

    // Calculate amount
    if (token_amount) {
      // Token top-up
      const tokenPackage = await pool.query(
        'SELECT * FROM token_packages WHERE id = $1 AND is_active = true',
        [token_amount]
      );

      if (tokenPackage.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Token package not found'
        });
      }

      amount = tokenPackage.rows[0].price;
      description = `Top Up ${tokenPackage.rows[0].name}`;
    } else {
      // Subscription payment
      const validDurations = [1, 3, 6, 12];
      if (!validDurations.includes(duration)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid duration. Must be 1, 3, 6, or 12 months'
        });
      }

      amount = calculatePrice(package_type, duration, stase_id);
      
      if (amount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid package type'
        });
      }

      const packageNames = {
        full_access: 'Full Access',
        per_stase: 'Per Stase',
        video_only: 'Video Only',
        materi_only: 'Materi Only'
      };

      description = `Subscription ${packageNames[package_type]} - ${duration} months`;
      if (stase_id) {
        const stase = await pool.query('SELECT name FROM stases WHERE id = $1', [stase_id]);
        if (stase.rows.length > 0) {
          description += ` (${stase.rows[0].name})`;
        }
      }
    }

    // Generate unique order ID
    const orderId = `MEDSKILL-${userId}-${Date.now()}`;

    // Create payment parameter
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: req.user.name,
        email: req.user.email
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/payment/success`,
        error: `${process.env.FRONTEND_URL}/payment/error`,
        pending: `${process.env.FRONTEND_URL}/payment/pending`
      }
    };

    // Create transaction with Midtrans
    const transaction = await snap.createTransaction(parameter);

    // Save payment to database
    const paymentResult = await pool.query(
      `INSERT INTO payments 
       (user_id, subscription_id, amount, payment_type, midtrans_order_id, status) 
       VALUES ($1, NULL, $2, $3, $4, 'PENDING') 
       RETURNING *`,
      [userId, amount, token_amount ? 'token_topup' : 'subscription', orderId]
    );

    res.status(201).json({
      success: true,
      message: 'Payment transaction created',
      data: {
        payment_id: paymentResult.rows[0].id,
        order_id: orderId,
        amount: amount,
        description: description,
        redirect_url: transaction.redirect_url,
        token: transaction.token
      }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: error.message
    });
  }
};

// Midtrans webhook handler
export const paymentNotification = async (req, res) => {
  try {
    const { 
      order_id, 
      transaction_status, 
      fraud_status, 
      gross_amount, 
      transaction_id, 
      payment_type 
    } = req.body;

    console.log('📥 Webhook received:', {
      order_id,
      transaction_status,
      fraud_status,
      gross_amount,
      transaction_id
    });

    // Validate signature key (if sent by Midtrans)
    const signatureKey = req.headers['x-midtrans-signature'];
    if (signatureKey) {
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      const hash = createHash('sha512');
      hash.update(`${order_id}${transaction_status}${gross_amount}${serverKey}`);
      const computedSignature = hash.digest('hex');

      if (signatureKey !== computedSignature) {
        console.warn('⚠️ Invalid signature detected!');
        return res.status(403).json({
          success: false,
          message: 'Invalid signature'
        });
      }
    }

    // Get payment from database
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE midtrans_order_id = $1',
      [order_id]
    );

    if (paymentResult.rows.length === 0) {
      console.warn('⚠️ Payment not found for order_id:', order_id);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = paymentResult.rows[0];
    let newStatus = 'PENDING';

    // Determine transaction status based on Midtrans response
    switch (transaction_status) {
      case 'capture':
        if (fraud_status === 'accept') {
          newStatus = 'SUCCESS';
        } else if (fraud_status === 'deny') {
          newStatus = 'FAILED';
        }
        break;
      case 'settlement':
        newStatus = 'SUCCESS';
        break;
      case 'pending':
        newStatus = 'PENDING';
        break;
      case 'deny':
      case 'expire':
      case 'cancel':
      case 'failure':
      case 'refund':
      case 'chargeback':
        newStatus = 'FAILED';
        break;
      default:
        console.warn('Unknown transaction status:', transaction_status);
        newStatus = 'PENDING';
    }

    // Update payment status
    const paidAt = newStatus === 'SUCCESS' ? new Date() : null;

    await pool.query(
      `UPDATE payments 
       SET status = $1, 
           midtrans_transaction_id = $2,
           payment_method = $3,
           paid_at = $4,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5`,
      [newStatus, transaction_id, payment_type, paidAt, payment.id]
    );

    console.log(`✅ Payment ${payment.id} status updated to ${newStatus}`);

    // Process based on payment type and status
    if (newStatus === 'SUCCESS') {
      if (payment.payment_type === 'token_topup') {
        await processTokenTopup(payment, gross_amount);
      } else if (payment.subscription_id) {
        await activateSubscription(payment.subscription_id);
      }
    }

    // Send response to Midtrans
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      order_id: order_id,
      status: newStatus
    });

  } catch (error) {
    console.error('❌ Payment notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
      error: error.message
    });
  }
};

// Process token top-up
const processTokenTopup = async (payment, grossAmount) => {
  try {
    // Get token package by price
    const tokenPackage = await pool.query(
      'SELECT token_amount FROM token_packages WHERE price = $1 AND is_active = true',
      [parseInt(grossAmount)]
    );

    if (tokenPackage.rows.length === 0) {
      console.warn('Token package not found for amount:', grossAmount);
      return;
    }

    const tokenAmount = tokenPackage.rows[0].token_amount;

    // Get current balance from profiles
    const userResult = await pool.query(
      'SELECT token_balance FROM profiles WHERE user_id = $1',
      [payment.user_id]
    );

    const currentBalance = userResult.rows[0]?.token_balance || 0;
    const newBalance = currentBalance + tokenAmount;

    // Update user token balance in profiles
    await pool.query(
      `INSERT INTO profiles (user_id, token_balance)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET token_balance = $2`,
      [payment.user_id, newBalance]
    );

    // Record token transaction
    await pool.query(
      `INSERT INTO token_transactions
       (user_id, payment_id, amount, transaction_type, description, balance_before, balance_after)
       VALUES ($1, $2, $3, 'PURCHASE', $4, $5, $6)`,
      [payment.user_id, payment.id, tokenAmount, 'Token Top-up Purchase', currentBalance, newBalance]
    );

    console.log(`✅ Token top-up processed: ${tokenAmount} tokens added to user ${payment.user_id}`);
  } catch (error) {
    console.error('❌ Token top-up processing error:', error);
    throw error;
  }
};

// Activate subscription
const activateSubscription = async (subscriptionId) => {
  try {
    await pool.query(
      `UPDATE subscriptions 
       SET status = 'ACTIVE' 
       WHERE id = $1 AND status = 'PENDING'`,
      [subscriptionId]
    );

    console.log(`✅ Subscription ${subscriptionId} activated`);
  } catch (error) {
    console.error('❌ Subscription activation error:', error);
    throw error;
  }
};

// Create subscription payment (combined flow)
export const createSubscriptionPayment = async (req, res) => {
  const { package_type, duration, stase_id } = req.body;
  const userId = req.user.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate input
    const validDurations = [1, 3, 6, 12];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid duration'
      });
    }

    const amount = calculatePrice(package_type, duration, stase_id);
    
    if (amount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package type'
      });
    }

    // Generate unique order ID
    const orderId = `MEDSKILL-${userId}-${Date.now()}`;

    // Create Midtrans transaction
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      customer_details: {
        first_name: req.user.name,
        email: req.user.email
      }
    };

    const transaction = await snap.createTransaction(parameter);

    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments 
       (user_id, amount, payment_type, midtrans_order_id, status) 
       VALUES ($1, $2, 'subscription', $3, 'PENDING') 
       RETURNING *`,
      [userId, amount, orderId]
    );

    // Create subscription record (pending activation)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration);

    const subscriptionResult = await client.query(
      `INSERT INTO subscriptions 
       (user_id, package_type, stase_id, duration, start_date, end_date, status, price) 
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7) 
       RETURNING *`,
      [userId, package_type, stase_id, duration, startDate, endDate, amount]
    );

    // Update payment with subscription_id
    await client.query(
      'UPDATE payments SET subscription_id = $1 WHERE id = $2',
      [subscriptionResult.rows[0].id, paymentResult.rows[0].id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Subscription payment created',
      data: {
        payment_id: paymentResult.rows[0].id,
        subscription_id: subscriptionResult.rows[0].id,
        order_id: orderId,
        amount: amount,
        redirect_url: transaction.redirect_url,
        token: transaction.token
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create subscription payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription payment',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get user payment history
export const getPaymentHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, s.package_type, s.duration 
       FROM payments p
       LEFT JOIN subscriptions s ON p.subscription_id = s.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};
