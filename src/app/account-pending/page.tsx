'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthCard, AuthCenter, Icon, Spinner, StatusIcon } from '@/components/auth/AuthShell';

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
    <AuthCenter>
      <AuthCard className="text-center">
        {!status ? (
          <div key="loading" className="animate-fade-in">
            <StatusIcon tone="primary"><Spinner size={26} /></StatusIcon>
            <h1 className="font-display text-[1.45rem] font-extrabold text-fg">Checking your account…</h1>
          </div>
        ) : !status.signedIn ? (
          <div key="signed-out" className="animate-fade-in">
            <StatusIcon tone="primary"><Icon.User size={28} /></StatusIcon>
            <h1 className="font-display text-[1.45rem] font-extrabold text-fg">You&apos;re signed out</h1>
            <p className="mt-2 mb-6 text-[14px] text-muted">Log in to see the status of your account.</p>
            <Link href="/login" className="btn btn-gradient btn-lg w-full">
              Go to Login<Icon.ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div key="pending" className="animate-fade-in">
            <StatusIcon tone={byEmail ? 'primary' : 'warning'}>
              {byEmail ? <Icon.Inbox size={28} /> : <Icon.Clock size={28} />}
            </StatusIcon>
            <h1 className="font-display text-[1.45rem] font-extrabold text-fg">
              {byEmail ? 'Verify your email to continue' : 'Waiting for admin approval'}
            </h1>
            <p className="mt-2 text-[14px] text-muted leading-relaxed">
              {byEmail
                ? <>We sent a verification link to <strong className="text-fg">{status.email}</strong>. Click it to start using your account.</>
                : <>Your account <strong className="text-fg">{status.email}</strong> has been created. An admin needs to approve it before you can use the app.</>}
            </p>
            <p className="mt-3 mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-[var(--surface-2)] px-3 py-1 text-[12px] text-subtle">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: 'var(--warning)' }} />
                <span className="relative w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
              </span>
              This page moves on by itself once your account is approved.
            </p>

            {note && (
              <div role="status" className="mb-4 rounded-xl border border-line bg-[var(--surface-2)] px-3.5 py-2.5 text-[13px] font-medium text-muted animate-scale-in">{note}</div>
            )}

            <div className="flex flex-col gap-2.5">
              {byEmail && (
                <button onClick={resend} disabled={resending} className="btn btn-gradient btn-lg w-full">
                  {resending ? <><Spinner />Sending…</> : <><Icon.Mail size={17} />Resend verification email</>}
                </button>
              )}
              <button onClick={() => check(true)} disabled={checking}
                className={`btn btn-lg w-full ${byEmail ? 'btn-secondary' : 'btn-primary'}`}>
                {checking ? <><Spinner />Checking…</> : <><Icon.Refresh size={16} />Check again</>}
              </button>
              <button onClick={logout} className="btn btn-ghost w-full">
                <Icon.LogOut size={15} />Log out
              </button>
            </div>
          </div>
        )}
      </AuthCard>
    </AuthCenter>
  );
}
