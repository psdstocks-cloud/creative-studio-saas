import { cp, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const publicDir = resolve(process.cwd(), 'public');
const indexHtml = resolve(dist, 'index.html');
const notFoundHtml = resolve(dist, '404.html');
const redirectsFile = resolve(publicDir, '_redirects');
const distRedirects = resolve(dist, '_redirects');

async function main() {
  try {
    await access(indexHtml);
  } catch {
    console.error('❌ dist/index.html not found. Did the Vite build run?');
    process.exit(1);
  }

  // Copy index.html to 404.html for SPA fallback
  await cp(indexHtml, notFoundHtml);
  console.log('✅ Created dist/404.html for SPA fallback');

  // Copy _redirects file for Cloudflare Pages SPA routing
  try {
    await access(redirectsFile);
    await cp(redirectsFile, distRedirects);
    console.log('✅ Copied public/_redirects to dist/_redirects');
  } catch (err) {
    console.warn('⚠️  public/_redirects not found, skipping copy');
  }
}

main().catch((err) => {
  console.error('❌ Failed to copy files:', err);
  process.exit(1);
});
