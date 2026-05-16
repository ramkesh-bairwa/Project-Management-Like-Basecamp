'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ChatMeRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

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

      if (res.ok) {
        localStorage.setItem('token', data.token);
        router.push('/chatme');
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
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Left Side - Branding */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '40px', textDecoration: 'none' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid rgba(255,255,255,0.3)' }}>
              💬
            </div>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#fff' }}>ChatMe</span>
          </Link>

          <h1 style={{ fontSize: '48px', fontWeight: 900, marginBottom: '20px', lineHeight: 1.2 }}>
            Start Chatting Today
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.9, lineHeight: 1.7, marginBottom: '40px' }}>
            Join thousands of teams using ChatMe for seamless communication. Create your free account and start connecting instantly.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '🚀', text: 'Get started in under 60 seconds' },
              { icon: '💯', text: 'Free forever for unlimited messages' },
              { icon: '🔒', text: 'Enterprise-grade security & encryption' },
              { icon: '🌍', text: 'Access from anywhere, any device' },
            ].map((feature, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  {feature.icon}
                </div>
                <span style={{ fontSize: '16px', opacity: 0.95 }}>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div style={{ width: '550px', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', boxShadow: '-10px 0 40px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Create your account</h2>
            <p style={{ color: '#64748b', fontSize: '15px' }}>Start your free ChatMe journey</p>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '14px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => handleSocialLogin('Google')}
              style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '14px', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button
              onClick={() => handleSocialLogin('GitHub')}
              style={{ padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '14px', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#181717"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </button>
          </div>

          <div style={{ position: 'relative', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e2e8f0' }} />
            <span style={{ position: 'relative', background: '#fff', padding: '0 16px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
              OR SIGN UP WITH EMAIL
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '15px', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '15px', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '15px', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter your password"
                style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '15px', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', borderRadius: '10px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', fontSize: '16px', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {loading ? 'Creating account...' : 'Create ChatMe Account'}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginBottom: '20px' }}>
            By signing up, you agree to our{' '}
            <Link href="/terms" style={{ color: '#667eea', textDecoration: 'none' }}>Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" style={{ color: '#667eea', textDecoration: 'none' }}>Privacy Policy</Link>
          </p>

          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>
              Already have an account?{' '}
              <Link href="/login/chatme" style={{ color: '#667eea', fontWeight: 700, textDecoration: 'none' }}>
                Sign in
              </Link>
            </span>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <Link href="/register/projects" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
              Need Projects instead? <span style={{ color: '#e63946' }}>Sign up here →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
