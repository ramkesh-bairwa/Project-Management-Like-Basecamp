'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const features = [
  {
    icon: '📋', label: 'Projects', desc: '12 active', color: '#e63946',
    bg: 'rgba(230,57,70,0.12)', border: 'rgba(230,57,70,0.25)',
    dots: ['Website Redesign', 'Mobile App', 'API Integration'],
  },
  {
    icon: '✅', label: 'Tasks', desc: '48 this week', color: '#2a9d8f',
    bg: 'rgba(42,157,143,0.12)', border: 'rgba(42,157,143,0.25)',
    dots: ['Design mockups', 'Review PR #42', 'Write unit tests'],
  },
  {
    icon: '👥', label: 'Members', desc: '24 online', color: '#457b9d',
    bg: 'rgba(69,123,157,0.12)', border: 'rgba(69,123,157,0.25)',
    dots: ['Alex Johnson', 'Sara Williams', 'Mike Chen'],
  },
  {
    icon: '🗂', label: 'Groups', desc: '6 teams', color: '#6d6875',
    bg: 'rgba(109,104,117,0.12)', border: 'rgba(109,104,117,0.25)',
    dots: ['Design Team', 'Backend Dev', 'QA Engineers'],
  },
];

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
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) router.replace('/dashboard');
    } catch { /* invalid token */ }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setUnverified(false);
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (res.status === 403 && data.error?.includes('verify')) { setUnverified(true); }
      setError(data.error);
      return;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', String(data.user.id));
    document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
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
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .feat-card { animation: float var(--dur,4s) ease-in-out infinite; animation-delay: var(--delay,0s); }
        .auth-input:focus { border-color: #457b9d !important; box-shadow: 0 0 0 3px rgba(69,123,157,0.15); }
        .sign-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .sign-btn { transition: all 0.2s; }
      `}</style>

      {/* ── Left panel ── */}
      <div style={{ width: '52%', background: 'linear-gradient(145deg,#0f1f35 0%,#1d3557 60%,#1a4a6b 100%)', display: 'flex', flexDirection: 'column', padding: '40px 48px', position: 'relative', overflow: 'hidden' }}
        className="hidden lg:flex">

        {/* Background circles */}
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(69,123,157,0.08)', top: -100, right: -100, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(230,57,70,0.06)', bottom: 50, left: -80, pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: '#e63946', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#fff', boxShadow: '0 4px 12px rgba(230,57,70,0.4)' }}>P</div>
          <span style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: '-0.3px' }}>ProjectHub</span>
        </div>

        {/* Feature cards grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, paddingTop: 32 }}>
          <div style={{ marginBottom: 8 }}>
            <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 28, margin: '0 0 6px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Everything your team<br />needs, in one place.
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>Manage projects, tasks, teams and more.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {features.map((f, i) => (
              <div key={f.label} className="feat-card"
                style={{ '--dur': `${3.5 + i * 0.5}s`, '--delay': `${i * 0.4}s`, background: f.bg, border: `1px solid ${f.border}`, borderRadius: 16, padding: '16px 18px', backdropFilter: 'blur(8px)' } as React.CSSProperties}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{f.icon}</span>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>{f.label}</div>
                    <div style={{ color: f.color, fontSize: 11, fontWeight: 600 }}>{f.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {f.dots.map(d => (
                    <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 500 }}>{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 32 }}>© 2025 ProjectHub. All rights reserved.</div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease' }}>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#e63946', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff' }}>P</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#1d3557' }}>ProjectHub</span>
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1d3557', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Welcome back 👋</h1>
          <p style={{ color: '#6b7a8d', fontSize: 14, margin: '0 0 28px' }}>Sign in to continue to your workspace</p>

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Unverified */}
          {unverified && (
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: '#c2410c', marginBottom: 6 }}>Email not verified</div>
              {resendMsg
                ? <p style={{ color: '#0f766e', fontWeight: 600, margin: 0 }}>✓ {resendMsg}</p>
                : <button onClick={resendVerification} disabled={resending} style={{ background: 'none', border: 'none', color: '#e63946', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 }}>
                    {resending ? 'Sending…' : '↺ Resend verification email'}
                  </button>
              }
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1d3557', marginBottom: 6 }}>Email address</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com" required className="auth-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #d0dce8', fontSize: 14, color: '#1d3557', background: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1d3557', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" required className="auth-input"
                  style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12, border: '1.5px solid #d0dce8', fontSize: 14, color: '#1d3557', background: '#fff', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 0 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="sign-btn"
              style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, boxShadow: '0 4px 14px rgba(230,57,70,0.35)' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <span style={{ fontSize: 14, color: '#6b7a8d' }}>No account? </span>
            <Link href="/register" style={{ fontSize: 14, fontWeight: 800, color: '#e63946', textDecoration: 'none' }}>Create one free →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
