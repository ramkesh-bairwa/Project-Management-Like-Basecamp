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

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [emailFailed, setEmailFailed] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{ project_name: string; invited_by: string } | null>(null);

  useEffect(() => {
    // Check for invitation token
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
      // Fetch invitation details
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#0a1628', position: 'relative', padding: '40px 24px' }}>
      <style>{`
        @keyframes floatIcon { 0%,100%{transform:translateY(0) rotate(0deg);opacity:0.06} 50%{transform:translateY(-18px) rotate(10deg);opacity:0.12} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .auth-input:focus { border-color: #2a9d8f !important; box-shadow: 0 0 0 3px rgba(42,157,143,0.2) !important; outline: none; }
        .auth-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .reg-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(230,57,70,0.45) !important; }
        .reg-btn { transition: all 0.2s; }
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
      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1, animation: 'fadeUp 0.4s ease' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32, textDecoration: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 17, boxShadow: '0 4px 14px rgba(230,57,70,0.4)' }}>P</div>
          <span style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: '-0.3px' }}>ProjectHub</span>
        </Link>

        {verifyPending ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '40px 32px', textAlign: 'center', backdropFilter: 'blur(20px)' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>Check your inbox!</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', lineHeight: 1.6 }}>
              We sent a verification link to<br />
              <strong style={{ color: '#a8dadc' }}>{form.email}</strong>
            </p>
            {emailFailed && (
              <div style={{ background: 'rgba(244,162,97,0.1)', border: '1px solid rgba(244,162,97,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fbbf24' }}>
                ⚠ Email delivery failed: {emailFailed}
              </div>
            )}
            {resendMsg && (
              <div style={{ background: 'rgba(42,157,143,0.1)', border: '1px solid rgba(42,157,143,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#34d399', fontWeight: 600 }}>
                ✓ {resendMsg}
              </div>
            )}
            <button onClick={resendVerification} disabled={resending} className="reg-btn"
              style={{ width: '100%', padding: '12px', borderRadius: 12, background: '#457b9d', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: resending ? 'not-allowed' : 'pointer', opacity: resending ? 0.7 : 1, marginBottom: 12 }}>
              {resending ? 'Sending…' : '↺ Resend Verification Email'}
            </button>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Back to Login</Link>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '40px 36px', backdropFilter: 'blur(20px)' }}>
            {inviteInfo && (
              <div style={{ background: 'rgba(42,157,143,0.1)', border: '1px solid rgba(42,157,143,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: '#34d399', marginBottom: 4 }}>🎉 You've been invited!</div>
                <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <strong>{inviteInfo.invited_by}</strong> invited you to join <strong>{inviteInfo.project_name}</strong>
                </div>
              </div>
            )}
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Create your account 🚀</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 28px' }}>Free forever. No credit card required.</p>

            {error && (
              <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5', fontWeight: 500 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Full name</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Jane Smith" required className="auth-input"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 14, color: '#fff', background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box' }} />
              </div>
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
                    placeholder="Min. 8 characters" required minLength={8} className="auth-input"
                    style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 14, color: '#fff', background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box' }} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="reg-btn"
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, boxShadow: '0 4px 16px rgba(230,57,70,0.35)' }}>
                {loading ? 'Creating account…' : 'Create free account →'}
              </button>
            </form>

            {/* Trust badges */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 20 }}>
              {[['🔒', 'Secure', 'End-to-end'], ['⚡', 'Fast', 'Instant setup'], ['🆓', 'Free', 'No card needed']].map(([icon, title, sub]) => (
                <div key={title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Already have an account? </span>
              <Link href="/login" style={{ fontSize: 14, fontWeight: 800, color: '#e63946', textDecoration: 'none' }}>Sign in →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
