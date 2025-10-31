// tests/e2e.api.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

const BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const SHUTTERSTOCK_ID = process.env.TEST_STOCK_ID || '1736456369';
const BEARER = process.env.API_BEARER || '';

async function readBody(response) {
  if (!response.body) {
    return 0;
  }
  const reader = response.body.getReader();
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value?.length ?? 0;
  }
  return total;
}

test('GET /api/stockinfo/shutterstock/:id → 200 and non-empty body', async () => {
  const url = `${BASE}/api/stockinfo/shutterstock/${encodeURIComponent(SHUTTERSTOCK_ID)}`;
  const response = await fetch(url, { method: 'GET' });

  assert.equal(response.status, 200, 'Expected status 200');

  const size = await readBody(response);
  assert.ok(size > 0, 'Expected non-empty body from upstream proxy');

  const encoding = response.headers.get('content-encoding') || '';
  assert.equal(typeof encoding, 'string');
});

test('GET /api/orders without auth → 401/403', async () => {
  const response = await fetch(`${BASE}/api/orders`);
  assert.ok([401, 403].includes(response.status));
});

if (BEARER) {
  test('GET /api/orders with bearer → 200', async () => {
    const response = await fetch(`${BASE}/api/orders`, {
      headers: { Authorization: `Bearer ${BEARER}` },
    });
    assert.equal(response.status, 200, 'Expected 200 for authenticated request');

    const data = await response.json();
    assert.ok(Array.isArray(data.orders), 'orders should be an array');
  });
}
