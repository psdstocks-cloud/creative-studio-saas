// src/server/lib/cors.js
// Lightweight CORS middleware without external dependency.
// Allows configured origins and handles OPTIONS preflight requests.

const DEFAULT_ALLOWED_ORIGINS = [
  'https://creative-studio-saas.pages.dev',
  'http://localhost:5173',
];

function parseAllowedOrigins() {
  const configured = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
}

const ALLOW_CREDENTIALS = String(process.env.CORS_ALLOW_CREDENTIALS ?? 'true').toLowerCase() === 'true';

function setCorsHeaders(res, origin, allowedOrigins) {
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    if (ALLOW_CREDENTIALS) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  } else if (!ALLOW_CREDENTIALS) {
    // Only use wildcard when credentials are NOT required
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // When credentials are required but no origin header is present,
    // use the first allowed origin as a fallback
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Request-ID, X-Audit-Reason'
  );
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID');
}

export function buildCors() {
  const allowed = parseAllowedOrigins();

  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;

    if (!origin || allowed.includes(origin)) {
      setCorsHeaders(res, origin, allowed);
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
      return;
    }

    res.status(403).json({ message: 'Not allowed by CORS: ' + origin });
  };
}

export function getAllowedOrigins() {
  return parseAllowedOrigins();
}
