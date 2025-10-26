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

if (!fs.existsSync(distPath)) {
  console.error('ERROR: dist folder not found at', distPath);
  process.exit(1);
}

console.log('✓ Dist folder found');
console.log('Contents:', fs.readdirSync(distPath));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('✓✓✓ SERVER STARTED SUCCESSFULLY ✓✓✓');
  console.log(`✓ Running on port ${PORT}`);
}).on('error', (err) => {
  console.error('!!! SERVER ERROR !!!');
  console.error(err);
  process.exit(1);
});
