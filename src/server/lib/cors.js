/* eslint-env node */

import process from 'node:process';
import cors from 'cors';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://creative-studio-saas.pages.dev',
  'http://localhost:5173',
];

export function getAllowedOrigins() {
  const configured =
    process.env.CORS_ALLOWED_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    '';

  const parsed = configured
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

export function buildCors() {
  const allowedOrigins = new Set(getAllowedOrigins());
  const allowCredentials = String(process.env.CORS_ALLOW_CREDENTIALS ?? 'true').toLowerCase() === 'true';

  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: allowCredentials,
  });
}
