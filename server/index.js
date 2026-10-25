import http from 'node:http';
import { apiMiddleware } from './apiMiddleware.js';

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  apiMiddleware(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [SecureFlow Backend] Standalone Server running on http://0.0.0.0:${PORT}`);
  console.log(`📦 [SQLite Database] Initialized at server/data/secureflow.db`);
  console.log(`🔔 [GitHub Webhook Endpoint] http://0.0.0.0:${PORT}/api/webhooks/github`);
});
