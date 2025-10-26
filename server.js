const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

console.log('🚀 Starting server...');
console.log('📦 Node version:', process.version);
console.log('📁 Working directory:', __dirname);
console.log('📂 Dist path:', distPath);

// Check if dist folder exists
if (!fs.existsSync(distPath)) {
  console.error('❌ ERROR: dist folder not found at', distPath);
  console.error('Make sure to run "npm run build" first');
  process.exit(1);
}

console.log('✓ Dist folder found');
console.log('📄 Files:', fs.readdirSync(distPath).join(', '));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    uptime: process.uptime()
  });
});

// Serve static files with proper MIME types
app.use(express.static(distPath, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

// SPA fallback - serve index.html for all routes
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error('❌ ERROR: index.html not found at', indexPath);
    return res.status(500).send('Server configuration error');
  }
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Server error');
    }
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('✓✓✓ SERVER STARTED SUCCESSFULLY ✓✓✓');
  console.log(`✓ Running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
}).on('error', (err) => {
  console.error('');
  console.error('❌❌❌ SERVER FAILED TO START ❌❌❌');
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Error:', err);
  }
  console.error('');
  process.exit(1);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
