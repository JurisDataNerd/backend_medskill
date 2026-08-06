import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../utils/supabase.js';

export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Get user profile with role
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, role, email')
    .eq('id', data.user.id)
    .single();

  req.user = profile || { id: data.user.id, role: 'customer', email: data.user.email! };
  return next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}
