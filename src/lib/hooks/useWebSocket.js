'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { getWsUrl } from '../ws-url';

export function useWebSocket(token = null) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    ws.current = new WebSocket(getWsUrl(token));

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
