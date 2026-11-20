'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthCard, AuthCenter, Icon, Spinner, StatusIcon } from '@/components/auth/AuthShell';

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
    <AuthCard className="text-center">
      {status === 'loading' && (
        <div key="loading" className="animate-fade-in">
          <StatusIcon tone="primary"><Spinner size={26} /></StatusIcon>
          <h1 className="font-display text-[1.45rem] font-extrabold text-fg">Verifying your email…</h1>
          <p className="mt-2 text-[14px] text-muted">Please wait a moment.</p>
        </div>
      )}

      {status === 'success' && (
        <div key="success" className="animate-fade-in">
          <StatusIcon tone="success"><Icon.CheckCircle size={30} /></StatusIcon>
          <h1 className="font-display text-[1.45rem] font-extrabold text-fg">
            Email Verified{message ? `, ${message}!` : '!'}
          </h1>
          <p className="mt-2 mb-6 text-[14px] text-muted">
            You&apos;re all set. Redirecting to your dashboard in <strong className="text-fg tabular-nums">{countdown}s</strong>…
          </p>

          {/* Progress bar */}
          <div className="w-full rounded-full overflow-hidden mb-6 h-1.5 bg-[var(--surface-3)]">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ background: 'var(--grad-brand)', width: `${((3 - countdown) / 3) * 100}%` }} />
          </div>

          <button onClick={() => window.location.href = '/dashboard'} className="btn btn-gradient btn-lg w-full group">
            Go to Dashboard<Icon.ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}

      {status === 'error' && (
        <div key="error" className="animate-fade-in">
          <StatusIcon tone="danger"><Icon.XCircle size={30} /></StatusIcon>
          <h1 className="font-display text-[1.45rem] font-extrabold text-fg">Verification Failed</h1>
          <p className="mt-2 mb-6 text-[14px] text-muted">{message}</p>
          <div className="flex flex-col gap-3">
            <Link href="/register" className="btn btn-gradient btn-lg w-full">Register Again</Link>
            <Link href="/login" className="btn btn-ghost w-full">
              <Icon.ArrowLeft size={15} />Back to Login
            </Link>
          </div>
        </div>
      )}
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthCenter>
      <Suspense fallback={
        <AuthCard className="text-center">
          <StatusIcon tone="primary"><Icon.Clock size={28} /></StatusIcon>
          <h1 className="font-display text-[1.45rem] font-extrabold text-fg">Loading…</h1>
        </AuthCard>
      }>
        <VerifyContent />
      </Suspense>
    </AuthCenter>
  );
}
