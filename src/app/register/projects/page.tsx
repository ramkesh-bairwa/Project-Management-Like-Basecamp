'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell, {
  Alert, AuthFooterLink, AuthHeading, Divider, Field, Icon, PasswordField, SocialButton, StrengthMeter, SubmitButton,
  type BrandContent,
} from '@/components/auth/AuthShell';

const brand: BrandContent = {
  eyebrow: 'ProjectHub · Projects',
  title: <>Start managing<br /><span className="text-gradient">projects today.</span></>,
  subtitle: 'Join thousands of teams delivering projects faster with ProjectHub. Create your free account and transform how you work.',
  preview: 'board',
  features: ['Set up your first project in minutes', 'Free forever with unlimited tasks', 'Bank-level security & data protection', 'Collaborate from anywhere in the world'],
};

export default function ProjectsRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        router.push('/dashboard');
      } else if (res.ok) {
        // No token: account must be verified by email or approved by an admin first
        setInfo(data.message || 'Account created. You can log in once it is verified.');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: string) {
    setError(`${provider} signup coming soon!`);
  }

  return (
    <AuthShell brand={brand}>
      <AuthHeading title="Create your account" subtitle="Start your free ProjectHub journey." />

      {(error || info) && (
        <div className="flex flex-col gap-3 mb-5">
          {error && <Alert tone="danger">{error}</Alert>}
          {info && <Alert tone="success">{info}</Alert>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <SocialButton provider="google" onClick={() => handleSocialLogin('Google')}>Google</SocialButton>
        <SocialButton provider="github" onClick={() => handleSocialLogin('GitHub')}>GitHub</SocialButton>
      </div>

      <Divider label="or sign up with email" />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Full Name" icon={<Icon.User size={17} />}
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          required placeholder="John Doe" autoComplete="name"
        />
        <Field
          label="Email Address" icon={<Icon.Mail size={17} />}
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          required placeholder="you@example.com" autoComplete="email"
        />
        <div>
          <PasswordField
            label="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            required placeholder="At least 6 characters" autoComplete="new-password"
          />
          <StrengthMeter password={password} />
        </div>
        <PasswordField
          label="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
          required placeholder="Re-enter your password" autoComplete="new-password"
          hint={confirmPassword && confirmPassword === password
            ? <span className="inline-flex items-center gap-1" style={{ color: 'var(--success-text)' }}><Icon.Check size={13} />Passwords match</span>
            : undefined}
        />
        <SubmitButton loading={loading} loadingText="Creating account..." className="mt-2">Create Projects Account</SubmitButton>
      </form>

      <p className="mt-5 text-center text-[12px] text-subtle">
        By signing up, you agree to our{' '}
        <Link href="/terms" className="font-medium text-primary-text hover:underline underline-offset-4">Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" className="font-medium text-primary-text hover:underline underline-offset-4">Privacy Policy</Link>
      </p>

      <AuthFooterLink text="Already have an account?" href="/login/projects" cta="Sign in" />

      <div className="mt-6 pt-6 border-t border-line text-center">
        <Link href="/register/chatme" className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg transition">
          Need ChatMe instead? <span className="font-semibold text-primary-text inline-flex items-center gap-1">Sign up here<Icon.ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></span>
        </Link>
      </div>
    </AuthShell>
  );
}
