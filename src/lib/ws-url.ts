// WebSocket server runs on the same origin as the page (see server.js),
// so derive the URL from the current location: wss:// behind HTTPS, ws:// locally.
export function getWsUrl(token?: string | null): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = `${proto}//${location.host}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}
