
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

const STOCK_API_BASE_URL = process.env.STOCK_API_BASE_URL || 'https://nehtw.com/api';
const STOCK_API_KEY = process.env.STOCK_API_KEY;
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'css_bff_session';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8); // 8 hours by default
const SESSION_REFRESH_THRESHOLD_MS = Number(process.env.SESSION_REFRESH_THRESHOLD_MS || 1000 * 60 * 30); // 30 minutes
const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || path.join(__dirname, 'logs', 'audit.log');
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120);
const RATE_LIMIT_ADMIN_MAX_REQUESTS = Number(process.env.RATE_LIMIT_ADMIN_MAX_REQUESTS || 60);
const ADMIN_DEFAULT_LIMIT = Number(process.env.ADMIN_DEFAULT_LIMIT || 50);
const ADMIN_MAX_LIMIT = Number(process.env.ADMIN_MAX_LIMIT || 200);
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  null;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  null;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';
const ALLOW_UNVERIFIED_JWT =
  String(process.env.ALLOW_UNVERIFIED_JWT || '').toLowerCase() === 'true' ||
  (!IS_PROD && (!SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_URL));

if (!STOCK_API_KEY) {
  console.warn(
    '⚠️  STOCK_API_KEY is not set. API proxy requests will fail until the key is configured.'
  );
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '⚠️  Supabase service credentials are missing. The BFF will be unable to verify access tokens.'
  );
}

if (!process.env.SESSION_SECRET) {
  console.warn(
    '⚠️  SESSION_SECRET is not configured. A random secret will be generated at startup, which invalidates sessions on every restart.'
  );
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

const sessionStore = new Map();

const ensureDirectory = (dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    console.error('Failed to create directory:', dirPath, error);
  }
};

const auditLogDir = path.dirname(AUDIT_LOG_PATH);
ensureDirectory(auditLogDir);

const auditStream = fs.createWriteStream(AUDIT_LOG_PATH, { flags: 'a' });

const writeAuditEntry = (entry) => {
  const payload = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  try {
    auditStream.write(`${JSON.stringify(payload)}\n`);
  } catch (error) {
    console.error('Failed to write audit log entry', error);
  }
};

const normalizeRoleInput = (input) => {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .map((role) => (typeof role === 'string' ? role : String(role)))
      .map((role) => role.trim())
      .filter(Boolean);
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
  }

  return [String(input)];
};

const normalizeRoles = (rawRoles) => {
  const normalized = new Set(
    normalizeRoleInput(rawRoles).map((role) => role.toLowerCase())
  );

  normalized.add('user');

  return Array.from(normalized);
};

const mapSupabaseUserToSessionUser = (supabaseUser) => {
  if (!supabaseUser) {
    return null;
  }

  const roles = new Set([
    ...normalizeRoles(supabaseUser.app_metadata?.roles || supabaseUser.app_metadata?.role),
    ...normalizeRoles(supabaseUser.user_metadata?.roles || supabaseUser.user_metadata?.role),
  ]);

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || 'unknown',
    roles: Array.from(roles),
    metadata: {
      fullName: supabaseUser.user_metadata?.full_name || null,
    },
  };
};

const parseCookies = (cookieHeader) => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((acc, rawCookie) => {
    const [name, ...rest] = rawCookie.split('=');
    if (!name) {
      return acc;
    }
    const trimmedName = name.trim();
    const value = rest.join('=');
    acc[trimmedName] = decodeURIComponent(value?.trim() || '');
    return acc;
  }, {});
};

const buildSessionCookie = (sessionId, { expiresAt, isDeletion = false } = {}) => {
  const parts = [`${SESSION_COOKIE_NAME}=${isDeletion ? '' : encodeURIComponent(sessionId)}`];
  parts.push('Path=/');
  parts.push('HttpOnly');
  parts.push('SameSite=Lax');

  if (IS_PROD) {
    parts.push('Secure');
  }

  if (isDeletion) {
    parts.push('Max-Age=0');
    parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  } else if (expiresAt) {
    const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
    parts.push(`Max-Age=${maxAge}`);
  }

  return parts.join('; ');
};

const createSession = (user) => {
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  sessionStore.set(sessionId, {
    id: sessionId,
    user,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  });

  return sessionStore.get(sessionId);
};

const refreshSession = (session) => {
  const now = Date.now();
  const shouldRefresh = session.expiresAt - now < SESSION_REFRESH_THRESHOLD_MS;
  if (shouldRefresh) {
    session.expiresAt = now + SESSION_TTL_MS;
  }
  session.updatedAt = now;
  return shouldRefresh;
};

const destroySession = (sessionId) => {
  sessionStore.delete(sessionId);
};

const cleanExpiredSessions = () => {
  const now = Date.now();
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.expiresAt <= now) {
      sessionStore.delete(sessionId);
    }
  }
};

setInterval(cleanExpiredSessions, Math.max(SESSION_TTL_MS / 2, 60_000)).unref();

const createRateLimiter = ({ windowMs, max }) => {
  const buckets = new Map();

  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      res.status(429).json({
        message: 'Too many requests. Please slow down.',
        retryAfterMs: bucket.resetAt - now,
      });
      return;
    }

    next();
  };
};

const generalRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
});

const adminRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_ADMIN_MAX_REQUESTS,
});

const supabaseAdminClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'creative-studio-saas-bff',
        },
      },
    })
  : null;

const ensureSupabaseAdminClient = () => {
  if (!supabaseAdminClient) {
    const error = new Error(
      'Supabase service credentials are not configured. Admin APIs are unavailable.'
    );
    error.status = 500;
    throw error;
  }
  return supabaseAdminClient;
};

const parseNumberSafe = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeAuditEntry = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  return {
    timestamp: raw.timestamp || null,
    action: raw.action || 'unknown',
    actor: raw.actor || null,
    method: raw.method || null,
    path: raw.path || null,
    status: typeof raw.status === 'number' ? raw.status : null,
    metadata: raw.metadata || {},
    requestId: raw.requestId || null,
    durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : null,
  };
};

const readAuditLogEntries = async (limit = 50) => {
  try {
    const raw = await fs.promises.readFile(AUDIT_LOG_PATH, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    const slice = lines.slice(Math.max(lines.length - limit, 0));
    return slice
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.error('Failed to parse audit log line', error);
          return null;
        }
      })
      .filter(Boolean)
      .map(normalizeAuditEntry)
      .filter(Boolean)
      .reverse();
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    console.error('Failed to read audit log entries', error);
    throw error;
  }
};

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload =
      normalizedPayload + '==='.slice((normalizedPayload.length + 3) % 4);

    const decoded = Buffer.from(paddedPayload, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode JWT payload', error);
    return null;
  }
};

const verifySupabaseAccessToken = async (accessToken) => {
  if (supabaseAdminClient) {
    try {
      const { data, error } = await supabaseAdminClient.auth.getUser(accessToken);

      if (error) {
        console.error('Failed to verify Supabase access token', error);
        return null;
      }

      return mapSupabaseUserToSessionUser(data?.user || null);
    } catch (error) {
      console.error('Unexpected error verifying Supabase access token', error);
      return null;
    }
  }

  if (!ALLOW_UNVERIFIED_JWT) {
    return null;
  }

  const payload = decodeJwtPayload(accessToken);

  if (!payload) {
    return null;
  }

  console.warn(
    '⚠️  Using unverified JWT payload to create a session. Enable SUPABASE_SERVICE_ROLE_KEY to enforce signature validation.'
  );

  return mapSupabaseUserToSessionUser({
    id: payload.sub,
    email: payload.email,
    app_metadata: payload.app_metadata || {},
    user_metadata: payload.user_metadata || {},
  });
};

const assignRequestId = (req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;
  console.info(`[${req.requestId}] ➡️  ${method} ${originalUrl}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.info(
      `[${req.requestId}] ⬅️  ${res.statusCode} ${method} ${originalUrl} (${duration}ms)`
    );
  });

  next();
};

const attachSession = async (req, res, next) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = cookies[SESSION_COOKIE_NAME];

    if (sessionId && sessionStore.has(sessionId)) {
      const session = sessionStore.get(sessionId);
      if (session.expiresAt <= Date.now()) {
        destroySession(sessionId);
      } else {
        req.session = session;
        req.user = session.user;
        if (refreshSession(session)) {
          res.append('Set-Cookie', buildSessionCookie(session.id, { expiresAt: session.expiresAt }));
        }
      }
    }

    if (!req.user) {
      const authHeader = req.headers['authorization'];
      const bearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : null;

      if (bearerToken) {
        const verifiedUser = await verifySupabaseAccessToken(bearerToken);
        if (verifiedUser) {
          const session = createSession(verifiedUser);
          req.session = session;
          req.user = session.user;
          res.append('Set-Cookie', buildSessionCookie(session.id, { expiresAt: session.expiresAt }));
          writeAuditEntry({
            requestId: req.requestId,
            action: 'auth.session.created',
            actor: { id: verifiedUser.id, email: verifiedUser.email, roles: verifiedUser.roles },
            method: req.method,
            path: req.originalUrl,
            metadata: { type: 'bearer-exchange' },
          });
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }
  next();
};

const hasRequiredRole = (userRoles, requiredRoles) => {
  const normalizedUserRoles = new Set((userRoles || []).map((role) => role.toLowerCase()));

  if (normalizedUserRoles.has('superadmin')) {
    return true;
  }

  return requiredRoles.some((role) => normalizedUserRoles.has(role.toLowerCase()));
};

const requireRole = (...roles) => {
  const requiredRoles = roles.length > 0 ? roles : ['admin'];

  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (!hasRequiredRole(req.user.roles || [], requiredRoles)) {
      res.status(403).json({ message: 'You do not have permission to perform this action.' });
      return;
    }

    next();
  };
};

const extractAuditReason = (req) => {
  const headerReason = req.headers['x-audit-reason'];
  if (typeof headerReason === 'string' && headerReason.trim().length > 0) {
    return headerReason.trim();
  }

  if (req.body && typeof req.body.reason === 'string' && req.body.reason.trim().length > 0) {
    const reason = req.body.reason.trim();
    delete req.body.reason;
    return reason;
  }

  return null;
};

const requireAuditReason = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  const reason = extractAuditReason(req);

  if (!reason) {
    res.status(400).json({
      message: 'An audit reason is required for this action. Provide it via the X-Audit-Reason header or in the request body as "reason".',
    });
    return;
  }

  req.auditReason = reason;
  next();
};

const audit = (action, buildResource = () => ({})) => (req, res, next) => {
  const start = Date.now();
  const requestId = req.requestId;

  res.on('finish', () => {
    const actor = req.user
      ? {
          id: req.user.id,
          email: req.user.email,
          roles: req.user.roles,
        }
      : null;

    const resource = typeof buildResource === 'function' ? buildResource(req, res) : buildResource;

    writeAuditEntry({
      requestId,
      action,
      actor,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      metadata: {
        auditReason: req.auditReason || null,
        ...((req.auditMetadata && typeof req.auditMetadata === 'object') ? req.auditMetadata : {}),
        resource,
      },
    });
  });

  next();
};

// ---------------------------------------------------------------------------
// Application middleware
// ---------------------------------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(assignRequestId);
app.use(requestLogger);
app.use(attachSession);
app.use('/api', generalRateLimiter);

// ---------------------------------------------------------------------------
// Authentication endpoints
// ---------------------------------------------------------------------------

app.get('/api/auth/session', requireAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      roles: req.user.roles,
      metadata: req.user.metadata || {},
    },
  });
});

app.delete('/api/auth/session', requireAuth, (req, res) => {
  if (req.session) {
    destroySession(req.session.id);
  }

  res.append('Set-Cookie', buildSessionCookie('', { isDeletion: true }));

  writeAuditEntry({
    requestId: req.requestId,
    action: 'auth.session.destroyed',
    actor: {
      id: req.user.id,
      email: req.user.email,
      roles: req.user.roles,
    },
    method: req.method,
    path: req.originalUrl,
    status: 204,
  });

  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Admin router with RBAC + auditing
// ---------------------------------------------------------------------------

const adminRouter = express.Router();

adminRouter.use(requireAuth, requireRole('admin', 'ops', 'support', 'finance', 'superadmin'));
adminRouter.use(adminRateLimiter);

adminRouter.get(
  '/health',
  audit('admin.health', () => ({ type: 'health-check' })),
  (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    });
  }
);

adminRouter.post(
  '/audit-test',
  requireAuditReason,
  audit('admin.audit-test', (req) => ({ description: 'Audit logging diagnostic' })),
  (req, res) => {
    res.json({
      message: 'Audit trail recorded.',
      requestId: req.requestId,
      auditReason: req.auditReason,
    });
  }
);

adminRouter.get(
  '/dashboard',
  audit('admin.dashboard.summary', () => ({ resource: 'dashboard' })),
  async (req, res) => {
    try {
      const client = ensureSupabaseAdminClient();
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [orders24h, processingOrders, spendWindow, recentOrders, auditEntries] = await Promise.all([
        client
          .from('stock_order')
          .select('id, file_info, status, created_at')
          .gte('created_at', twentyFourHoursAgo),
        client
          .from('stock_order')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing'),
        client
          .from('stock_order')
          .select('file_info, created_at')
          .gte('created_at', thirtyDaysAgo),
        client
          .from('stock_order')
          .select('id, task_id, file_info, status, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
        readAuditLogEntries(20),
      ]);

      if (orders24h.error) {
        throw orders24h.error;
      }
      if (processingOrders.error) {
        throw processingOrders.error;
      }
      if (spendWindow.error) {
        throw spendWindow.error;
      }
      if (recentOrders.error) {
        throw recentOrders.error;
      }

      const totalSpend30d = (spendWindow.data || []).reduce((total, record) => {
        const info = record.file_info || {};
        const cost = parseNumberSafe(info.cost ?? info.price ?? info.amount ?? info.total);
        return total + cost;
      }, 0);

      const ordersBySite = new Map();
      (orders24h.data || []).forEach((record) => {
        const site = record.file_info?.site || 'unknown';
        const current = ordersBySite.get(site) || 0;
        ordersBySite.set(site, current + 1);
      });

      const topSites = Array.from(ordersBySite.entries())
        .map(([site, count]) => ({ site, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      res.json({
        summary: {
          ordersLast24h: (orders24h.data || []).length,
          processingOrders: processingOrders.count || 0,
          totalSpend30d,
        },
        topSites,
        recentOrders: recentOrders.data || [],
        recentAudit: auditEntries,
      });
    } catch (error) {
      console.error('Failed to load admin dashboard', error);
      res.status(error?.status || 500).json({ message: 'Unable to load dashboard data.' });
    }
  }
);

adminRouter.get(
  '/orders',
  audit('admin.orders.list', () => ({ resource: 'orders' })),
  async (req, res) => {
    try {
      const client = ensureSupabaseAdminClient();
      const {
        status,
        site,
        search,
        limit: limitParam,
        cursor,
      } = req.query;

      const limit = Math.min(
        Math.max(Number(limitParam) || ADMIN_DEFAULT_LIMIT, 1),
        ADMIN_MAX_LIMIT
      );

      let query = client
        .from('stock_order')
        .select('id, created_at, user_id, task_id, status, download_url, file_info')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cursor && typeof cursor === 'string') {
        query = query.lt('created_at', new Date(cursor).toISOString());
      }

      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      if (site && typeof site === 'string') {
        query = query.eq('file_info->>site', site);
      }

      if (search && typeof search === 'string' && search.trim().length > 0) {
        const normalized = `%${search.trim()}%`;
        query = query.or(
          [
            `task_id.ilike.${normalized}`,
            `user_id.ilike.${normalized}`,
            `file_info->>title.ilike.${normalized}`,
            `file_info->>name.ilike.${normalized}`,
            `file_info->>source_url.ilike.${normalized}`,
          ].join(',')
        );
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }

      res.json({ orders: data || [] });
    } catch (error) {
      console.error('Failed to load admin orders', error);
      res.status(error?.status || 500).json({ message: 'Unable to load orders.' });
    }
  }
);

adminRouter.get(
  '/orders/:taskId',
  audit('admin.orders.detail', (req) => ({ taskId: req.params.taskId })),
  async (req, res) => {
    try {
      const client = ensureSupabaseAdminClient();
      const { taskId } = req.params;
      const { data, error } = await client
        .from('stock_order')
        .select('id, created_at, user_id, task_id, status, download_url, file_info')
        .eq('task_id', taskId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        res.status(404).json({ message: 'Order not found.' });
        return;
      }

      res.json({ order: data });
    } catch (error) {
      console.error('Failed to load admin order detail', error);
      res.status(error?.status || 500).json({ message: 'Unable to load order detail.' });
    }
  }
);

adminRouter.get(
  '/orders/:taskId/status',
  audit('admin.orders.status', (req) => ({ taskId: req.params.taskId })),
  async (req, res) => {
    if (!STOCK_API_KEY) {
      res.status(500).json({ message: 'Server is missing STOCK_API_KEY configuration.' });
      return;
    }

    try {
      const { taskId } = req.params;
      const targetUrl = `${STOCK_API_BASE_URL}/order/${encodeURIComponent(taskId)}/status`;
      const upstreamResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'X-Api-Key': STOCK_API_KEY },
      });

      const data = await upstreamResponse.json().catch(() => null);
      res.status(upstreamResponse.status).json(data ?? { message: 'Unable to load order status.' });
    } catch (error) {
      console.error('Failed to fetch upstream order status', error);
      res.status(502).json({ message: 'Unable to reach upstream order status endpoint.' });
    }
  }
);

adminRouter.post(
  '/orders/:taskId/regenerate',
  requireAuditReason,
  audit('admin.orders.regenerate-download', (req) => ({ taskId: req.params.taskId })),
  async (req, res) => {
    if (!STOCK_API_KEY) {
      res.status(500).json({ message: 'Server is missing STOCK_API_KEY configuration.' });
      return;
    }

    try {
      const { taskId } = req.params;
      const targetUrl = `${STOCK_API_BASE_URL}/v2/order/${encodeURIComponent(taskId)}/download`;
      const upstreamResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'X-Api-Key': STOCK_API_KEY },
      });

      const payload = await upstreamResponse.json().catch(() => null);

      if (!upstreamResponse.ok) {
        const message = payload?.message || 'Failed to regenerate download link.';
        res.status(upstreamResponse.status).json({ message });
        return;
      }

      const downloadUrl =
        payload?.downloadLink ||
        payload?.download_url ||
        payload?.url ||
        payload?.link ||
        payload?.data?.downloadLink ||
        payload?.data?.download_url ||
        payload?.data?.url ||
        null;

      req.auditMetadata = {
        ...(req.auditMetadata || {}),
        downloadUrl,
      };

      try {
        const client = ensureSupabaseAdminClient();
        await client
          .from('stock_order')
          .update({ download_url: downloadUrl })
          .eq('task_id', taskId);
      } catch (error) {
        console.error('Failed to persist regenerated download URL', error);
      }

      res.json({ download: payload });
    } catch (error) {
      console.error('Failed to regenerate download link', error);
      res.status(502).json({ message: 'Unable to regenerate download link.' });
    }
  }
);

adminRouter.get(
  '/users',
  audit('admin.users.list', () => ({ resource: 'users' })),
  async (req, res) => {
    try {
      const client = ensureSupabaseAdminClient();
      const page = Math.max(Number(req.query.page) || 1, 1);
      const perPage = Math.min(Math.max(Number(req.query.perPage) || 25, 1), 100);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      const { data, error } = await client.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw error;
      }

      let users = data?.users || [];
      if (search) {
        const needle = search.toLowerCase();
        users = users.filter((user) =>
          (user.email || '').toLowerCase().includes(needle)
        );
      }

      const userIds = users.map((user) => user.id);

      const [{ data: profiles, error: profilesError }, { data: orderRows, error: orderError }] = await Promise.all([
        client
          .from('profiles')
          .select('id, balance, updated_at')
          .in('id', userIds),
        client
          .from('stock_order')
          .select('user_id, status')
          .in('user_id', userIds),
      ]);

      if (profilesError) {
        throw profilesError;
      }

      if (orderError) {
        throw orderError;
      }

      const profileMap = new Map();
      (profiles || []).forEach((profile) => {
        profileMap.set(profile.id, profile);
      });

      const orderStats = new Map();
      (orderRows || []).forEach((order) => {
        const stats = orderStats.get(order.user_id) || {
          total: 0,
          ready: 0,
          failed: 0,
          processing: 0,
        };
        stats.total += 1;
        if (order.status === 'ready') {
          stats.ready += 1;
        } else if (order.status === 'processing') {
          stats.processing += 1;
        } else {
          stats.failed += 1;
        }
        orderStats.set(order.user_id, stats);
      });

      const normalizedUsers = users.map((user) => {
        const profile = profileMap.get(user.id);
        const roles = normalizeRoles(
          user.app_metadata?.roles || user.user_metadata?.roles || user.app_metadata?.role || user.user_metadata?.role
        );

        return {
          id: user.id,
          email: user.email,
          roles,
          lastSignInAt: user.last_sign_in_at,
          createdAt: user.created_at,
          metadata: user.user_metadata || {},
          balance: profile ? parseNumberSafe(profile.balance) : 0,
          updatedAt: profile?.updated_at || null,
          orderStats: orderStats.get(user.id) || { total: 0, ready: 0, failed: 0, processing: 0 },
        };
      });

      res.json({
        users: normalizedUsers,
        pagination: {
          page,
          perPage,
          total: data?.total || normalizedUsers.length,
        },
      });
    } catch (error) {
      console.error('Failed to load admin users', error);
      res.status(error?.status || 500).json({ message: 'Unable to load users.' });
    }
  }
);

adminRouter.post(
  '/users/:userId/balance',
  requireAuditReason,
  audit('admin.users.adjust-balance', (req) => ({ userId: req.params.userId })),
  async (req, res) => {
    try {
      const client = ensureSupabaseAdminClient();
      const { userId } = req.params;
      const amount = parseNumberSafe(req.body?.amount);

      if (!Number.isFinite(amount) || amount === 0) {
        res.status(400).json({ message: 'Adjustment amount must be a non-zero number.' });
        return;
      }

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('id, balance')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const currentBalance = parseNumberSafe(profile?.balance);
      const nextBalance = currentBalance + amount;

      if (profile) {
        const { error } = await client
          .from('profiles')
          .update({ balance: nextBalance, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await client.from('profiles').insert({
          id: userId,
          balance: nextBalance,
          updated_at: new Date().toISOString(),
        });

        if (error) {
          throw error;
        }
      }

      req.auditMetadata = {
        ...(req.auditMetadata || {}),
        amount,
        resultingBalance: nextBalance,
      };

      res.json({
        balance: nextBalance,
      });
    } catch (error) {
      console.error('Failed to adjust user balance', error);
      res.status(error?.status || 500).json({ message: 'Unable to adjust balance.' });
    }
  }
);

adminRouter.get(
  '/audit/logs',
  audit('admin.audit.logs', () => ({ resource: 'audit-log' })),
  async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    try {
      const entries = await readAuditLogEntries(limit);
      res.json({ entries });
    } catch (error) {
      res.status(500).json({ message: 'Unable to read audit log.' });
    }
  }
);

adminRouter.get(
  '/files',
  audit('admin.files.list', () => ({ resource: 'files' })),
  async (req, res) => {
    try {
      const client = ensureSupabaseAdminClient();
      const { data, error } = await client
        .from('stock_order')
        .select('id, task_id, user_id, file_info, download_url, created_at, status')
        .neq('download_url', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      res.json({ files: data || [] });
    } catch (error) {
      console.error('Failed to load files', error);
      res.status(error?.status || 500).json({ message: 'Unable to load files.' });
    }
  }
);

adminRouter.get(
  '/stock-sources',
  audit('admin.stock-sources.list', () => ({ resource: 'stock-sources' })),
  async (_req, res) => {
    if (!STOCK_API_KEY) {
      res.status(500).json({ message: 'Server is missing STOCK_API_KEY configuration.' });
      return;
    }

    try {
      const targetUrl = `${STOCK_API_BASE_URL}/stocksites`;
      const upstreamResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'X-Api-Key': STOCK_API_KEY },
      });

      const payload = await upstreamResponse.json().catch(() => null);
      res.status(upstreamResponse.status).json(payload ?? { sites: [] });
    } catch (error) {
      console.error('Failed to load stock sources', error);
      res.status(502).json({ message: 'Unable to load stock source catalog.' });
    }
  }
);

adminRouter.get(
  '/ai/jobs/:jobId',
  audit('admin.ai.jobs.detail', (req) => ({ jobId: req.params.jobId })),
  async (req, res) => {
    if (!STOCK_API_KEY) {
      res.status(500).json({ message: 'Server is missing STOCK_API_KEY configuration.' });
      return;
    }

    try {
      const { jobId } = req.params;
      const targetUrl = `${STOCK_API_BASE_URL}/aig/public/${encodeURIComponent(jobId)}`;
      const upstreamResponse = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'X-Api-Key': STOCK_API_KEY },
      });
      const payload = await upstreamResponse.json().catch(() => null);
      res.status(upstreamResponse.status).json(payload ?? { message: 'Unable to load AI job.' });
    } catch (error) {
      console.error('Failed to fetch AI job detail', error);
      res.status(502).json({ message: 'Unable to load AI job.' });
    }
  }
);

adminRouter.get(
  '/ai/activity',
  audit('admin.ai.jobs.activity', () => ({ resource: 'ai-activity' })),
  async (_req, res) => {
    try {
      const entries = await readAuditLogEntries(100);
      const aiEntries = entries.filter((entry) =>
        typeof entry?.path === 'string' && entry.path.includes('/aig/')
      );
      res.json({ events: aiEntries });
    } catch (error) {
      console.error('Failed to load AI activity', error);
      res.status(500).json({ message: 'Unable to load AI activity.' });
    }
  }
);

adminRouter.get(
  '/settings',
  audit('admin.settings.get', () => ({ resource: 'settings' })),
  async (_req, res) => {
    res.json({
      polling: {
        minimumIntervalMs: 2000,
      },
      rateLimits: {
        windowMs: RATE_LIMIT_WINDOW_MS,
        generalMaxRequests: RATE_LIMIT_MAX_REQUESTS,
        adminMaxRequests: RATE_LIMIT_ADMIN_MAX_REQUESTS,
      },
      session: {
        ttlMs: SESSION_TTL_MS,
        refreshThresholdMs: SESSION_REFRESH_THRESHOLD_MS,
      },
      auditLogPath: AUDIT_LOG_PATH,
    });
  }
);

app.use('/api/admin', adminRouter);

// ---------------------------------------------------------------------------
// Upstream API proxy with RBAC-aware auditing
// ---------------------------------------------------------------------------

const proxyAuditResource = (req) => ({
  upstream: req.proxyTargetUrl,
  method: req.method,
});

app.use('/api', async (req, res, next) => {
  if (!STOCK_API_KEY) {
    res.status(500).json({ message: 'Server is missing STOCK_API_KEY configuration.' });
    return;
  }

  const upstreamPath = req.originalUrl.replace(/^\/api/, '');
  const targetUrl = `${STOCK_API_BASE_URL}${upstreamPath}`;
  req.proxyTargetUrl = targetUrl;

  try {
    const method = req.method || 'GET';
    const headers = new Headers();
    headers.set('X-Api-Key', STOCK_API_KEY);

    const contentType = req.headers['content-type'];
    if (contentType) {
      headers.set('Content-Type', Array.isArray(contentType) ? contentType[0] : contentType);
    }

    if (req.user) {
      headers.set('X-Actor-Id', req.user.id);
      headers.set('X-Actor-Email', req.user.email);
      headers.set('X-Actor-Roles', (req.user.roles || []).join(','));
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

    const shouldAudit = req.user && method && method.toUpperCase() !== 'GET';

    if (shouldAudit) {
      writeAuditEntry({
        requestId: req.requestId,
        action: 'proxy.upstream.mutation',
        actor: {
          id: req.user.id,
          email: req.user.email,
          roles: req.user.roles,
        },
        method,
        path: req.originalUrl,
        status: upstreamResponse.status,
        metadata: {
          resource: proxyAuditResource(req),
          auditReason: req.auditReason || null,
        },
      });
    }

    res.status(upstreamResponse.status).send(responseText);
  } catch (error) {
    console.error('Error proxying API request:', error);
    res.status(502).json({ message: 'Upstream API request failed.' });
  }
});

// ---------------------------------------------------------------------------
// Static assets & SPA fallback
// ---------------------------------------------------------------------------

const buildPath = path.join(__dirname, 'dist');

app.use(express.static(buildPath));

app.get('/*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('An error occurred');
    }
  });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, req, res, _next) => {
  console.error(`[${req.requestId}] Unhandled error`, err);
  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    message: 'Internal server error',
    requestId: req.requestId,
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Serving static files from: ${buildPath}`);
  console.log(`Audit log located at: ${AUDIT_LOG_PATH}`);
});
