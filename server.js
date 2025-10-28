import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const STOCK_API_BASE_URL = process.env.STOCK_API_BASE_URL || 'https://nehtw.com/api';
const STOCK_API_KEY = process.env.STOCK_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const isAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!STOCK_API_KEY) {
  console.warn(
    '⚠️  STOCK_API_KEY is not set. API proxy requests will fail until the key is configured.'
  );
}

if (!isAuthConfigured) {
  console.warn('⚠️  SUPABASE_URL or SUPABASE_ANON_KEY is missing. Auth endpoints will be disabled.');
}

const ACCESS_TOKEN_COOKIE = 'sb-access-token';
const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';
const isProduction = process.env.NODE_ENV === 'production';

const sharedCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/',
};

const parseCookies = (cookieHeader = '') => {
  return cookieHeader
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex === -1) {
        return acc;
      }
      const key = pair.substring(0, separatorIndex);
      const value = pair.substring(separatorIndex + 1);
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, sharedCookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, sharedCookieOptions);
};

const setAuthCookies = (res, session) => {
  if (!session?.access_token || !session?.refresh_token) {
    return;
  }

  const accessTokenMaxAgeMs = session.expires_in
    ? Math.max(session.expires_in - 60, 0) * 1000
    : 60 * 60 * 1000;

  res.cookie(ACCESS_TOKEN_COOKIE, session.access_token, {
    ...sharedCookieOptions,
    maxAge: accessTokenMaxAgeMs,
  });

  const refreshTokenMaxAgeMs = 60 * 24 * 60 * 60 * 1000;
  res.cookie(REFRESH_TOKEN_COOKIE, session.refresh_token, {
    ...sharedCookieOptions,
    maxAge: refreshTokenMaxAgeMs,
  });
};

const ensureAuthConfigured = (res) => {
  if (isAuthConfigured) {
    return true;
  }

  res.status(500).json({ message: 'Authentication is not configured.' });
  return false;
};

const createSupabaseAuthClient = () => {
  if (!isAuthConfigured) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const createSupabaseClientWithAccessToken = (accessToken) => {
  if (!isAuthConfigured || !accessToken) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

const getSessionFromCookies = async (req, res) => {
  if (!isAuthConfigured) {
    return null;
  }

  const cookies = parseCookies(req.headers.cookie || '');
  const accessToken = cookies[ACCESS_TOKEN_COOKIE];
  const refreshToken = cookies[REFRESH_TOKEN_COOKIE];

  if (!accessToken) {
    return null;
  }

  const supabaseAuth = createSupabaseAuthClient();
  if (!supabaseAuth) {
    return null;
  }

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);

  if (!error && data?.user) {
    return {
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      user: data.user,
    };
  }

  if (refreshToken) {
    const { data: refreshData, error: refreshError } = await supabaseAuth.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (!refreshError && refreshData?.session) {
      setAuthCookies(res, refreshData.session);
      return {
        session: {
          access_token: refreshData.session.access_token,
          refresh_token: refreshData.session.refresh_token,
        },
        user: refreshData.session.user,
      };
    }
  }

  clearAuthCookies(res);
  return null;
};

const fetchOrCreateProfile = async (accessToken, userId) => {
  const supabaseClient = createSupabaseClientWithAccessToken(accessToken);

  if (!supabaseClient) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single();

  if (!error && data) {
    return data;
  }

  if (error && error.code === 'PGRST116') {
    const { data: inserted, error: insertError } = await supabaseClient
      .from('profiles')
      .insert({ id: userId, balance: 100 })
      .select('balance')
      .single();

    if (insertError) {
      throw insertError;
    }

    return inserted;
  }

  throw error;
};

const apiRouter = express.Router();

apiRouter.use(express.json());
apiRouter.use(express.urlencoded({ extended: true }));

const proxyStockRequest = async (req, res) => {
  if (!STOCK_API_KEY) {
    res.status(500).json({ message: 'Server is missing STOCK_API_KEY configuration.' });
    return;
  }

  const upstreamPath = req.originalUrl.replace(/^\/api/, '');
  const targetUrl = `${STOCK_API_BASE_URL}${upstreamPath}`;

  try {
    const method = req.method || 'GET';
    const headers = new Headers();
    headers.set('X-Api-Key', STOCK_API_KEY);

    const contentType = req.headers['content-type'];
    if (contentType) {
      headers.set('Content-Type', Array.isArray(contentType) ? contentType[0] : contentType);
    }

    let body;
    if (!['GET', 'HEAD'].includes(method.toUpperCase()) && req.body && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
      headers.set('Content-Type', 'application/json');
    }

    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const responseText = await upstreamResponse.text();

    upstreamResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-length') {
        return;
      }
      res.setHeader(key, value);
    });

    res.status(upstreamResponse.status).send(responseText);
  } catch (error) {
    console.error('Error proxying API request:', error);
    res.status(502).json({ message: 'Upstream API request failed.' });
  }
};

const requireSession = async (req, res) => {
  const session = await getSessionFromCookies(req, res);

  if (!session) {
    res.status(401).json({ message: 'Not authenticated.' });
    return null;
  }

  return session;
};

apiRouter.post('/auth/session/from-link', async (req, res) => {
  if (!ensureAuthConfigured(res)) {
    return;
  }

  const { accessToken, refreshToken, expiresIn } = req.body || {};

  if (!accessToken || !refreshToken) {
    res.status(400).json({ message: 'Missing tokens in request body.' });
    return;
  }

  const supabaseAuth = createSupabaseAuthClient();

  if (!supabaseAuth) {
    ensureAuthConfigured(res);
    return;
  }

  const { data, error } = await supabaseAuth.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data?.session) {
    res.status(401).json({ message: error?.message || 'Invalid or expired reset token.' });
    return;
  }

  setAuthCookies(res, {
    ...data.session,
    expires_in: expiresIn || data.session.expires_in,
  });

  res.json({ success: true });
});

apiRouter.get('/auth/session', async (req, res) => {
  const session = await getSessionFromCookies(req, res);

  if (!session) {
    res.json({ user: null });
    return;
  }

  try {
    const profile = await fetchOrCreateProfile(session.session.access_token, session.user.id);
    res.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        balance: Number(profile?.balance ?? 100),
      },
    });
  } catch (error) {
    console.error('Failed to load user profile:', error);
    clearAuthCookies(res);
    res.status(500).json({ message: 'Unable to load user profile.' });
  }
});

apiRouter.post('/auth/signin', async (req, res) => {
  if (!ensureAuthConfigured(res)) {
    return;
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  const supabaseAuth = createSupabaseAuthClient();

  if (!supabaseAuth) {
    ensureAuthConfigured(res);
    return;
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });

  if (error || !data?.session || !data.session.user) {
    res.status(401).json({ message: error?.message || 'Invalid credentials.' });
    return;
  }

  setAuthCookies(res, data.session);

  try {
    const profile = await fetchOrCreateProfile(data.session.access_token, data.session.user.id);
    res.json({
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        balance: Number(profile?.balance ?? 100),
      },
    });
  } catch (profileError) {
    console.error('Failed to fetch profile after sign-in:', profileError);
    clearAuthCookies(res);
    res.status(500).json({ message: 'Unable to load user profile.' });
  }
});

apiRouter.post('/auth/signup', async (req, res) => {
  if (!ensureAuthConfigured(res)) {
    return;
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  const supabaseAuth = createSupabaseAuthClient();

  if (!supabaseAuth) {
    ensureAuthConfigured(res);
    return;
  }

  const { data, error } = await supabaseAuth.auth.signUp({ email, password });

  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  if (data?.session && data.session.user) {
    setAuthCookies(res, data.session);
    try {
      const profile = await fetchOrCreateProfile(data.session.access_token, data.session.user.id);
      res.json({
        user: {
          id: data.session.user.id,
          email: data.session.user.email,
          balance: Number(profile?.balance ?? 100),
        },
      });
      return;
    } catch (profileError) {
      console.error('Failed to create profile after sign-up:', profileError);
      clearAuthCookies(res);
      res.status(500).json({ message: 'Unable to create user profile.' });
      return;
    }
  }

  res.json({ user: null, requiresConfirmation: true });
});

apiRouter.post('/auth/signout', async (req, res) => {
  clearAuthCookies(res);
  res.json({ success: true });
});

apiRouter.post('/auth/reset-password', async (req, res) => {
  if (!ensureAuthConfigured(res)) {
    return;
  }

  const { email } = req.body || {};

  if (!email) {
    res.status(400).json({ message: 'Email is required.' });
    return;
  }

  const supabaseAuth = createSupabaseAuthClient();

  if (!supabaseAuth) {
    ensureAuthConfigured(res);
    return;
  }

  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;

  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/#/reset-password`,
  });

  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  res.json({ success: true });
});

apiRouter.post('/auth/resend-confirmation', async (req, res) => {
  if (!ensureAuthConfigured(res)) {
    return;
  }

  const { email } = req.body || {};

  if (!email) {
    res.status(400).json({ message: 'Email is required.' });
    return;
  }

  const supabaseAuth = createSupabaseAuthClient();

  if (!supabaseAuth) {
    ensureAuthConfigured(res);
    return;
  }

  const { error } = await supabaseAuth.auth.resend({ type: 'signup', email });

  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  res.json({ success: true });
});

apiRouter.post('/auth/update-password', async (req, res) => {
  const session = await requireSession(req, res);

  if (!session) {
    return;
  }

  const { password } = req.body || {};

  if (!password) {
    res.status(400).json({ message: 'Password is required.' });
    return;
  }

  const supabaseClient = createSupabaseClientWithAccessToken(session.session.access_token);

  if (!supabaseClient) {
    ensureAuthConfigured(res);
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({ password });

  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  res.json({ success: true });
});

apiRouter.post('/profile/deduct', async (req, res) => {
  const session = await requireSession(req, res);

  if (!session) {
    return;
  }

  const { amount } = req.body || {};

  if (typeof amount !== 'number' || Number.isNaN(amount) || !Number.isFinite(amount)) {
    res.status(400).json({ message: 'Amount must be a valid number.' });
    return;
  }

  const supabaseClient = createSupabaseClientWithAccessToken(session.session.access_token);

  if (!supabaseClient) {
    ensureAuthConfigured(res);
    return;
  }

  try {
    const profile = await fetchOrCreateProfile(session.session.access_token, session.user.id);
    const currentBalance = Number(profile?.balance ?? 0);
    const newBalance = Math.max(0, currentBalance - amount);

    const { error } = await supabaseClient
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', session.user.id);

    if (error) {
      throw error;
    }

    res.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        balance: newBalance,
      },
    });
  } catch (error) {
    console.error('Failed to deduct points:', error);
    res.status(500).json({ message: 'Could not deduct points.' });
  }
});

apiRouter.get('/orders', async (req, res) => {
  const session = await requireSession(req, res);

  if (!session) {
    return;
  }

  const supabaseClient = createSupabaseClientWithAccessToken(session.session.access_token);

  if (!supabaseClient) {
    ensureAuthConfigured(res);
    return;
  }

  const { data, error } = await supabaseClient
    .from('stock_order')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ message: 'Could not retrieve orders.' });
    return;
  }

  res.json({ orders: data || [] });
});

apiRouter.post('/orders', async (req, res) => {
  const session = await requireSession(req, res);

  if (!session) {
    return;
  }

  const { taskId, fileInfo, sourceUrl } = req.body || {};

  if (!taskId || !fileInfo) {
    res.status(400).json({ message: 'taskId and fileInfo are required.' });
    return;
  }

  const supabaseClient = createSupabaseClientWithAccessToken(session.session.access_token);

  if (!supabaseClient) {
    ensureAuthConfigured(res);
    return;
  }

  const payload = {
    user_id: session.user.id,
    task_id: taskId,
    file_info: { ...fileInfo, source_url: sourceUrl ?? fileInfo?.source_url },
    status: 'processing',
  };

  const { data, error } = await supabaseClient
    .from('stock_order')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    res.status(500).json({ message: `Failed to create order: ${error.message}` });
    return;
  }

  res.json({ order: data });
});

apiRouter.patch('/orders/:taskId', async (req, res) => {
  const session = await requireSession(req, res);

  if (!session) {
    return;
  }

  const { taskId } = req.params;
  const updates = req.body || {};

  if (!taskId) {
    res.status(400).json({ message: 'taskId is required.' });
    return;
  }

  const supabaseClient = createSupabaseClientWithAccessToken(session.session.access_token);

  if (!supabaseClient) {
    ensureAuthConfigured(res);
    return;
  }

  const { error } = await supabaseClient
    .from('stock_order')
    .update(updates)
    .eq('task_id', taskId)
    .eq('user_id', session.user.id);

  if (error) {
    res.status(500).json({ message: 'Failed to update order.' });
    return;
  }

  res.json({ success: true });
});

apiRouter.get('/orders/lookup', async (req, res) => {
  const session = await requireSession(req, res);

  if (!session) {
    return;
  }

  const { site, id } = req.query || {};

  if (!site || !id) {
    res.status(400).json({ message: 'site and id are required.' });
    return;
  }

  const supabaseClient = createSupabaseClientWithAccessToken(session.session.access_token);

  if (!supabaseClient) {
    ensureAuthConfigured(res);
    return;
  }

  const { data, error } = await supabaseClient
    .from('stock_order')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('file_info->>site', site)
    .eq('file_info->>id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    res.status(500).json({ message: 'Failed to lookup order.' });
    return;
  }

  res.json({ order: Array.isArray(data) && data.length > 0 ? data[0] : null });
});

apiRouter.use(proxyStockRequest);

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://nehtw.com",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  next();
});

app.use('/api', apiRouter);

const buildPath = path.join(__dirname, 'dist');
app.use(express.static(buildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('An error occurred');
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Serving static files from: ${buildPath}`);
});
