// src/server/lib/proxy.js
import { Readable } from 'node:stream';

const STOCK_UPSTREAM = process.env.STOCK_API_BASE_URL || 'https://nehtw.com/api';
const STOCK_KEY = process.env.STOCK_API_KEY || process.env.STOCK_API || process.env.NEHTW_API_KEY;

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : url + '/';
}

/**
 * Build upstream URL (preserves query string)
 */
export function buildUpstreamUrl(path, searchParams = {}) {
  const url = new URL(path, ensureTrailingSlash(STOCK_UPSTREAM));
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Headers to forward to upstream.
 */
export function upstreamHeaders() {
  const headers = new Headers();
  if (STOCK_KEY) {
    headers.set('X-Api-Key', STOCK_KEY);
  }
  return headers;
}

function toWebReadable(req) {
  if (typeof Readable.toWeb !== 'function') {
    throw new Error('Readable.toWeb is unavailable in this Node version');
  }
  return Readable.toWeb(req);
}

/**
 * Stream upstream response back to client.
 * - Do not set Content-Length yourself
 * - Preserve upstream Content-Encoding to avoid decoding errors
 */
export async function streamProxy({ url, method = 'GET', req, res }) {
  const upperMethod = method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(upperMethod);

  const requestInit = {
    method: upperMethod,
    headers: upstreamHeaders(),
  };

  if (hasBody) {
    requestInit.body = toWebReadable(req);
    requestInit.duplex = 'half';
  }

  const upstreamResponse = await fetch(url, requestInit);

  // Copy headers except content-length, CORS headers, and content-encoding
  // - content-length: Node.js will handle this automatically
  // - CORS headers: Our CORS middleware already handles these
  // - content-encoding: fetch API may decode automatically, causing mismatches
  const excludedHeaders = new Set([
    'content-length',
    'access-control-allow-origin',
    'access-control-allow-credentials',
    'access-control-allow-methods',
    'access-control-allow-headers',
    'access-control-expose-headers',
    'access-control-max-age',
    'content-encoding',
    'transfer-encoding',
  ]);

  upstreamResponse.headers.forEach((value, key) => {
    if (!key) return;
    if (excludedHeaders.has(key.toLowerCase())) return;
    res.setHeader(key, value);
  });

  res.status(upstreamResponse.status);

  if (!upstreamResponse.body) {
    res.end();
    return;
  }

  const readable = Readable.fromWeb(upstreamResponse.body);
  readable.pipe(res);
}
