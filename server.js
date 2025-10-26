
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// The directory where our bundled and static assets live after the build process.
const buildPath = path.join(__dirname, 'dist');

// Serve all static files from the 'dist' directory.
app.use(express.static(buildPath));

// For any other GET request that doesn't match a static file, serve the main index.html.
// This is the standard fallback for single-page applications, allowing React Router to handle routing.
app.get('*', (req, res) => {
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
