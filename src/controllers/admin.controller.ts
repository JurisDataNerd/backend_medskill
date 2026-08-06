import { Response } from 'express';
import { supabaseAdmin } from '../../utils/supabase.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

// GET /api/admin/mannequins
export async function adminGetMannequins(req: AuthRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from('mannequins')
    .select(`*, product_categories(id, name)`)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
}

// POST /api/admin/mannequins
export async function adminCreateMannequin(req: AuthRequest, res: Response) {
  const { name, description, category_id, price_per_billing_unit, max_stock, stock, features, image_urls, is_active } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { data, error } = await supabaseAdmin
    .from('mannequins')
    .insert({ name, slug, description, category_id, price_per_billing_unit, max_stock: max_stock ?? 2, stock: stock ?? 0, features: features ?? [], image_urls: image_urls ?? [], is_active: is_active ?? true })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ data });
}

// PUT /api/admin/mannequins/:id
export async function adminUpdateMannequin(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const updates = req.body;
  if (updates.name) updates.slug = updates.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { data, error } = await supabaseAdmin
    .from('mannequins')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
}

// DELETE /api/admin/mannequins/:id (soft delete via is_active)
export async function adminDeleteMannequin(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { error } = await supabaseAdmin
    .from('mannequins')
    .update({ is_active: false })
    .eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Mannequin deactivated' });
}

// GET /api/admin/categories
export async function adminGetCategories(req: AuthRequest, res: Response) {
  const { data, error } = await supabaseAdmin
    .from('product_categories')
    .select('*')
    .order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
}

// POST /api/admin/categories
export async function adminCreateCategory(req: AuthRequest, res: Response) {
  const { name, description, icon_url, sort_order } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const { data, error } = await supabaseAdmin
    .from('product_categories')
    .insert({ name, slug, description, icon_url, sort_order: sort_order ?? 0, is_active: true })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ data });
}

// GET /api/admin/orders — all orders with filters
export async function adminGetOrders(req: AuthRequest, res: Response) {
  const { status, date_from, date_to, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  let query = supabaseAdmin
    .from('orders')
    .select(`*, users(full_name, email, phone), order_items(*, mannequins(name)), payments(status)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit as string) - 1);

  if (status) query = query.eq('status', status as string);
  if (date_from) query = query.gte('created_at', date_from as string);
  if (date_to) query = query.lte('created_at', date_to as string);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data, total: count, page: parseInt(page as string), limit: parseInt(limit as string) });
}

// PATCH /api/admin/orders/:id/status
export async function adminUpdateOrderStatus(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { status, reason } = req.body;

  const validStatuses = ['pending', 'waiting_payment', 'paid', 'preparing', 'on_delivery', 'ready_for_pickup', 'ongoing_rental', 'completed', 'cancelled_by_provider'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !order) return res.status(404).json({ error: 'Order not found' });

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  // Update all bookings of this order
  await supabaseAdmin.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('order_id', id);

  // Log the status change
  const { data: bookings } = await supabaseAdmin.from('bookings').select('id').eq('order_id', id);
  if (bookings?.length) {
    const logs = bookings.map((b: any) => ({
      booking_id: b.id,
      changed_by: req.user!.id,
      old_status: order.status,
      new_status: status,
      reason: reason || null,
    }));
    await supabaseAdmin.from('booking_status_logs').insert(logs);
  }

  // If cancelled by provider → create 100% refund
  if (status === 'cancelled_by_provider') {
    const { data: orderData } = await supabaseAdmin.from('orders').select('total_amount').eq('id', id).single();
    const { data: payment } = await supabaseAdmin.from('payments').select('id').eq('order_id', id).single();
    await supabaseAdmin.from('refunds').insert({
      order_id: id,
      payment_id: payment?.id,
      amount: orderData?.total_amount,
      refund_percentage: 100,
      reason: reason || 'Cancelled by provider',
      cancellation_type: 'by_provider',
      status: 'pending',
    });
  }

  return res.json({ message: 'Status updated', status });
}

// GET /api/admin/config
export async function adminGetConfig(req: AuthRequest, res: Response) {
  const { data, error } = await supabaseAdmin.from('rental_config').select('*').order('key');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
}

// PATCH /api/admin/config — update one or many config keys
export async function adminUpdateConfig(req: AuthRequest, res: Response) {
  const updates: { key: string; value: string }[] = req.body.configs;
  if (!Array.isArray(updates) || !updates.length) {
    return res.status(400).json({ error: 'configs array required' });
  }
  const upserts = updates.map(u => ({ key: u.key, value: u.value, updated_at: new Date().toISOString() }));
  const { error } = await supabaseAdmin.from('rental_config').upsert(upserts, { onConflict: 'key' });
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Config updated' });
}

// GET /api/admin/identities — pending identity verifications
export async function adminGetIdentities(req: AuthRequest, res: Response) {
  const { verified } = req.query;
  let query = supabaseAdmin
    .from('rental_identities')
    .select(`*, users(full_name, email)`)
    .order('created_at', { ascending: true });
  if (verified !== undefined) query = query.eq('is_verified', verified === 'true');
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
}

// PATCH /api/admin/identities/:id — verify/reject identity
export async function adminVerifyIdentity(req: AuthRequest, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { is_verified, notes } = req.body;
  const { data, error } = await supabaseAdmin
    .from('rental_identities')
    .update({ is_verified, notes, verified_by: req.user.id, verified_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data });
}

// GET /api/admin/dashboard — stats
export async function adminGetDashboard(req: AuthRequest, res: Response) {
  const today = new Date().toISOString().split('T')[0];

  const [activeBookings, pendingIdentities, todayOrders, availableMannequins] = await Promise.all([
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'ongoing_rental'),
    supabaseAdmin.from('rental_identities').select('id', { count: 'exact', head: true }).eq('is_verified', false),
    supabaseAdmin.from('orders').select('total_amount').gte('created_at', `${today}T00:00:00Z`).eq('status', 'paid'),
    supabaseAdmin.from('mannequins').select('id, name, stock').eq('is_active', true),
  ]);

  const todayRevenue = (todayOrders.data ?? []).reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

  return res.json({
    data: {
      active_bookings: activeBookings.count ?? 0,
      pending_identities: pendingIdentities.count ?? 0,
      today_revenue: todayRevenue,
      today_orders: todayOrders.data?.length ?? 0,
      mannequins: availableMannequins.data ?? [],
    }
  });
}
