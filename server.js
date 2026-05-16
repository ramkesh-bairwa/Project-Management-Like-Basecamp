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

    // Fully public pages — no auth needed, serve immediately
    const PUBLIC_PAGES = ['/', '/login', '/register', '/logout', '/verify-email', '/forgot-password', '/reset-password', '/plans', '/features', '/pricing', '/about', '/blog', '/docs', '/contact'];
    const isPublicPage = PUBLIC_PAGES.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)));

    if (isPublicPage) {
      // Logged-in user hits login/register → redirect to dashboard
      if (pathname === '/login' || pathname === '/register') {
        const token = getCookieToken(req);
        if (token) {
          try { jwt.verify(token, JWT_SECRET); res.writeHead(307, { Location: '/dashboard' }); res.end(); return; }
          catch { /* invalid token, show page */ }
        }
      }
      handle(req, res, parsedUrl);
      return;
    }

    // Admin login page — always public
    if (pathname === '/admin/login') {
      handle(req, res, parsedUrl);
      return;
    }

    // Admin routes — use admin_token cookie
    if (pathname.startsWith('/admin')) {
      const adminToken = getAdminCookieToken(req);
      if (!adminToken) {
        res.writeHead(307, { Location: '/admin/login' });
        res.end();
        return;
      }
      try {
        const decoded = jwt.verify(adminToken, JWT_SECRET);
        if (decoded.role !== 'admin') throw new Error('Not admin');
      } catch {
        res.writeHead(307, { Location: '/admin/login', 'Set-Cookie': 'admin_token=; Max-Age=0; Path=/admin; HttpOnly' });
        res.end();
        return;
      }
      handle(req, res, parsedUrl);
      return;
    }

    // All other pages require auth
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

    handle(req, res, parsedUrl);
  });

  // ── WebSocket Server ──────────────────────────────────────────────────────
  const wss = new WebSocket.Server({ noServer: true });
  const clients = new Map();
  let clientIdCounter = 1;

  server.on('upgrade', (req, socket, head) => {
    if (req.url && req.url.includes('/_next/')) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  // chat_id -> Set of ws clients in that chat room
  const chatRooms = new Map();

  function joinRoom(ws, chatId) {
    if (!chatRooms.has(chatId)) chatRooms.set(chatId, new Set());
    chatRooms.get(chatId).add(ws);
  }

  function leaveRoom(ws, chatId) {
    chatRooms.get(chatId)?.delete(ws);
  }

  function leaveAllRooms(ws) {
    chatRooms.forEach(room => room.delete(ws));
  }

  function broadcastToRoom(chatId, payload, excludeWs) {
    const room = chatRooms.get(chatId);
    if (!room) return;
    const msg = JSON.stringify(payload);
    room.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) client.send(msg);
    });
  }

  wss.on('connection', (ws, req) => {
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

      if (parsed.type === 'join_chat') {
        joinRoom(ws, parsed.chat_id);
        return;
      }

      if (parsed.type === 'leave_chat') {
        leaveRoom(ws, parsed.chat_id);
        return;
      }

      if (parsed.type === 'chat_message') {
        broadcastToRoom(parsed.chat_id, {
          type: 'chat_message',
          chat_id: parsed.chat_id,
          id: parsed.id,
          content: parsed.content,
          sender_id: parsed.sender_id,
          sender_name: parsed.sender_name,
          created_at: parsed.created_at || new Date().toISOString(),
        }, ws);
        return;
      }

      if (parsed.type === 'typing') {
        broadcastToRoom(parsed.chat_id, {
          type: 'typing',
          chat_id: parsed.chat_id,
          sender_name: parsed.sender_name || sender.user?.name || 'Someone',
        }, ws);
        return;
      }

      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    });

    ws.on('close', () => { leaveAllRooms(ws); clients.delete(ws); });
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

function getAdminCookieToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
  return match?.[1] || null;
}
