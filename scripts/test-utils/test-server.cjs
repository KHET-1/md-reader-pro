const express = require('express');
const path = require('path');
const fs = require('fs');
const escape = require('escape-html');

const app = express();
const PORT = process.env.PORT || 3100;

// Find the actual bundle file
const distDir = path.join(__dirname, 'dist');
let bundleFile = 'bundle.js';

if (fs.existsSync(distDir)) {
  const distFiles = fs.readdirSync(distDir);
  const foundBundle = distFiles.find(f => f.startsWith('bundle.') && f.endsWith('.js'));
  if (foundBundle) {
    bundleFile = foundBundle;
  }
}

// Handle the test-missing-dom.html route BEFORE static middleware
app.get('/test-missing-dom.html', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Test - Missing DOM</title>
</head>
<body>
    <h1>Missing DOM Elements Test</h1>
    <!-- Missing: textarea#markdown-editor, div#markdown-preview, input#file-input -->
    <script src="/${escape(bundleFile)}"></script>
</body>
</html>`;
  res.send(html);
});

// Serve the dist directory for static files
app.use(express.static(distDir));

// Fallback to index.html for all other routes
app.use((req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Index file not found. Please run npm run build first.');
  }
});

const server = app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    process.exit(0);
  });
});