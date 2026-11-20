'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthShell, {
  Alert, AuthHeading, Icon, PasswordField, StatusIcon, StrengthMeter, SubmitButton,
  type BrandContent,
} from '@/components/auth/AuthShell';

const brand: BrandContent = {
  eyebrow: 'Projects · Account recovery',
  title: <>Create a new<br /><span className="text-gradient">secure password.</span></>,
  subtitle: 'Pick something strong and unique. You will be redirected to sign in as soon as it is saved.',
  preview: 'security',
  features: ['Secure password encryption', 'Instant access restoration', 'Email confirmation', 'Sessions stay protected'],
};

function ResetPasswordProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/login/projects'), 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell brand={brand}>
      {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

      {success ? (
        <div className="text-center">
          <StatusIcon tone="success"><Icon.CheckCircle size={30} /></StatusIcon>
          <h1 className="font-display text-[1.6rem] font-extrabold text-fg">Password Reset Successful!</h1>
          <p className="mt-3 mb-6 text-[14.5px] text-muted">Redirecting to login...</p>
          <Link href="/login/projects" className="btn btn-secondary btn-lg w-full">Go to login now</Link>
        </div>
      ) : (
        <>
          <div className="mb-6 grid place-items-center w-12 h-12 rounded-2xl bg-primary-soft text-primary-text border border-line">
            <Icon.Lock size={22} />
          </div>
          <AuthHeading title="Reset Password" subtitle="Enter your new password for Projects." />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <PasswordField
                label="New Password" show={showPassword} onToggleShow={() => setShowPassword(!showPassword)}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password" required autoComplete="new-password"
                hint="Minimum 6 characters"
              />
              <StrengthMeter password={password} />
            </div>
            <PasswordField
              label="Confirm Password" show={showConfirm} onToggleShow={() => setShowConfirm(!showConfirm)}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password" required autoComplete="new-password"
            />
            <SubmitButton loading={loading} disabled={!token} loadingText="Resetting..." className="mt-2">Reset Password</SubmitButton>
            <Link href="/login/projects" className="inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold text-muted hover:text-fg transition">
              <Icon.ArrowLeft size={15} />Back to login
            </Link>
          </form>
        </>
      )}

      <div className="mt-8 pt-6 border-t border-line text-center text-[13px] text-muted">
        Need ChatMe access?{' '}
        <Link href="/reset-password/chatme" className="font-semibold text-primary-text hover:underline underline-offset-4">Reset ChatMe password</Link>
      </div>
    </AuthShell>
  );
}

export default function ResetPasswordProjects() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordProjectsContent />
    </Suspense>
  );
}
