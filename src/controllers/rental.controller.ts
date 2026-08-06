import { Response } from 'express';
import { supabaseAdmin } from '../../utils/supabase.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { getRentalConfig, applyOvernightRule, calcBillingUnits } from '../services/rental.service.js';

// GET /api/rental/mannequins — Public catalog
export async function getMannequins(req: AuthRequest, res: Response) {
  const { category, search } = req.query;
  let query = supabaseAdmin
    .from('mannequins')
    .select(`*, product_categories(id, name, slug)`)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (category) query = query.eq('category_id', category as string);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
}

// GET /api/rental/mannequins/:id — Public detail
export async function getMannequinById(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('mannequins')
    .select(`*, product_categories(id, name, slug)`)
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Mannequin not found' });
  return res.json({ data });
}

// GET /api/rental/availability?mannequin_id=&rental_date=&start_time=&duration_hours=
export async function checkAvailability(req: AuthRequest, res: Response) {
  const { mannequin_id, rental_date, start_time, duration_hours } = req.query;
  if (!mannequin_id || !rental_date || !start_time || !duration_hours) {
    return res.status(400).json({ error: 'Missing required query params' });
  }

  try {
    const config = await getRentalConfig();
    const startAt = new Date(`${rental_date}T${start_time}:00+07:00`);
    const { adjustedEndTime, isOvernight, adjustedDurationHours } = applyOvernightRule(
      startAt, parseInt(duration_hours as string), config.overnight_end_time
    );
    const billingUnits = calcBillingUnits(adjustedDurationHours, config.billing_unit_hours);
    const bufferEndAt = new Date(adjustedEndTime.getTime() + config.buffer_minutes * 60000);

    // Validate operational hours (WIB)
    const startWIB = new Date(startAt.getTime() + 7 * 3600000);
    const [opStartH, opStartM] = config.operational_hours_start.split(':').map(Number);
    const [opEndH, opEndM] = config.operational_hours_end.split(':').map(Number);
    const startMinutes = startWIB.getUTCHours() * 60 + startWIB.getUTCMinutes();
    if (startMinutes < opStartH * 60 + opStartM || startMinutes > opEndH * 60 + opEndM) {
      return res.status(400).json({ error: `Start time must be between ${config.operational_hours_start} – ${config.operational_hours_end} WIB` });
    }

    // Get mannequin max stock
    const { data: mannequin } = await supabaseAdmin
      .from('mannequins')
      .select('id, name, max_stock, price_per_billing_unit')
      .eq('id', mannequin_id as string)
      .single();

    if (!mannequin) return res.status(404).json({ error: 'Mannequin not found' });

    // Count conflicting bookings
    const { count } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('mannequin_id', mannequin_id as string)
      .not('status', 'in', '("cancelled_by_customer","cancelled_by_provider","expired")')
      .lt('start_at', bufferEndAt.toISOString())
      .gt('buffer_end_at', startAt.toISOString());

    const available = (count ?? 0) < mannequin.max_stock;

    return res.json({
      data: {
        available,
        is_overnight: isOvernight,
        adjusted_duration_hours: adjustedDurationHours,
        billing_units: billingUnits,
        subtotal: billingUnits * mannequin.price_per_billing_unit,
        start_at: startAt.toISOString(),
        end_at: adjustedEndTime.toISOString(),
        buffer_end_at: bufferEndAt.toISOString(),
        overnight_note: isOvernight ? `Rental Anda akan berakhir pukul ${config.overnight_end_time} WIB (esok hari)` : null,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// POST /api/rental/cart — Add/update item in cart
export async function addToCart(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { mannequin_id, rental_date, start_time, duration_hours } = req.body;
  if (!mannequin_id || !rental_date || !start_time || !duration_hours) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const config = await getRentalConfig();
    const startAt = new Date(`${rental_date}T${start_time}:00+07:00`);
    const { adjustedEndTime, isOvernight, adjustedDurationHours } = applyOvernightRule(
      startAt, parseInt(duration_hours), config.overnight_end_time
    );
    const billingUnits = calcBillingUnits(adjustedDurationHours, config.billing_unit_hours);

    const { data: mannequin } = await supabaseAdmin
      .from('mannequins')
      .select('id, price_per_billing_unit')
      .eq('id', mannequin_id)
      .eq('is_active', true)
      .single();

    if (!mannequin) return res.status(404).json({ error: 'Mannequin not found' });

    const subtotal = billingUnits * mannequin.price_per_billing_unit;
    const endTimeStr = adjustedEndTime.toISOString().slice(11, 16); // HH:MM UTC → needs WIB conversion

    const { data, error } = await supabaseAdmin
      .from('carts')
      .upsert({
        user_id: req.user.id,
        mannequin_id,
        rental_date,
        start_time,
        duration_hours: Math.round(adjustedDurationHours),
        billing_units: billingUnits,
        is_overnight: isOvernight,
        end_time: endTimeStr,
        unit_price: mannequin.price_per_billing_unit,
        subtotal,
      }, { onConflict: 'user_id,mannequin_id,rental_date,start_time' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ data, overnight_note: isOvernight ? `End dipaksa ke ${config.overnight_end_time} WIB` : null });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// GET /api/rental/cart
export async function getCart(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { data, error } = await supabaseAdmin
    .from('carts')
    .select(`*, mannequins(id, name, image_urls, price_per_billing_unit)`)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const total = data.reduce((sum: number, item: any) => sum + Number(item.subtotal), 0);
  return res.json({ data, total });
}

// DELETE /api/rental/cart/:id
export async function removeFromCart(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { error } = await supabaseAdmin
    .from('carts')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Item removed from cart' });
}

// POST /api/rental/checkout — calls atomic DB function
export async function checkout(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { delivery_type, delivery_address_id, delivery_fee, distance_km } = req.body;

  // Get cart items
  const { data: cartItems, error: cartError } = await supabaseAdmin
    .from('carts')
    .select('*')
    .eq('user_id', req.user.id);

  if (cartError || !cartItems?.length) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Build items payload for stored procedure
  const items = cartItems.map((item: any) => ({
    mannequin_id: item.mannequin_id,
    rental_date: item.rental_date,
    start_time: item.start_time,
    duration_hours: item.duration_hours,
  }));

  const { data, error } = await supabaseAdmin.rpc('process_checkout', {
    p_user_id: req.user.id,
    p_items: items,
    p_delivery_type: delivery_type,
    p_delivery_address_id: delivery_address_id || null,
    p_delivery_fee: delivery_fee || 0,
    p_distance_km: distance_km || 0,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes('OUTSIDE_OPERATIONAL_HOURS')) return res.status(422).json({ error: msg.split(':')[1] });
    if (msg.includes('BOOKING_CONFLICT')) return res.status(409).json({ error: msg.split(':')[1] });
    if (msg.includes('MANNEQUIN_NOT_FOUND')) return res.status(404).json({ error: 'Mannequin not found' });
    return res.status(500).json({ error: msg });
  }

  // Clear cart after successful checkout
  await supabaseAdmin.from('carts').delete().eq('user_id', req.user.id);

  return res.status(201).json({ data });
}

// GET /api/rental/orders
export async function getOrders(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`*, order_items(*, mannequins(name, image_urls)), payments(status, paid_at)`)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
}

// GET /api/rental/orders/:id
export async function getOrderById(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`*, order_items(*, mannequins(name, image_urls, description)), payments(*), deposits(*)`)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Order not found' });
  return res.json({ data });
}

// POST /api/rental/orders/:id/cancel
export async function cancelOrder(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { reason } = req.body;

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*, bookings(rental_date, status)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (orderError || !order) return res.status(404).json({ error: 'Order not found' });
  if (!['waiting_payment', 'paid', 'preparing'].includes(order.status)) {
    return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
  }

  try {
    const config = await getRentalConfig();
    // Use first booking's rental_date for refund calculation
    const firstRentalDate = new Date(order.bookings?.[0]?.rental_date ?? new Date());
    const { calcRefundPercentage } = await import('../services/rental.service.js');
    const refundPct = calcRefundPercentage(firstRentalDate, new Date(), config);
    const refundAmount = Math.round((Number(order.total_amount) - Number(order.deposit_amount ?? 0)) * refundPct / 100);

    // Update order & bookings
    await supabaseAdmin.from('orders').update({ status: 'cancelled_by_customer' }).eq('id', id);
    await supabaseAdmin.from('bookings').update({ status: 'cancelled_by_customer' }).eq('order_id', id);

    // Create refund record
    if (refundPct > 0) {
      const { data: payment } = await supabaseAdmin.from('payments').select('id').eq('order_id', id).single();
      await supabaseAdmin.from('refunds').insert({
        order_id: id,
        payment_id: payment?.id,
        amount: refundAmount,
        refund_percentage: refundPct,
        reason: reason || 'Customer cancellation',
        cancellation_type: 'by_customer',
        status: 'pending',
      });
    }

    return res.json({
      message: 'Order cancelled',
      refund_percentage: refundPct,
      refund_amount: refundAmount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
