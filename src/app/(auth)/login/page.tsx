'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell, {
  Alert, AuthFooterLink, AuthHeading, Divider, Field, Icon, PasswordField, SocialLink, Spinner, SubmitButton, TextLink,
  type BrandContent,
} from '@/components/auth/AuthShell';

const brand: BrandContent = {
  eyebrow: 'All-in-one workspace',
  title: <>Manage projects<br /><span className="text-gradient">like a pro.</span></>,
  subtitle: 'Everything your team needs — tasks, chat, docs, and deadlines — all in one beautiful workspace.',
  preview: 'board',
  features: ['Drag-and-drop project boards', 'Real-time team chat', 'Progress & milestone tracking', 'Smart notifications'],
  stats: [
    { value: '10K+', label: 'Teams' },
    { value: '500K+', label: 'Tasks done' },
    { value: '99.9%', label: 'Uptime' },
  ],
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const inviteToken = params.get('invite');
    if (emailParam) setForm(p => ({ ...p, email: emailParam }));
    if (inviteToken) sessionStorage.setItem('invite_token', inviteToken);
    if (params.get('error') === 'pending_approval') {
      setError('Your account is waiting for admin approval. You will be able to log in once an admin approves it.');
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now() && payload.role !== 'admin') router.replace('/dashboard');
    } catch { /* invalid token */ }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setUnverified(false);
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (res.status === 403 && data.error?.includes('verify')) setUnverified(true);
      setError(data.error);
      return;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', String(data.user.id));
    document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
    const inviteToken = sessionStorage.getItem('invite_token');
    if (inviteToken) {
      sessionStorage.removeItem('invite_token');
      await fetch('/api/projects/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
        body: JSON.stringify({ token: inviteToken })
      });
    }
    window.location.href = '/dashboard';
  }

  async function resendVerification() {
    setResending(true); setResendMsg('');
    const res = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email }) });
    const data = await res.json();
    setResending(false);
    setResendMsg(res.ok ? (data.message || 'Sent!') : (data.error || 'Failed'));
  }

  return (
    <AuthShell brand={brand}>
      <AuthHeading title="Welcome back" subtitle="Sign in to continue to your workspace." />

      <div className="flex flex-col gap-2.5">
        <SocialLink provider="google" href="/api/auth/oauth/google">Continue with Google</SocialLink>
        <SocialLink provider="github" href="/api/auth/oauth/github">Continue with GitHub</SocialLink>
      </div>

      <Divider label="or continue with email" />

      {(error || unverified) && (
        <div className="flex flex-col gap-3 mb-5">
          {error && <Alert tone="danger">{error}</Alert>}
          {unverified && (
            <Alert tone="warning" title="Email not verified">
              {resendMsg
                ? <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--success-text)' }}><Icon.Check size={14} />{resendMsg}</span>
                : (
                  <button type="button" onClick={resendVerification} disabled={resending}
                    className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-4 hover:no-underline disabled:opacity-60">
                    {resending ? <><Spinner size={12} />Sending…</> : <><Icon.Refresh size={13} />Resend verification email</>}
                  </button>
                )}
            </Alert>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Email address" icon={<Icon.Mail size={17} />}
          type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          placeholder="you@example.com" required autoComplete="email"
        />
        <PasswordField
          label="Password" labelRight={<TextLink href="/forgot-password">Forgot password?</TextLink>}
          show={showPass} onToggleShow={() => setShowPass(p => !p)}
          value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          placeholder="••••••••" required autoComplete="current-password"
        />
        <SubmitButton loading={loading} loadingText="Signing in…" className="mt-2">Sign in</SubmitButton>
      </form>

      <AuthFooterLink text="Don't have an account?" href="/register" cta="Create one free" />

      <div className="mt-6 flex justify-center gap-5 text-[12px] font-medium text-subtle">
        <span className="inline-flex items-center gap-1.5"><Icon.Shield size={13} />Secure</span>
        <span className="inline-flex items-center gap-1.5"><Icon.Sparkles size={13} />Fast</span>
        <span className="inline-flex items-center gap-1.5"><Icon.Check size={13} />Free forever</span>
      </div>
    </AuthShell>
  );
}
