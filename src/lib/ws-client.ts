'use client';
import { useEffect } from 'react';

type WSMessage = Record<string, unknown>;
type Handler = (msg: WSMessage) => void;

// WebSocket disabled — stub functions to prevent errors
export function sendWS(_msg: WSMessage) { /* no-op */ }

export function useWebSocket(_token: string | null, _onMessage: Handler) {
  useEffect(() => { /* no-op */ }, []);
}
