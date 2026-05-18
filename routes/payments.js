import express from 'express';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.post('/midtrans-callback', async (req, res) => {

  try {

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id,
      payment_type
    } = req.body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    const hash = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + serverKey)
      .digest('hex');

    if (hash !== signature_key) {
      return res.status(403).json({ message: "Invalid signature" });
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('midtrans_order_id', order_id)
      .single();

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (transaction_status === 'settlement' || transaction_status === 'capture') {

      await supabase
        .from('payments')
        .update({
          status: 'paid',
          payment_method: payment_type,
          midtrans_transaction_id: transaction_id,
          paid_at: new Date()
        })
        .eq('id', payment.id);

      await supabase
        .from('subscriptions')
        .update({
          status: 'active'
        })
        .eq('id', payment.subscription_id);

    }

    if (transaction_status === 'expire' || transaction_status === 'cancel') {

      await supabase
        .from('payments')
        .update({
          status: 'failed'
        })
        .eq('id', payment.id);

    }

    res.status(200).json({ message: "Webhook processed" });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Webhook error" });

  }

});

export default router;