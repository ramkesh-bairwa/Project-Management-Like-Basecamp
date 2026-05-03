// Decode JWT payload without a library (client-side only)
export function getTokenUserId(): number {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 0;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || 0;
  } catch {
    return 0;
  }
}

export function getToken(): string {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
}
