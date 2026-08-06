import { Response } from 'express';
import { supabaseAdmin } from '../../utils/supabase.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import snap from '../../utils/midtrans.js';

// POST /api/rental/payment/initiate — create Midtrans transaction
export async function initiatePayment(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { order_id } = req.body;

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`*, users(full_name, email, phone), order_items(*, mannequins(name))`)
    .eq('id', order_id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'waiting_payment') {
    return res.status(400).json({ error: 'Order is not awaiting payment' });
  }

  const midtransOrderId = `MSK-${order_id.slice(-8).toUpperCase()}-${Date.now()}`;
  const itemDetails = order.order_items.map((item: any) => ({
    id: item.id,
    name: `${item.mannequins.name} (${item.billing_units} unit × ${item.duration_hours} jam)`,
    price: Math.round(item.unit_price),
    quantity: item.billing_units,
  }));

  if (Number(order.deposit_amount) > 0) {
    itemDetails.push({ id: 'deposit', name: 'Deposit Jaminan (25%)', price: Math.round(order.deposit_amount), quantity: 1 });
  }
  if (Number(order.delivery_fee) > 0) {
    itemDetails.push({ id: 'delivery', name: 'Ongkos Kirim', price: Math.round(order.delivery_fee), quantity: 1 });
  }

  const parameter = {
    transaction_details: { order_id: midtransOrderId, gross_amount: Math.round(order.total_amount) },
    customer_details: {
      first_name: order.users?.full_name ?? 'Customer',
      email: order.users?.email,
      phone: order.users?.phone,
    },
    item_details: itemDetails,
    expiry: { unit: 'minutes', duration: 10 },
  };

  try {
    const transaction = await snap.createTransaction(parameter);

    // Save payment record
    await supabaseAdmin.from('payments').upsert({
      order_id,
      midtrans_order_id: midtransOrderId,
      amount: order.total_amount,
      status: 'pending',
      expired_at: new Date(Date.now() + 10 * 60000).toISOString(),
    }, { onConflict: 'order_id' });

    return res.json({
      data: {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        midtrans_order_id: midtransOrderId,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/rental/payment/webhook — Midtrans notification handler
export async function paymentWebhook(req: AuthRequest, res: Response) {
  const notification = req.body;
  const { order_id: midtransOrderId, transaction_status, fraud_status, gross_amount } = notification;

  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select('*, orders(id)')
    .eq('midtrans_order_id', midtransOrderId)
    .single();

  if (error || !payment) return res.status(404).json({ error: 'Payment not found' });

  let paymentStatus: string;
  let orderStatus: string;

  if (transaction_status === 'capture' && fraud_status === 'accept') {
    paymentStatus = 'success'; orderStatus = 'paid';
  } else if (transaction_status === 'settlement') {
    paymentStatus = 'success'; orderStatus = 'paid';
  } else if (['deny', 'failure'].includes(transaction_status)) {
    paymentStatus = 'failure'; orderStatus = 'cancelled_by_customer';
  } else if (transaction_status === 'expire') {
    paymentStatus = 'expire'; orderStatus = 'expired';
  } else if (transaction_status === 'cancel') {
    paymentStatus = 'cancel'; orderStatus = 'cancelled_by_customer';
  } else {
    return res.status(200).json({ message: 'Status not handled' });
  }

  await supabaseAdmin.from('payments').update({
    status: paymentStatus,
    midtrans_response: notification,
    paid_at: paymentStatus === 'success' ? new Date().toISOString() : null,
    midtrans_transaction_id: notification.transaction_id,
    payment_method: notification.payment_type,
  }).eq('id', payment.id);

  const orderId = payment.orders?.id;
  if (orderId) {
    await supabaseAdmin.from('orders').update({ status: orderStatus }).eq('id', orderId);
    await supabaseAdmin.from('bookings').update({ status: orderStatus }).eq('order_id', orderId);

    // Create deposit record if paid
    if (orderStatus === 'paid') {
      const { data: order } = await supabaseAdmin.from('orders').select('deposit_amount').eq('id', orderId).single();
      if (order && Number(order.deposit_amount) > 0) {
        await supabaseAdmin.from('deposits').upsert({ order_id: orderId, amount: order.deposit_amount, status: 'held' }, { onConflict: 'order_id' });
      }
    }
  }

  return res.status(200).json({ message: 'OK' });
}
