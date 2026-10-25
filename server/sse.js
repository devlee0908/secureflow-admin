/**
 * SecureFlow Server-Sent Events (SSE) Real-Time Event Bus
 * Broadcasts webhook deliveries, pipeline updates, and audit events to all connected UI clients.
 */

class SSEBroadcaster {
  constructor() {
    this.clients = new Set();
  }

  addClient(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const client = { id: clientId, res };
    this.clients.add(client);

    // Initial handshake event
    this.sendToClient(client, 'connected', {
      clientId,
      serverTime: new Date().toISOString(),
      activeClients: this.clients.size,
      message: 'SecureFlow Real-Time SSE Bus Connected',
    });

    // Keep-alive ping every 25 seconds
    const pingTimer = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (e) {
        clearInterval(pingTimer);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(pingTimer);
      this.clients.delete(client);
    });
  }

  sendToClient(client, eventType, data) {
    try {
      client.res.write(`event: ${eventType}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      this.clients.delete(client);
    }
  }

  broadcast(eventType, data) {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      try {
        client.res.write(`event: ${eventType}\n`);
        client.res.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const sseService = new SSEBroadcaster();
