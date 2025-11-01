import express from 'express';
import { supabaseAdmin, requireUserFromAuthHeader } from '../lib/supabase.js';
import { buildUpstreamUrl, upstreamHeaders } from '../lib/proxy.js';
import { parseStockUrl } from '../../../shared/stockUrl.js';

const ordersRouter = express.Router();

const ensureSupabase = () => {
  if (!supabaseAdmin) {
    const error = new Error('Supabase admin client is not configured.');
    error.status = 500;
    throw error;
  }
  return supabaseAdmin;
};

// Stock URL parsing and validation utilities
const parseAndValidateSourceUrl = (sourceUrl) => {
  try {
    const parsed = parseStockUrl(sourceUrl);
    return {
      site: parsed.site,
      id: parsed.id,
      normalizedUrl: parsed.normalizedUrl,
    };
  } catch (error) {
    const err = new Error(error?.message || 'Unable to parse site and ID from source URL');
    err.status = 400;
    throw err;
  }
};

// Fetch stock metadata from upstream API
const fetchStockMetadata = async (site, id) => {
  const url = buildUpstreamUrl(`stockinfo/${encodeURIComponent(site)}/${encodeURIComponent(id)}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: upstreamHeaders(),
  });

  if (!response.ok) {
    const error = new Error(`Failed to fetch stock metadata: ${response.statusText}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  return data;
};

// Normalize stock info
const normalizeStockInfo = (metadata, site, id, sourceUrl) => {
  const title = metadata?.title || metadata?.name || 'Untitled';
  const preview = metadata?.preview || metadata?.thumb || metadata?.thumbnail || null;
  const cost = typeof metadata?.cost === 'number' ? metadata.cost : 1.0;
  const author = metadata?.author || metadata?.creator || 'Unknown';
  const ext = metadata?.ext || metadata?.extension || 'jpg';
  const sizeInBytes = metadata?.sizeInBytes || metadata?.size || 0;
  const name = metadata?.name || metadata?.filename || `${site}-${id}.${ext}`;

  return {
    site,
    id,
    title,
    name,
    preview,
    cost,
    author,
    ext,
    sizeInBytes,
    sourceUrl,
  };
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

ordersRouter.post('/', async (req, res) => {
  try {
    const user = await requireUserFromAuthHeader(req);
    req.user = user;
    const client = ensureSupabase();

    const { taskId, site, stockId, sourceUrl } = req.body ?? {};

    // Validate required fields
    if (!taskId || typeof taskId !== 'string') {
      const error = new Error('taskId is required.');
      error.status = 400;
      throw error;
    }
    if (!sourceUrl || typeof sourceUrl !== 'string') {
      const error = new Error('sourceUrl is required.');
      error.status = 400;
      throw error;
    }

    // Parse and validate the source URL
    const parsed = parseAndValidateSourceUrl(sourceUrl);
    const resolvedSite = typeof site === 'string' ? site : parsed.site;
    const resolvedId = typeof stockId === 'string' ? stockId : parsed.id;

    // Ensure the site/id matches the URL
    if (parsed.site !== resolvedSite || parsed.id !== resolvedId) {
      const error = new Error('The provided site/id does not match the source URL.');
      error.status = 400;
      throw error;
    }

    // Check for existing orders (for re-download detection)
    const { data: existingOrder, error: existingError } = await client
      .from('stock_order')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('file_info->>site', resolvedSite)
      .eq('file_info->>id', resolvedId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    // Fetch stock metadata from upstream API
    const metadata = await fetchStockMetadata(resolvedSite, resolvedId);
    const normalized = normalizeStockInfo(metadata, resolvedSite, resolvedId, parsed.normalizedUrl);

    // Calculate cost (0 for re-downloads of ready orders)
    const isReDownload = existingOrder?.status === 'ready';
    const amountToDeduct = isReDownload ? 0 : normalized.cost;

    if (amountToDeduct < 0) {
      const error = new Error('Calculated price was negative.');
      error.status = 400;
      throw error;
    }

    // Create order via RPC function (handles balance deduction atomically)
    const { data: orderData, error: orderError } = await client.rpc('secure_create_stock_order', {
      p_user_id: user.id,
      p_task_id: taskId,
      p_amount: amountToDeduct,
      p_file_info: normalized,
      p_status: 'processing',
    });

    if (orderError) {
      const message = orderError.message || 'Failed to create order.';
      if (/insufficient balance/i.test(message)) {
        const error = new Error('Insufficient balance to complete this purchase.');
        error.status = 402;
        throw error;
      }
      throw orderError;
    }

    if (!orderData) {
      const error = new Error('Order creation returned an empty result.');
      error.status = 500;
      throw error;
    }

    // Fetch updated balance
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      const error = new Error(profileError?.message || 'Could not load updated balance.');
      error.status = 500;
      throw error;
    }

    res.json({
      order: orderData,
      balance: Number(profile.balance),
      reDownload: isReDownload,
    });
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    res.status(status).json({ message: error?.message || 'Unable to create order' });
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

ordersRouter.patch('/:taskId', async (req, res) => {
  try {
    const user = await requireUserFromAuthHeader(req);
    req.user = user;
    const client = ensureSupabase();
    const { taskId } = req.params;

    // Get the current order to ensure it belongs to the user
    const { data: existingOrder, error: fetchError } = await client
      .from('stock_order')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!existingOrder) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Update the order with the provided fields
    const allowedFields = ['status', 'file_info', 'download_url'];
    const updates = {};

    for (const field of allowedFields) {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'No valid fields to update' });
      return;
    }

    const { data, error: updateError } = await client
      .from('stock_order')
      .update(updates)
      .eq('user_id', user.id)
      .eq('task_id', taskId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json({ order: data });
  } catch (error) {
    const status = typeof error?.status === 'number' ? error.status : 500;
    res.status(status).json({ message: error?.message || 'Unable to update order' });
  }
});

export { ordersRouter };
