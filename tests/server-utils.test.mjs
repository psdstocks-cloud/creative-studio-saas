import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';

const {
  buildSessionCookie,
  parseCookies,
  MemorySessionStore,
  FileSessionStore,
} = await import('../server.js');

beforeEach(() => {
  process.env.NODE_ENV = 'test';
});

test('buildSessionCookie creates httpOnly cookie with defaults', () => {
  const cookie = buildSessionCookie('session-123', { expiresAt: Date.now() + 1000 });
  assert.match(cookie, /css_bff_session=session-123/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
});

test('parseCookies handles multiple cookies', () => {
  const cookies = parseCookies('a=1; css_bff_session=abc; theme=dark');
  assert.equal(cookies.a, '1');
  assert.equal(cookies.css_bff_session, 'abc');
  assert.equal(cookies.theme, 'dark');
});

test('memory session store expires entries during cleanup', async () => {
  const store = new MemorySessionStore();
  const now = Date.now();
  const session = {
    id: 's1',
    user: { id: 'u1', email: 'test@example.com', roles: ['user'] },
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 10,
  };

  await store.set(session);
  assert.equal((await store.get('s1'))?.id, 's1');

  await new Promise((resolve) => setTimeout(resolve, 15));
  await store.cleanup();

  const result = await store.get('s1');
  assert.equal(result, null);
});

test('file session store persists sessions to disk', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'session-store-'));
  const filePath = path.join(tempDir, 'sessions.json');

  const store = new FileSessionStore(filePath);
  const now = Date.now();
  await store.set({
    id: 'persisted',
    user: { id: 'u2', email: 'persist@example.com', roles: ['admin'] },
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 1000,
  });

  await new Promise((resolve) => setTimeout(resolve, 50));

  const reloaded = new FileSessionStore(filePath);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const loaded = await reloaded.get('persisted');

  assert.ok(loaded);
  assert.equal(loaded?.id, 'persisted');

  await fs.rm(tempDir, { recursive: true, force: true });
});

afterEach(() => {
  process.env.NODE_ENV = 'test';
});
