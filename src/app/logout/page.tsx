'use client';
import { useEffect } from 'react';

export default function LogoutPage() {
  useEffect(() => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');

    // Clear cookie via API then redirect
    fetch('/api/auth/logout', { method: 'POST' })
      .catch(() => {})
      .finally(() => {
        window.location.replace('/login');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>Signing out...</div>
      </div>
    </div>
  );
}
