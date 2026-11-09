/**
 * SecureFlow Server-Sent Events (SSE) Real-Time Event Bus
 * Broadcasts webhook deliveries, pipeline updates, and audit events to all connected UI clients.
 */

class SSEBroadcaster {
  constructor() {
    this.clients = new Set();
    this.maxClientsPerIp = 25;
  }

  addClient(req, res) {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    let ipCount = 0;
    for (const c of this.clients) {
      if (c.ip === clientIp) ipCount++;
    }
    if (ipCount >= this.maxClientsPerIp) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Too Many SSE Connections', message: '동일 IP당 최대 실시간 이벤트 스트림 연결 수를 초과했습니다.' }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const client = { id: clientId, ip: clientIp, res };
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
        this.clients.delete(client);
      }
    }, 25000);
    if (pingTimer.unref) pingTimer.unref();

    const cleanup = () => {
      clearInterval(pingTimer);
      this.clients.delete(client);
    };

    req.on('close', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);
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
