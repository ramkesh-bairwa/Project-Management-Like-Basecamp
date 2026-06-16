'use client';
import { useState } from 'react';
import Link from 'next/link';

const features = [
  { icon: '🔑', title: 'Secure Reset', desc: 'Password reset link expires in 1 hour for your safety' },
  { icon: '📧', title: 'Instant Email', desc: 'Reset link delivered to your inbox within seconds' },
  { icon: '🔒', title: 'Account Protection', desc: 'Your account stays safe with our verification process' },
  { icon: '⚡', title: 'Quick Recovery', desc: 'Back to your workspace in under 2 minutes' },
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setSuccess(true);
    else setError(data.error || 'Failed to send reset email');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .auth-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .auth-input:focus { border-color: #e63946 !important; box-shadow: 0 0 0 3px rgba(230,57,70,0.12) !important; outline: none; }
        .sign-btn { transition: all 0.2s; }
        .sign-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(230,57,70,0.4) !important; }
        .feat-card { transition: transform 0.2s; }
        .feat-card:hover { transform: translateX(4px); }
        @media (max-width: 768px) { .left-panel { display: none !important; } .right-panel { width: 100% !important; } }
      `}</style>

      {/* LEFT PANEL */}
      <div className="left-panel" style={{
        width: '52%', minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(145deg, #0f0c29, #302b63, #24243e)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px',
      }}>
        <div style={{ position: 'absolute', top: -120, left: -120, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,57,70,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(69,123,157,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56, textDecoration: 'none' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#e63946,#c1121f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 20, boxShadow: '0 6px 20px rgba(230,57,70,0.5)' }}>P</div>
          <span style={{ fontWeight: 900, fontSize: 22, color: '#fff', letterSpacing: '-0.3px' }}>ProjectHub</span>
        </Link>

        <div style={{ marginBottom: 48, animation: 'fadeUp 0.5s ease' }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.15, letterSpacing: '-1px' }}>
            Forgot your<br />
            <span style={{ background: 'linear-gradient(90deg,#e63946,#ff6b6b,#e63946)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s ease infinite' }}>password?</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0, maxWidth: 380 }}>
            No worries — it happens to the best of us. Enter your email and we'll send you a secure reset link.
          </p>
        </div>

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

        <div style={{ display: 'flex', gap: 32, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[{ value: '10K+', label: 'Teams' }, { value: '500K+', label: 'Tasks Done' }, { value: '99.9%', label: 'Uptime' }].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel" style={{
        width: '48%', minHeight: '100vh', background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'fadeUp 0.4s ease' }}>

          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 60, marginBottom: 20 }}>✉️</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', margin: '0 0 10px' }}>Check your inbox!</h2>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: '0 0 28px' }}>
                We sent a password reset link to<br />
                <strong style={{ color: '#e63946' }}>{email}</strong>
              </p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 28px' }}>The link expires in 1 hour. Check your spam folder if you don't see it.</p>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 16px rgba(230,57,70,0.3)' }}>
                ← Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1a1a2e', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Reset your password 🔑</h2>
              <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 32px', lineHeight: 1.5 }}>Enter your email and we'll send you a reset link</p>

              {error && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required className="auth-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: 14, color: '#1a1a2e', background: '#fafafa', boxSizing: 'border-box' }} />
                </div>
                <button type="submit" disabled={loading} className="sign-btn"
                  style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, boxShadow: '0 4px 16px rgba(230,57,70,0.3)' }}>
                  {loading ? 'Sending…' : 'Send Reset Link →'}
                </button>
              </form>

              <div style={{ marginTop: 28, paddingTop: 28, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                <span style={{ fontSize: 14, color: '#6b7280' }}>Remember your password? </span>
                <Link href="/login" style={{ fontSize: 14, fontWeight: 800, color: '#e63946', textDecoration: 'none' }}>Sign in →</Link>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24 }}>
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
