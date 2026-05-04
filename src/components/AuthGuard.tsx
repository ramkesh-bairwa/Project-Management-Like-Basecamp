'use client';
import { useEffect } from 'react';
import { isTokenExpired, autoLogout } from '@/lib/client-auth';

export default function AuthGuard() {
  useEffect(() => {
    // Immediately redirect if token missing or expired
    if (isTokenExpired()) {
      autoLogout();
      return;
    }

    // Patch global fetch to catch any 401 from API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401) {
        autoLogout();
      }
      return res;
    };

    // Re-check every 30 seconds in case token expires while idle
    const interval = setInterval(() => {
      if (isTokenExpired()) autoLogout();
    }, 30_000);

    return () => {
      window.fetch = originalFetch;
      clearInterval(interval);
    };
  }, []); // run once on mount only

  return null;
}
