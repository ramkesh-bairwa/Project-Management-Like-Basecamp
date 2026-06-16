'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const features = [
  { icon: '📋', title: 'Project Boards', desc: 'Organize tasks with drag-and-drop Kanban boards' },
  { icon: '💬', title: 'Team Chat', desc: 'Real-time messaging built into every project' },
  { icon: '📊', title: 'Progress Tracking', desc: 'Visual reports and milestone tracking' },
  { icon: '🔔', title: 'Smart Notifications', desc: 'Never miss an update that matters to you' },
];

const stats = [
  { value: '10K+', label: 'Teams' },
  { value: '500K+', label: 'Tasks Done' },
  { value: '99.9%', label: 'Uptime' },
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
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const inviteToken = params.get('invite');
    if (emailParam) setForm(p => ({ ...p, email: emailParam }));
    if (inviteToken) sessionStorage.setItem('invite_token', inviteToken);
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
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .auth-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .auth-input:focus { border-color: #e63946 !important; box-shadow: 0 0 0 3px rgba(230,57,70,0.12) !important; outline: none; }
        .sign-btn { transition: all 0.2s; }
        .sign-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(230,57,70,0.4) !important; }
        .feat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .feat-card:hover { transform: translateX(4px); }
        .social-btn { transition: all 0.18s; border: 1.5px solid #e5e7eb; background: #fff; border-radius: 12px; padding: 11px 16px; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: #374151; width: 100%; }
        .social-btn:hover { background: #f9fafb; border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transform: translateY(-1px); }
        @media (max-width: 768px) { .left-panel { display: none !important; } .right-panel { width: 100% !important; } }
      `}</style>

      {/* LEFT PANEL */}
      <div className="left-panel" style={{
        width: '52%', minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0f0c29, #302b63, #24243e)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -120, left: -120, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,57,70,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(69,123,157,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '45%', right: '10%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56, textDecoration: 'none' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#e63946,#c1121f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 20, boxShadow: '0 6px 20px rgba(230,57,70,0.5)' }}>P</div>
          <span style={{ fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.3px' }}>ProjectHub</span>
        </Link>

        {/* Headline */}
        <div style={{ marginBottom: 48, animation: 'fadeUp 0.5s ease' }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-1px' }}>
            Manage projects<br />
            <span style={{ background: 'linear-gradient(90deg,#e63946,#ff6b6b,#e63946)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s ease infinite' }}>like a pro.</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0, maxWidth: 380 }}>
            Everything your team needs — tasks, chat, docs, and deadlines — all in one beautiful workspace.
          </p>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 48 }}>
          {features.map((f, i) => (
            <div key={i} className="feat-card" style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, padding: '14px 18px',
              animation: `fadeUp 0.5s ease ${0.1 + i * 0.08}s both`,
            }}>
              <div style={{ fontSize: 24, width: 44, height: 44, borderRadius: 12, background: 'rgba(230,57,70,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 32, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {stats.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="right-panel" style={{
        width: '48%', minHeight: '100vh', background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease' }}>

          {/* Mobile-only logo */}
          <Link href="/" style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#e63946,#c1121f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16 }}>P</div>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#1a1a2e' }}>ProjectHub</span>
          </Link>

          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1a1a2e', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Welcome back 👋</h2>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>Sign in to continue to your workspace</p>

          {/* Social login buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            <a href="/api/auth/oauth/google" className="social-btn">
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-8 19.6-20 0-1.3-.1-2.7-.4-4z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.2C9.5 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.4-2.4 4.4-4.5 5.8l6.2 5.2C40.7 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/></svg>
              Continue with Google
            </a>
            <a href="/api/auth/oauth/github" className="social-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1a1a2e"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.4.6.1.82-.26.82-.58v-2.03c-3.34.72-4.04-1.6-4.04-1.6-.54-1.38-1.33-1.75-1.33-1.75-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.06 1.82 2.79 1.29 3.47.99.1-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.9 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12C24 5.37 18.63 0 12 0z"/></svg>
              Continue with GitHub
            </a>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          </div>

          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {unverified && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: '#d97706', marginBottom: 6 }}>Email not verified</div>
              {resendMsg
                ? <p style={{ color: '#059669', fontWeight: 600, margin: 0 }}>✓ {resendMsg}</p>
                : <button onClick={resendVerification} disabled={resending} style={{ background: 'none', border: 'none', color: '#e63946', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 }}>
                    {resending ? 'Sending…' : '↺ Resend verification email'}
                  </button>
              }
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Email address</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com" required className="auth-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#1a1a2e', background: '#fafafa', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: 12, fontWeight: 600, color: '#e63946', textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" required className="auth-input"
                  style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#1a1a2e', background: '#fafafa', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af', padding: 0 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="sign-btn"
              style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, boxShadow: '0 4px 16px rgba(230,57,70,0.3)', transition: 'all 0.2s' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ marginTop: 28, paddingTop: 28, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
            <span style={{ fontSize: 14, color: '#6b7280' }}>Don't have an account? </span>
            <Link href="/register" style={{ fontSize: 14, fontWeight: 800, color: '#e63946', textDecoration: 'none' }}>Create one free →</Link>
          </div>

          {/* Trust row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24 }}>
            {['🔒 Secure', '⚡ Fast', '🆓 Free forever'].map(t => (
              <span key={t} style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
