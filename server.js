
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

// This middleware acts as a catch-all for SPA routing.
// It sends index.html for any request that doesn't match a static file,
// allowing the React router to handle the URL.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      // Log the error and send a 500 status code
      console.error('Error sending index.html:', err);
      res.status(500).send(err);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
