'use client';
import { useEffect, useRef, useCallback, useState } from 'react';

export function useWebSocket(token = null) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    const url = token
      ? `ws://localhost:${location.port || 3000}?token=${token}`
      : `ws://localhost:${location.port || 3000}`;

    ws.current = new WebSocket(url);

    ws.current.onopen = () => setConnected(true);
    ws.current.onclose = () => setConnected(false);
    ws.current.onmessage = (e) => {
      try { setLastMessage(JSON.parse(e.data)); } catch { /* ignore */ }
    };

    return () => ws.current?.close();
  }, [token]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, lastMessage, send };
}
