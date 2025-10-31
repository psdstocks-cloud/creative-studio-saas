import express from 'express';
import { supabaseAdmin, requireUserFromAuthHeader } from '../lib/supabase.js';

const ordersRouter = express.Router();

const ensureSupabase = () => {
  if (!supabaseAdmin) {
    const error = new Error('Supabase admin client is not configured.');
    error.status = 500;
    throw error;
  }
  return supabaseAdmin;
};

ordersRouter.get('/', async (req, res) => {
  try {
    const user = await requireUserFromAuthHeader(req);
    req.user = user;
    const client = ensureSupabase();

    const { data, error } = await client
      .from('stock_order')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ orders: data ?? [] });
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    res.status(status).json({ message: error?.message || 'Unable to load orders' });
  }
});

ordersRouter.get('/lookup', async (req, res) => {
  try {
    const user = await requireUserFromAuthHeader(req);
    req.user = user;
    const client = ensureSupabase();
    const parseQueryParam = (value) => (Array.isArray(value) ? value[0] : value);
    const siteParam = parseQueryParam(req.query.site);
    const idParam = parseQueryParam(req.query.id);

    if (!siteParam || !idParam) {
      res.status(400).json({ message: 'site and id are required' });
      return;
    }

    const { data, error } = await client
      .from('stock_order')
      .select('id, status, created_at, file_info')
      .eq('user_id', user.id)
      .eq('file_info->>site', String(siteParam))
      .eq('file_info->>id', String(idParam))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ existing: data ?? null });
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    res.status(status).json({ message: error?.message || 'Lookup failed' });
  }
});

ordersRouter.get('/:taskId', async (req, res) => {
  try {
    const user = await requireUserFromAuthHeader(req);
    req.user = user;
    const client = ensureSupabase();

    const { data, error } = await client
      .from('stock_order')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_id', req.params.taskId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      res.status(404).json({ message: 'Not found' });
      return;
    }

    res.json({ order: data });
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    res.status(status).json({ message: error?.message || 'Unable to load order' });
  }
});

export { ordersRouter };
