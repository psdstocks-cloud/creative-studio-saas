import { cp, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const indexHtml = resolve(dist, 'index.html');
const notFoundHtml = resolve(dist, '404.html');

async function main() {
  try {
    await access(indexHtml);
  } catch {
    console.error('❌ dist/index.html not found. Did the Vite build run?');
    process.exit(1);
  }

  await cp(indexHtml, notFoundHtml);
  console.log('✅ Created dist/404.html for SPA fallback');
}

main().catch((err) => {
  console.error('❌ Failed to create 404.html:', err);
  process.exit(1);
});
