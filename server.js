
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module-safe way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Serve static files (like index.html, styles.css, favicon.svg) from the root directory
app.use(express.static(path.join(__dirname, '')));

// Catch-all handler for single-page application (SPA) routing
// This sends index.html for any request that doesn't match a static file
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
