'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell, {
  Alert, AuthFooterLink, AuthHeading, Divider, Field, Icon, PasswordField, SocialLink, StatusIcon, StrengthMeter, SubmitButton,
  type BrandContent,
} from '@/components/auth/AuthShell';

const brand: BrandContent = {
  eyebrow: 'Free forever · No credit card',
  title: <>Your team&apos;s new<br /><span className="text-gradient">command center.</span></>,
  subtitle: "Join thousands of teams who ship projects on time with ProjectHub's all-in-one workspace.",
  preview: 'board',
  features: ['Up and running in minutes', 'Tasks, files, chat & timelines', 'Real-time collaboration', 'Ship faster, stress less'],
  testimonial: {
    quote: '“ProjectHub cut our weekly stand-ups in half. The team finally knows what everyone is working on.”',
    name: 'Sarah K.',
    role: 'Engineering Lead',
    initials: 'SK',
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [emailFailed, setEmailFailed] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{ project_name: string; invited_by: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
      fetch(`/api/projects/invite?token=${token}`)
        .then(r => r.json())
        .then(d => {
          if (d.email) setForm(p => ({ ...p, email: d.email }));
          if (d.project_name) setInviteInfo({ project_name: d.project_name, invited_by: d.invited_by });
        })
        .catch(() => {});
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) router.replace('/dashboard');
    } catch { /* invalid token */ }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setEmailFailed(''); setResendMsg('');
    const payload = inviteToken ? { ...form, invite_token: inviteToken } : form;
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    setLoading(false);
    if (data.code === 'PENDING_APPROVAL') { setPendingApproval(true); return; }
    if (data.code === 'UNVERIFIED') { setVerifyPending(true); return; }
    if (!res.ok) { setError(data.error || 'Registration failed'); return; }
    if (data.code === 'EMAIL_FAILED') { setEmailFailed(data.error || 'Could not send verification email.'); setVerifyPending(true); return; }
    if (data.code === 'VERIFY_PENDING') { setVerifyPending(true); return; }
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', String(data.user?.id));
      document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
      window.location.href = '/dashboard';
    } else {
      setVerifyPending(true);
    }
  }

  async function resendVerification() {
    setResending(true); setResendMsg(''); setEmailFailed('');
    const res = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email }) });
    const data = await res.json();
    setResending(false);
    if (res.ok) setResendMsg(data.message || 'Verification email sent!');
    else setEmailFailed(data.error || 'Failed to resend.');
  }

  const backToLogin = (
    <Link href="/login" className="mt-6 inline-flex items-center justify-center gap-1.5 w-full text-[14px] font-semibold text-muted hover:text-fg transition">
      <Icon.ArrowLeft size={15} />Back to Login
    </Link>
  );

  return (
    <AuthShell brand={brand}>
      {pendingApproval ? (
        <div className="text-center">
          <StatusIcon tone="warning"><Icon.Clock size={28} /></StatusIcon>
          <h1 className="font-display text-[1.6rem] font-extrabold text-fg">Waiting for approval</h1>
          <p className="mt-3 text-[14.5px] text-muted leading-relaxed">
            Your account <strong className="text-fg">{form.email}</strong> has been created
            and is waiting for an admin to approve it.
            You can log in as soon as it&apos;s approved.
          </p>
          {backToLogin}
        </div>
      ) : verifyPending ? (
        <div className="text-center">
          <StatusIcon tone="primary"><Icon.Inbox size={28} /></StatusIcon>
          <h1 className="font-display text-[1.6rem] font-extrabold text-fg">Check your inbox!</h1>
          <p className="mt-3 mb-6 text-[14.5px] text-muted leading-relaxed">
            We sent a verification link to<br />
            <strong className="text-fg">{form.email}</strong>
          </p>
          <div className="flex flex-col gap-3 text-left">
            {emailFailed && <Alert tone="warning">Email delivery failed: {emailFailed}</Alert>}
            {resendMsg && <Alert tone="success">{resendMsg}</Alert>}
          </div>
          <SubmitButton type="button" onClick={resendVerification} loading={resending} loadingText="Sending…" variant="secondary" className="mt-4">
            <Icon.Refresh size={16} />Resend Verification Email
          </SubmitButton>
          {backToLogin}
        </div>
      ) : (
        <>
          {inviteInfo && (
            <div className="mb-6 rounded-2xl border border-line p-4 flex gap-3 items-start" style={{ background: 'var(--grad-brand-soft)' }}>
              <span className="grid place-items-center w-9 h-9 rounded-xl text-white shrink-0" style={{ background: 'var(--grad-brand)' }}><Icon.Sparkles size={17} /></span>
              <div className="text-[13px]">
                <p className="font-semibold text-fg">You&apos;ve been invited!</p>
                <p className="text-muted mt-0.5">
                  <strong className="text-fg">{inviteInfo.invited_by}</strong> invited you to join <strong className="text-fg">{inviteInfo.project_name}</strong>
                </p>
              </div>
            </div>
          )}

          <AuthHeading title="Create your account" subtitle="Free forever. No credit card required." />

          <div className="flex flex-col gap-2.5">
            <SocialLink provider="google" href="/api/auth/oauth/google">Continue with Google</SocialLink>
            <SocialLink provider="github" href="/api/auth/oauth/github">Continue with GitHub</SocialLink>
          </div>

          <Divider label="or continue with email" />

          {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Full name" icon={<Icon.User size={17} />}
              type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Jane Smith" required autoComplete="name"
            />
            <Field
              label="Email address" icon={<Icon.Mail size={17} />}
              type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com" required autoComplete="email"
            />
            <div>
              <PasswordField
                label="Password" show={showPass} onToggleShow={() => setShowPass(p => !p)}
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Min. 8 characters" required minLength={8} autoComplete="new-password"
              />
              <StrengthMeter password={form.password} />
            </div>
            <SubmitButton loading={loading} loadingText="Creating account…" className="mt-2">Create free account</SubmitButton>
          </form>

          <AuthFooterLink text="Already have an account?" href="/login" cta="Sign in" />

          <div className="mt-6 flex justify-center gap-5 text-[12px] font-medium text-subtle">
            <span className="inline-flex items-center gap-1.5"><Icon.Shield size={13} />Secure</span>
            <span className="inline-flex items-center gap-1.5"><Icon.Sparkles size={13} />Fast</span>
            <span className="inline-flex items-center gap-1.5"><Icon.Check size={13} />Free forever</span>
          </div>
        </>
      )}
    </AuthShell>
  );
}
