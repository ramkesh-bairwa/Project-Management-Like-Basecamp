'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('No verification token provided.'); return; }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.token) {
          // Save token to localStorage and cookie (server.js reads cookie)
          localStorage.setItem('token', d.token);
          if (d.user?.id) localStorage.setItem('userId', String(d.user.id));
          document.cookie = `token=${d.token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
          setStatus('success');
          setMessage(d.user?.name || '');
        } else {
          setStatus('error');
          setMessage(d.error || 'Verification failed.');
        }
      })
      .catch(() => { setStatus('error'); setMessage('Something went wrong.'); });
  }, [params]);

  // Countdown then redirect
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown === 0) { window.location.href = '/dashboard'; return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown]);

  return (
    <div className="bg-white rounded-2xl p-10 w-full max-w-md text-center shadow-sm" style={{ border: '1px solid #d0dce8' }}>
      {status === 'loading' && (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#f1faee' }}>
            <div className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin" style={{ border: '3px solid #d0dce8', borderTopColor: '#1d3557' }} />
          </div>
          <div className="font-black text-xl mb-2" style={{ color: '#1d3557' }}>Verifying your email…</div>
          <p className="text-sm" style={{ color: '#6b7a8d' }}>Please wait a moment.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="text-5xl mb-4">🎉</div>
          <div className="font-black text-xl mb-1" style={{ color: '#1d3557' }}>
            Email Verified{message ? `, ${message}!` : '!'}
          </div>
          <p className="text-sm mb-6" style={{ color: '#6b7a8d' }}>
            You're all set. Redirecting to your dashboard in <strong style={{ color: '#1d3557' }}>{countdown}s</strong>…
          </p>

          {/* Progress bar */}
          <div className="w-full rounded-full overflow-hidden mb-6" style={{ height: 4, background: '#f1f5f9' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ background: '#2a9d8f', width: `${((3 - countdown) / 3) * 100}%` }} />
          </div>

          <button onClick={() => window.location.href = '/dashboard'}
            className="inline-block px-6 py-3 rounded-xl font-black text-sm text-white hover:opacity-90 transition"
            style={{ background: '#e63946' }}>
            Go to Dashboard →
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="text-5xl mb-4">❌</div>
          <div className="font-black text-xl mb-2" style={{ color: '#1d3557' }}>Verification Failed</div>
          <p className="text-sm mb-6" style={{ color: '#6b7a8d' }}>{message}</p>
          <div className="flex flex-col gap-3">
            <Link href="/register" className="inline-block px-6 py-3 rounded-xl font-black text-sm text-white hover:opacity-90 transition" style={{ background: '#e63946' }}>
              Register Again
            </Link>
            <Link href="/login" className="text-sm font-bold hover:underline" style={{ color: '#6b7a8d' }}>
              Back to Login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#f1faee' }}>
      <Suspense fallback={
        <div className="bg-white rounded-2xl p-10 w-full max-w-md text-center shadow-sm" style={{ border: '1px solid #d0dce8' }}>
          <div className="text-4xl mb-4">⏳</div>
          <div className="font-black text-xl" style={{ color: '#1d3557' }}>Loading…</div>
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
