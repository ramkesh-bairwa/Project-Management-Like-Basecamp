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

export function isTokenExpired(): boolean {
  try {
    const token = localStorage.getItem('token');
    if (!token) return true;
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  document.cookie = 'token=; Max-Age=0; path=/';
}

export function autoLogout() {
  clearAuth();
  // Call logout API to clear httpOnly cookie on server
  fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
    window.location.replace('/login');
  });
}
