'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const bgIcons = [
  {icon:'📋',x:5,y:8,s:32},{icon:'✅',x:18,y:22,s:24},{icon:'👥',x:33,y:5,s:40},{icon:'🗂',x:47,y:15,s:28},
  {icon:'📊',x:62,y:3,s:36},{icon:'💬',x:78,y:18,s:22},{icon:'🚀',x:88,y:8,s:44},{icon:'📅',x:12,y:38,s:26},
  {icon:'🔒',x:25,y:52,s:38},{icon:'⚡',x:40,y:42,s:20},{icon:'🎯',x:55,y:58,s:34},{icon:'📌',x:70,y:35,s:28},
  {icon:'🔔',x:83,y:48,s:42},{icon:'📎',x:92,y:30,s:24},{icon:'🏆',x:7,y:65,s:36},{icon:'✏️',x:20,y:75,s:28},
  {icon:'📁',x:35,y:68,s:44},{icon:'🔗',x:50,y:80,s:22},{icon:'🖥️',x:65,y:72,s:38},{icon:'🧩',x:80,y:62,s:30},
  {icon:'🔧',x:90,y:78,s:26},{icon:'🗓️',x:3,y:85,s:40},{icon:'💡',x:15,y:90,s:32},{icon:'🏅',x:28,y:88,s:24},
  {icon:'🔍',x:42,y:92,s:36},{icon:'📝',x:58,y:85,s:28},{icon:'🌐',x:72,y:90,s:44},{icon:'🎨',x:85,y:82,s:20},
  {icon:'📋',x:95,y:55,s:30},{icon:'✅',x:8,y:48,s:38},{icon:'👥',x:22,y:60,s:24},{icon:'🗂',x:38,y:28,s:42},
  {icon:'📊',x:52,y:35,s:28},{icon:'💬',x:67,y:25,s:36},{icon:'🚀',x:75,y:45,s:22},{icon:'📅',x:87,y:65,s:40},
  {icon:'🔒',x:93,y:12,s:26},{icon:'⚡',x:10,y:18,s:44},{icon:'🎯',x:30,y:12,s:30},{icon:'📌',x:45,y:25,s:38},
  {icon:'🔔',x:60,y:48,s:24},{icon:'📎',x:73,y:58,s:42},{icon:'🏆',x:82,y:38,s:28},{icon:'✏️',x:96,y:42,s:36},
  {icon:'📁',x:14,y:72,s:22},{icon:'🔗',x:27,y:82,s:40},{icon:'🖥️',x:43,y:78,s:32},{icon:'🧩',x:57,y:68,s:26},
  {icon:'🔧',x:68,y:88,s:44},{icon:'🗓️',x:77,y:75,s:30},{icon:'💡',x:89,y:92,s:36},{icon:'🏅',x:4,y:95,s:24},
  {icon:'🔍',x:19,y:55,s:40},{icon:'📝',x:36,y:45,s:28},{icon:'🌐',x:53,y:15,s:34},{icon:'🎨',x:71,y:8,s:22},
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
    
    if (emailParam) {
      setForm(p => ({ ...p, email: emailParam }));
    }
    
    // Store invite token if present
    if (inviteToken) {
      sessionStorage.setItem('invite_token', inviteToken);
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now() && payload.role !== 'admin') {
        router.replace('/dashboard');
      }
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
    
    // Handle invitation if present
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#0a1628', position: 'relative' }}>
      <style>{`
        @keyframes floatIcon { 0%,100%{transform:translateY(0) rotate(0deg);opacity:0.06} 50%{transform:translateY(-18px) rotate(10deg);opacity:0.12} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .auth-input:focus { border-color: #457b9d !important; box-shadow: 0 0 0 3px rgba(69,123,157,0.2) !important; outline: none; }
        .auth-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .sign-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(230,57,70,0.45) !important; }
        .sign-btn { transition: all 0.2s; }
      `}</style>

      {/* Floating background icons */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {bgIcons.map((item, i) => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: item.s,
            left: `${item.x}%`,
            top: `${item.y}%`,
            animation: `floatIcon ${3 + (i % 6)}s ease-in-out infinite`,
            animationDelay: `${(i * 0.22) % 4}s`,
            opacity: 0.07,
          }}>{item.icon}</div>
        ))}
      </div>

      {/* Form card */}
      <div style={{ width: '100%', maxWidth: 440, padding: '0 24px', position: 'relative', zIndex: 1, animation: 'fadeUp 0.4s ease' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 17, boxShadow: '0 4px 14px rgba(230,57,70,0.4)' }}>P</div>
          <span style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: '-0.3px' }}>ProjectHub</span>
        </Link>

        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '40px 36px', backdropFilter: 'blur(20px)' }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Welcome back 👋</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 28px' }}>Sign in to continue to your workspace</p>

          {error && (
            <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          {unverified && (
            <div style={{ background: 'rgba(244,162,97,0.1)', border: '1px solid rgba(244,162,97,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>Email not verified</div>
              {resendMsg
                ? <p style={{ color: '#34d399', fontWeight: 600, margin: 0 }}>✓ {resendMsg}</p>
                : <button onClick={resendVerification} disabled={resending} style={{ background: 'none', border: 'none', color: '#e63946', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13 }}>
                    {resending ? 'Sending…' : '↺ Resend verification email'}
                  </button>
              }
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Email address</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com" required className="auth-input"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 14, color: '#fff', background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••" required className="auth-input"
                  style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 14, color: '#fff', background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box' }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="sign-btn"
              style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, boxShadow: '0 4px 16px rgba(230,57,70,0.35)' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>No account? </span>
            <Link href="/register" style={{ fontSize: 14, fontWeight: 800, color: '#e63946', textDecoration: 'none' }}>Create one free →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
