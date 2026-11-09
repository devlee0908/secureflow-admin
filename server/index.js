import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiMiddleware } from './apiMiddleware.js';
import { securityGuard } from './securityGuard.js';
import { scannerPool } from './workers/scannerPool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const PORT = process.env.PORT || 3001;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStaticOrSpa(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const safeSuffix = path.normalize(decodeURIComponent(parsedUrl.pathname)).replace(/^(\.\.(\/|\\|$))+/, '');
  let targetPath = path.join(DIST_DIR, safeSuffix);

  // Prevent directory traversal outside DIST_DIR
  if (!targetPath.startsWith(DIST_DIR)) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
    return;
  }

  // If path is a directory or doesn't exist, fall back to SPA index.html
  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    targetPath = path.join(DIST_DIR, 'index.html');
  }

  if (!fs.existsSync(targetPath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Frontend build not found',
        message: 'Run `npm run build` first to generate production static assets in dist/.',
      })
    );
    return;
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const isImmutableAsset = parsedUrl.pathname.startsWith('/assets/');
  const secHeaders = securityGuard.getSecurityHeaders();

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': isImmutableAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...secHeaders,
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(targetPath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Failed to read static asset' }));
  });
  stream.pipe(res);
}

const server = http.createServer((req, res) => {
  apiMiddleware(req, res, () => {
    serveStaticOrSpa(req, res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SecureFlow Backend] Production-Ready Server running on http://0.0.0.0:${PORT}`);
  console.log(`[SQLite Database] Initialized at server/data/secureflow.db`);
  console.log(`[GitHub Webhook Endpoint] http://0.0.0.0:${PORT}/api/webhooks/github`);
});

function gracefulShutdown(signal) {
  console.log(`\n[SecureFlow Backend] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    try {
      for (const entry of scannerPool.workers || []) {
        scannerPool.removeWorker(entry);
      }
    } catch {}
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
