
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const STOCK_API_BASE_URL = process.env.STOCK_API_BASE_URL || 'https://nehtw.com/api';
const STOCK_API_KEY = process.env.STOCK_API_KEY;

if (!STOCK_API_KEY) {
  console.warn(
    '⚠️  STOCK_API_KEY is not set. API proxy requests will fail until the key is configured.'
  );
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', async (req, res) => {
  if (!STOCK_API_KEY) {
    res.status(500).json({ message: 'Server is missing STOCK_API_KEY configuration.' });
    return;
  }

  const upstreamPath = req.originalUrl.replace(/^\/api/, '');
  const targetUrl = `${STOCK_API_BASE_URL}${upstreamPath}`;

  try {
    const method = req.method || 'GET';
    const headers = new Headers();
    headers.set('X-Api-Key', STOCK_API_KEY);

    const contentType = req.headers['content-type'];
    if (contentType) {
      headers.set('Content-Type', Array.isArray(contentType) ? contentType[0] : contentType);
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

    res.status(upstreamResponse.status).send(responseText);
  } catch (error) {
    console.error('Error proxying API request:', error);
    res.status(502).json({ message: 'Upstream API request failed.' });
  }
});

// The directory where our bundled and static assets live after the build process.
const buildPath = path.join(__dirname, 'dist');

// Serve all static files from the 'dist' directory.
app.use(express.static(buildPath));

// For any other GET request that doesn't match a static file, serve the main index.html.
// This is the standard fallback for single-page applications, allowing React Router to handle routing.
// ✅ Works with Express 5 — catch-all for React SPA routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('An error occurred');
    }
  });
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Serving static files from: ${buildPath}`);
});
