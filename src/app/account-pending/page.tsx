'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Status = {
  signedIn: boolean;
  name?: string;
  email?: string;
  approved?: boolean;
  emailVerificationEnabled: boolean;
};

// Signed-in users whose account isn't verified/approved yet are sent here by server.js
export default function AccountPendingPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');
  const [resending, setResending] = useState(false);

  const check = useCallback(async (manual: boolean) => {
    setChecking(true);
    try {
      const d: Status = await fetch('/api/auth/account-status', { cache: 'no-store' }).then(r => r.json());
      if (d.signedIn && d.approved) { window.location.href = '/dashboard'; return; }
      setStatus(d);
      if (manual) setNote('Still waiting. We check again automatically every 30 seconds.');
    } catch {
      if (manual) setNote('Could not check right now. Please try again.');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => check(false), 0);
    const timer = setInterval(() => check(false), 30_000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [check]);

  async function resend() {
    if (!status?.email) return;
    setResending(true); setNote('');
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: status.email }),
    });
    const d = await res.json().catch(() => ({}));
    setResending(false);
    setNote(d.message || d.error || (res.ok ? 'Verification email sent.' : 'Could not send the email.'));
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    document.cookie = 'token=; path=/; max-age=0';
    window.location.href = '/login';
  }

  const byEmail = status?.emailVerificationEnabled;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f1faee' }}>
      <div className="bg-white rounded-2xl p-10 w-full max-w-md text-center shadow-sm" style={{ border: '1px solid #d0dce8' }}>
        {!status ? (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#f1faee' }}>
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #d0dce8', borderTopColor: '#1d3557' }} />
            </div>
            <div className="font-black text-xl" style={{ color: '#1d3557' }}>Checking your account…</div>
          </>
        ) : !status.signedIn ? (
          <>
            <div className="font-black text-xl mb-2" style={{ color: '#1d3557' }}>You&apos;re signed out</div>
            <p className="text-sm mb-6" style={{ color: '#6b7a8d' }}>Log in to see the status of your account.</p>
            <Link href="/login" className="inline-block px-6 py-3 rounded-xl font-black text-sm text-white hover:opacity-90 transition" style={{ background: '#e63946' }}>
              Go to Login
            </Link>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">{byEmail ? '✉️' : '⏳'}</div>
            <div className="font-black text-xl mb-2" style={{ color: '#1d3557' }}>
              {byEmail ? 'Verify your email to continue' : 'Waiting for admin approval'}
            </div>
            <p className="text-sm mb-1" style={{ color: '#6b7a8d' }}>
              {byEmail
                ? <>We sent a verification link to <strong style={{ color: '#1d3557' }}>{status.email}</strong>. Click it to start using your account.</>
                : <>Your account <strong style={{ color: '#1d3557' }}>{status.email}</strong> has been created. An admin needs to approve it before you can use the app.</>}
            </p>
            <p className="text-xs mb-6" style={{ color: '#94a3b8' }}>This page moves on by itself once your account is approved.</p>

            {note && (
              <div role="status" className="text-sm font-semibold rounded-lg px-3 py-2 mb-4" style={{ background: '#f8fafc', color: '#475569' }}>{note}</div>
            )}

            <div className="flex flex-col gap-3">
              {byEmail && (
                <button onClick={resend} disabled={resending}
                  className="px-6 py-3 rounded-xl font-black text-sm text-white hover:opacity-90 transition disabled:opacity-60"
                  style={{ background: '#e63946' }}>
                  {resending ? 'Sending…' : 'Resend verification email'}
                </button>
              )}
              <button onClick={() => check(true)} disabled={checking}
                className="px-6 py-3 rounded-xl font-bold text-sm transition disabled:opacity-60"
                style={{ background: byEmail ? '#fff' : '#1d3557', color: byEmail ? '#1d3557' : '#fff', border: '1px solid #d0dce8' }}>
                {checking ? 'Checking…' : 'Check again'}
              </button>
              <button onClick={logout} className="text-sm font-bold hover:underline" style={{ color: '#6b7a8d' }}>
                Log out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
