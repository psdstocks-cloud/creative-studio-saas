/* eslint-env node */

import process from 'node:process';
import { URL } from 'url';
import { request } from 'undici';

const STOCK_UPSTREAM = process.env.STOCK_API_BASE_URL || 'https://nehtw.com/api';
const STOCK_KEY = process.env.STOCK_API_KEY;

const normalizeBase = (base) => {
  if (!base) {
    return 'https://nehtw.com/api/';
  }
  return base.endsWith('/') ? base : `${base}/`;
};

export function buildUpstreamUrl(path, searchParams = {}) {
  const upstreamBase = normalizeBase(STOCK_UPSTREAM);
  const url = new URL(path, upstreamBase);

  const entries = Object.entries(searchParams || {});
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          url.searchParams.append(key, String(item));
        }
      }
      continue;
    }

    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

export function upstreamHeaders(req) {
  const headers = {};
  if (STOCK_KEY) {
    headers['X-Api-Key'] = STOCK_KEY;
  }

  const accept = req.headers.accept;
  if (accept) {
    headers['accept'] = accept;
  }

  const userAgent = req.headers['user-agent'];
  if (userAgent) {
    headers['user-agent'] = userAgent;
  }

  return headers;
}

export async function streamProxy({ url, method = 'GET', req, res }) {
  const upperMethod = method.toUpperCase();
  const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD';

  const upstreamResponse = await request(url, {
    method: upperMethod,
    headers: upstreamHeaders(req),
    body: hasBody ? req : undefined,
    maxRedirections: 0,
  });

  const { statusCode, headers, body } = upstreamResponse;

  for (const [key, value] of Object.entries(headers)) {
    if (!key) continue;
    if (key.toLowerCase() === 'content-length') continue;
    if (key.toLowerCase() === 'transfer-encoding' && value === 'chunked') continue;
    if (value !== undefined) {
      res.setHeader(key, value);
    }
  }

  res.status(statusCode);

  await new Promise((resolve, reject) => {
    const handleError = (err) => {
      cleanup();
      reject(err);
    };

    const handleFinish = () => {
      cleanup();
      resolve();
    };

    const handleClose = () => {
      body.destroy();
      cleanup();
      resolve();
    };

    const cleanup = () => {
      body.off('error', handleError);
      res.off('error', handleError);
      res.off('finish', handleFinish);
      res.off('close', handleClose);
    };

    body.on('error', handleError);
    res.on('error', handleError);
    res.on('finish', handleFinish);
    res.on('close', handleClose);

    body.pipe(res);
  });
}
