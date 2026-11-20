'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell, {
  Alert, AuthFooterLink, AuthHeading, Divider, Field, Icon, PasswordField, SocialButton, SubmitButton, TextLink,
  type BrandContent,
} from '@/components/auth/AuthShell';

const brand: BrandContent = {
  eyebrow: 'ProjectHub · Projects',
  title: <>Manage projects<br /><span className="text-gradient">like a pro.</span></>,
  subtitle: 'Complete project management solution with tasks, teams, timelines, and powerful collaboration tools. Everything you need to deliver projects on time.',
  preview: 'board',
  features: ['Task management with priorities & deadlines', 'Visual dashboards and progress tracking', 'Team collaboration and assignments', 'Analytics and performance reports'],
};

export default function ProjectsLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: string) {
    setError(`${provider} login coming soon!`);
  }

  return (
    <AuthShell brand={brand}>
      <AuthHeading title="Welcome back!" subtitle="Sign in to continue to Projects." />

      <div className="grid grid-cols-2 gap-2.5">
        <SocialButton provider="google" onClick={() => handleSocialLogin('Google')}>Google</SocialButton>
        <SocialButton provider="github" onClick={() => handleSocialLogin('GitHub')}>GitHub</SocialButton>
      </div>

      <Divider label="or continue with email" />

      {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Email Address" icon={<Icon.Mail size={17} />}
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          required placeholder="you@example.com" autoComplete="email"
        />
        <PasswordField
          label="Password" labelRight={<TextLink href="/forgot-password/projects">Forgot Password?</TextLink>}
          value={password} onChange={(e) => setPassword(e.target.value)}
          required placeholder="Enter your password" autoComplete="current-password"
        />
        <SubmitButton loading={loading} loadingText="Signing in..." className="mt-2">Sign In to Projects</SubmitButton>
      </form>

      <AuthFooterLink text="Don't have an account?" href="/register/projects" cta="Sign up" />

      <div className="mt-6 pt-6 border-t border-line text-center">
        <Link href="/login/chatme" className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-fg transition">
          Looking for ChatMe? <span className="font-semibold text-primary-text inline-flex items-center gap-1">Sign in here<Icon.ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></span>
        </Link>
      </div>
    </AuthShell>
  );
}
