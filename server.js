const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

console.log('Starting server...');
console.log('Node version:', process.version);
console.log('Working directory:', __dirname);
console.log('Dist path:', distPath);

// Check if dist folder exists
if (!fs.existsSync(distPath)) {
  console.error('ERROR: dist folder not found at', distPath);
  process.exit(1);
}

console.log('Dist folder contents:', fs.readdirSync(distPath));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// Serve static files
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('ERROR: index.html not found');
    return res.status(500).send('Server error');
  }
  
  res.sendFile(indexPath);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('✓✓✓ SERVER STARTED SUCCESSFULLY ✓✓✓');
  console.log(`✓ Running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
}).on('error', (err) => {
  console.error('!!! SERVER FAILED TO START !!!');
  console.error('Error:', err);
  process.exit(1);
});
