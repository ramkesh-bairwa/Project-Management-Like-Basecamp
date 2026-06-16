'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SocialCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      router.replace('/login?error=' + (error || 'oauth_failed'));
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      localStorage.setItem('token', token);
      localStorage.setItem('userId', String(payload.id));
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
      window.location.href = '/dashboard';
    } catch {
      router.replace('/login?error=oauth_failed');
    }
  }, [params, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', background: '#f5f7fa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <p style={{ color: '#6b7280', fontSize: 15 }}>Signing you in…</p>
      </div>
    </div>
  );
}

export default function SocialCallbackPage() {
  return (
    <Suspense>
      <SocialCallbackInner />
    </Suspense>
  );
}
