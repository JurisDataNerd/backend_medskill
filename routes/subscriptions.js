import express from 'express';
import { snap } from '../config/midtrans.js';
import { supabase } from '../config/supabase.js';
import crypto from 'crypto';

const router = express.Router();

router.post('/create-payment', async (req, res) => {
  try {

    const { user_id, stase_id, price, duration } = req.body;

    const orderId = `SUB-${Date.now()}-${user_id}`;

    const startDate = new Date();
    const endDate = new Date();

    endDate.setDate(endDate.getDate() + duration);

    // insert subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id,
        stase_id,
        duration,
        start_date: startDate,
        end_date: endDate,
        status: 'pending',
        price
      })
      .select()
      .single();

    if (error) throw error;

    // insert payment record
    await supabase
      .from('payments')
      .insert({
        user_id,
        subscription_id: subscription.id,
        amount: price,
        status: 'pending',
        midtrans_order_id: orderId
      });

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: price
      },
      item_details: [
        {
          id: stase_id,
          price: price,
          quantity: 1,
          name: `MedSkill Stase ${stase_id}`
        }
      ]
    };

    const transaction = await snap.createTransaction(parameter);

    res.json({
      success: true,
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Payment creation failed"
    });
  }
});

export default router;