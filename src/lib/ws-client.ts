'use client';
import { useEffect, useRef } from 'react';

type WSMessage = Record<string, unknown>;
type Handler = (msg: WSMessage) => void;

let ws: WebSocket | null = null;
let handlers: Handler[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;

function connect(token: string) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  currentToken = token;

  const port = typeof window !== 'undefined' ? (location.port || '3000') : '3000';
  const wsUrl = `ws://localhost:${port}?token=${token}`;

  ws = new WebSocket(wsUrl);

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      handlers.forEach(h => h(msg));
    } catch { /* ignore */ }
  };

  ws.onclose = () => {
    ws = null;
    if (currentToken) {
      reconnectTimer = setTimeout(() => connect(currentToken!), 3000);
    }
  };

  ws.onerror = () => ws?.close();
}

function disconnect() {
  currentToken = null;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  ws?.close();
  ws = null;
}

export function sendWS(msg: WSMessage) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export function useWebSocket(token: string | null, onMessage: Handler) {
  const handlerRef = useRef<Handler>(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!token) return;

    const handler: Handler = (msg) => handlerRef.current(msg);
    handlers.push(handler);
    connect(token);

    return () => {
      handlers = handlers.filter(h => h !== handler);
      if (handlers.length === 0) disconnect();
    };
  }, [token]);
}
