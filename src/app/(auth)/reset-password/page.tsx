'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell, {
  Alert, AuthHeading, Icon, PasswordField, StatusIcon, StrengthMeter, SubmitButton,
  type BrandContent,
} from '@/components/auth/AuthShell';

const brand: BrandContent = {
  eyebrow: 'Account recovery',
  title: <>Set a new,<br /><span className="text-gradient">stronger password.</span></>,
  subtitle: "Choose something unique you haven't used before. You'll be back in your workspace in seconds.",
  preview: 'security',
  features: ['Secure password encryption', 'Instant access restoration', 'Email confirmation', 'Sessions stay protected'],
};

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Invalid or missing reset token');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } else {
      setError(data.error || 'Failed to reset password');
    }
  }

  return (
    <AuthShell brand={brand}>
      {success ? (
        <div className="text-center">
          <StatusIcon tone="success"><Icon.CheckCircle size={30} /></StatusIcon>
          <h1 className="font-display text-[1.6rem] font-extrabold text-fg">Password Reset Successful!</h1>
          <p className="mt-3 text-[14.5px] text-muted inline-flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-r-transparent" style={{ animation: 'spin .7s linear infinite' }} />
            Redirecting to login...
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid place-items-center w-12 h-12 rounded-2xl bg-primary-soft text-primary-text border border-line">
            <Icon.Lock size={22} />
          </div>
          <AuthHeading title="Set new password" subtitle="Enter your new password below." />

          {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <PasswordField
                label="New Password" show={showPass} onToggleShow={() => setShowPass(p => !p)}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="new-password"
              />
              <StrengthMeter password={password} />
            </div>
            <PasswordField
              label="Confirm Password" show={showConfirm} onToggleShow={() => setShowConfirm(p => !p)}
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••" required autoComplete="new-password"
              hint={confirmPassword && confirmPassword === password
                ? <span className="inline-flex items-center gap-1" style={{ color: 'var(--success-text)' }}><Icon.Check size={13} />Passwords match</span>
                : undefined}
            />
            <SubmitButton loading={loading} disabled={!token} loadingText="Resetting…" className="mt-2">Reset Password</SubmitButton>
          </form>
        </>
      )}

      <Link href="/login" className="mt-7 inline-flex items-center justify-center gap-1.5 w-full text-[14px] font-semibold text-muted hover:text-fg transition">
        <Icon.ArrowLeft size={15} />Back to Login
      </Link>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
