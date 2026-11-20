'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthShell, {
  Alert, AuthFooterLink, AuthHeading, Field, Icon, StatusIcon, SubmitButton,
  type BrandContent,
} from '@/components/auth/AuthShell';

const brand: BrandContent = {
  eyebrow: 'Account recovery',
  title: <>Forgot your<br /><span className="text-gradient">password?</span></>,
  subtitle: "No worries — it happens to the best of us. Enter your email and we'll send you a secure reset link.",
  preview: 'security',
  features: ['Link expires in 1 hour', 'Delivered within seconds', 'Verified account protection', 'Back in under 2 minutes'],
  stats: [
    { value: '10K+', label: 'Teams' },
    { value: '500K+', label: 'Tasks done' },
    { value: '99.9%', label: 'Uptime' },
  ],
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setSuccess(true);
    else setError(data.error || 'Failed to send reset email');
  }

  return (
    <AuthShell brand={brand}>
      {success ? (
        <div className="text-center">
          <StatusIcon tone="primary"><Icon.Inbox size={28} /></StatusIcon>
          <h1 className="font-display text-[1.6rem] font-extrabold text-fg">Check your inbox!</h1>
          <p className="mt-3 text-[14.5px] text-muted leading-relaxed">
            We sent a password reset link to<br />
            <strong className="text-fg">{email}</strong>
          </p>
          <p className="mt-4 mb-7 text-[13px] text-subtle">The link expires in 1 hour. Check your spam folder if you don&apos;t see it.</p>
          <Link href="/login" className="btn btn-gradient btn-lg w-full">
            <Icon.ArrowLeft size={17} />Back to Login
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 grid place-items-center w-12 h-12 rounded-2xl bg-primary-soft text-primary-text border border-line">
            <Icon.Key size={22} />
          </div>
          <AuthHeading title="Reset your password" subtitle="Enter your email and we'll send you a reset link." />

          {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field
              label="Email address" icon={<Icon.Mail size={17} />}
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email"
            />
            <SubmitButton loading={loading} loadingText="Sending…" className="mt-2">Send Reset Link</SubmitButton>
          </form>

          <AuthFooterLink text="Remember your password?" href="/login" cta="Sign in" />
        </>
      )}
    </AuthShell>
  );
}
