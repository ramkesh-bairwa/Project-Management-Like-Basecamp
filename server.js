const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

// Load .env.local manually since plain node doesn't load it
require('fs').readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
});

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // Always pass to Next.js: API routes, static assets, favicon
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon')
    ) {
      handle(req, res, parsedUrl);
      return;
    }

    // Public page paths — no auth needed
    const PUBLIC_PAGES = ['/login', '/register', '/logout'];
    const isPublicPage = PUBLIC_PAGES.some(p => pathname.startsWith(p));

    // Root redirect
    if (pathname === '/') {
      const token = getCookieToken(req);
      let valid = false;
      if (token) { try { jwt.verify(token, JWT_SECRET); valid = true; } catch { /* expired */ } }
      res.writeHead(307, { Location: valid ? '/dashboard' : '/login' });
      res.end();
      return;
    }

    // Logged-in user hits login/register → redirect to dashboard
    if (pathname === '/login' || pathname === '/register') {
      const token = getCookieToken(req);
      if (token) {
        try { jwt.verify(token, JWT_SECRET); res.writeHead(307, { Location: '/dashboard' }); res.end(); return; }
        catch { /* invalid token, show page */ }
      }
      handle(req, res, parsedUrl);
      return;
    }

    // All other pages require auth
    if (!isPublicPage) {
      const token = getCookieToken(req);
      if (!token) {
        res.writeHead(307, { Location: `/login?from=${encodeURIComponent(pathname)}` });
        res.end();
        return;
      }
      try {
        jwt.verify(token, JWT_SECRET);
      } catch {
        res.writeHead(307, { Location: '/login', 'Set-Cookie': 'token=; Max-Age=0; Path=/; HttpOnly' });
        res.end();
        return;
      }
    }

    handle(req, res, parsedUrl);
  });

  // ── WebSocket Server ──────────────────────────────────────────────────────
  const wss = new WebSocket.Server({ server });
  const clients = new Map();
  let clientIdCounter = 1;

  wss.on('connection', (ws, req) => {
    // Optional: verify JWT from query param → ws://localhost:3000?token=xxx
    const { query } = parse(req.url, true);
    let user = null;
    if (query.token) {
      try { user = jwt.verify(query.token, JWT_SECRET); } catch { /* invalid token */ }
    }

    const clientId = clientIdCounter++;
    clients.set(ws, { id: clientId, user });

    ws.send(JSON.stringify({ type: 'welcome', clientId, userId: user?.id || null }));

    ws.on('message', (data) => {
      let parsed;
      try { parsed = JSON.parse(data.toString()); } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        return;
      }

      const sender = clients.get(ws);

      // Broadcast to all connected clients
      if (parsed.type === 'message') {
        const payload = JSON.stringify({
          type: 'message',
          from: sender.user?.name || `Client-${sender.id}`,
          fromId: sender.id,
          text: parsed.text,
          timestamp: new Date().toISOString(),
        });
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) client.send(payload);
        });
      }

      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', (err) => console.error(`[WS Error] Client ${clientId}:`, err.message));
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> WebSocket ready on ws://localhost:${PORT}`);
  });
});

function getCookieToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match?.[1] || null;
}
