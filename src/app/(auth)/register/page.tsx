'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const highlights = [
  { icon: '🚀', title: 'Up and running in minutes', desc: 'No setup headaches — invite your team and go' },
  { icon: '🗂️', title: 'Everything in one place', desc: 'Tasks, files, chat, and timelines together' },
  { icon: '👥', title: 'Built for collaboration', desc: 'Real-time updates so everyone stays in sync' },
  { icon: '📈', title: 'Ship faster, stress less', desc: 'Clear priorities and deadlines drive results' },
];

const testimonial = {
  text: '"ProjectHub cut our weekly stand-ups in half. The team finally knows what everyone is working on."',
  name: 'Sarah K.',
  role: 'Engineering Lead',
  avatar: '👩‍💻',
};

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
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
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
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .auth-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .auth-input:focus { border-color: #e63946 !important; box-shadow: 0 0 0 3px rgba(230,57,70,0.12) !important; outline: none; }
        .reg-btn { transition: all 0.2s; }
        .reg-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(230,57,70,0.4) !important; }
        .hi-card { transition: transform 0.2s; }
        .hi-card:hover { transform: translateX(4px); }
        .social-btn { transition: all 0.18s; border: 1.5px solid #e5e7eb; background: #fff; border-radius: 12px; padding: 11px 16px; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: #374151; width: 100%; text-decoration: none; }
        .social-btn:hover { background: #f9fafb; border-color: #d1d5db; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transform: translateY(-1px); }
        @media (max-width: 768px) { .left-panel { display: none !important; } .right-panel { width: 100% !important; } }
      `}</style>

      {/* LEFT PANEL */}
      <div className="left-panel" style={{
        width: '52%', minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0f2027, #203a43, #2c5364)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px',
      }}>
        {/* Blobs */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,57,70,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(44,83,100,0.5) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 52, textDecoration: 'none' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#e63946,#c1121f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 20, boxShadow: '0 6px 20px rgba(230,57,70,0.5)' }}>P</div>
          <span style={{ fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.3px' }}>ProjectHub</span>
        </Link>

        {/* Headline */}
        <div style={{ marginBottom: 44, animation: 'fadeUp 0.5s ease' }}>
          <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.15, letterSpacing: '-1px' }}>
            Your team's new<br />
            <span style={{ background: 'linear-gradient(90deg,#e63946,#ff8c69,#e63946)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s ease infinite' }}>command center.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, margin: 0, maxWidth: 360 }}>
            Join thousands of teams who ship projects on time with ProjectHub's all-in-one workspace.
          </p>
        </div>

        {/* Highlights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 44 }}>
          {highlights.map((h, i) => (
            <div key={i} className="hi-card" style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 14, padding: '13px 16px',
              animation: `fadeUp 0.5s ease ${0.1 + i * 0.08}s both`,
            }}>
              <div style={{ fontSize: 22, width: 42, height: 42, borderRadius: 11, background: 'rgba(230,57,70,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{h.icon}</div>
              <div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 13, marginBottom: 2 }}>{h.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.4 }}>{h.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 22px' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', lineHeight: 1.6, margin: '0 0 14px' }}>{testimonial.text}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 26 }}>{testimonial.avatar}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{testimonial.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{testimonial.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="right-panel" style={{
        width: '48%', minHeight: '100vh', background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 32px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease' }}>

          {verifyPending ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 60, marginBottom: 20 }}>📧</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', margin: '0 0 10px' }}>Check your inbox!</h2>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: '0 0 28px' }}>
                We sent a verification link to<br />
                <strong style={{ color: '#e63946' }}>{form.email}</strong>
              </p>
              {emailFailed && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#d97706' }}>
                  ⚠ Email delivery failed: {emailFailed}
                </div>
              )}
              {resendMsg && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#059669', fontWeight: 600 }}>
                  ✓ {resendMsg}
                </div>
              )}
              <button onClick={resendVerification} disabled={resending} className="reg-btn"
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: resending ? 'not-allowed' : 'pointer', opacity: resending ? 0.7 : 1, marginBottom: 16, boxShadow: '0 4px 16px rgba(230,57,70,0.3)' }}>
                {resending ? 'Sending…' : '↺ Resend Verification Email'}
              </button>
              <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', textDecoration: 'none' }}>← Back to Login</Link>
            </div>
          ) : (
            <>
              {inviteInfo && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 18px', marginBottom: 24, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, color: '#059669', marginBottom: 4 }}>🎉 You've been invited!</div>
                  <div style={{ color: '#374151' }}>
                    <strong>{inviteInfo.invited_by}</strong> invited you to join <strong>{inviteInfo.project_name}</strong>
                  </div>
                </div>
              )}

              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1a1a2e', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Create your account 🚀</h2>
              <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>Free forever. No credit card required.</p>

              {/* Social signup buttons */}
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
                <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, whiteSpace: 'nowrap' }}>or sign up with email</span>
                <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
              </div>

              {error && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#dc2626', fontWeight: 500, display: 'flex', gap: 8 }}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Full name</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Jane Smith" required className="auth-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#1a1a2e', background: '#fafafa', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Email address</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="you@example.com" required className="auth-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#1a1a2e', background: '#fafafa', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Min. 8 characters" required minLength={8} className="auth-input"
                      style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#1a1a2e', background: '#fafafa', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af', padding: 0 }}>
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="reg-btn"
                  style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, boxShadow: '0 4px 16px rgba(230,57,70,0.3)' }}>
                  {loading ? 'Creating account…' : 'Create free account →'}
                </button>
              </form>

              <div style={{ marginTop: 28, paddingTop: 28, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                <span style={{ fontSize: 14, color: '#6b7280' }}>Already have an account? </span>
                <Link href="/login" style={{ fontSize: 14, fontWeight: 800, color: '#e63946', textDecoration: 'none' }}>Sign in →</Link>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
                {['🔒 Secure', '⚡ Fast', '🆓 Free forever'].map(t => (
                  <span key={t} style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
