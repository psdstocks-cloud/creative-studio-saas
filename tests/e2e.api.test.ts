// tests/e2e.api.test.ts
import { describe, it, expect } from 'vitest';
import { request } from 'undici';

const BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const SHUTTERSTOCK_ID = process.env.TEST_STOCK_ID || '1736456369';
const BEARER = process.env.API_BEARER || '';

async function readAll(stream: any) {
  let total = 0;
  for await (const chunk of stream) {
    if (chunk == null) continue;
    if (Buffer.isBuffer(chunk)) {
      total += chunk.length;
    } else {
      const str = typeof chunk === 'string' ? chunk : String(chunk);
      total += Buffer.byteLength(str);
    }
  }
  return total;
}

describe('API E2E', () => {
  it('GET /api/stockinfo/shutterstock/:id → 200 and non-empty body', async () => {
    const url = `${BASE}/api/stockinfo/shutterstock/${encodeURIComponent(SHUTTERSTOCK_ID)}`;
    const { statusCode, headers, body } = await request(url, { method: 'GET' });

    expect(statusCode).toBe(200);

    const size = await readAll(body);
    expect(size).toBeGreaterThan(0);

    const contentEncoding = headers['content-encoding'];
    expect(typeof contentEncoding === 'undefined' || typeof contentEncoding === 'string').toBe(true);
  });

  it('GET /api/orders without auth → 401', async () => {
    const { statusCode } = await request(`${BASE}/api/orders`, { method: 'GET' });
    expect([401, 403]).toContain(statusCode);
  });

  (BEARER ? it : it.skip)('GET /api/orders with bearer → 200', async () => {
    const { statusCode, body } = await request(`${BASE}/api/orders`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${BEARER}` },
    });
    expect(statusCode).toBe(200);

    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      chunks.push(buf);
    }
    const payload = Buffer.concat(chunks).toString('utf8');
    const json = JSON.parse(payload);
    expect(json).toHaveProperty('orders');
    expect(Array.isArray(json.orders)).toBe(true);
  });
});
