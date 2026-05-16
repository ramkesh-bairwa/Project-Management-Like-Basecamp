'use client';
import { useState } from 'react';
import Link from 'next/link';

const bgIcons = [
  {icon:'📋',x:5,y:8,s:32},{icon:'✅',x:18,y:22,s:24},{icon:'👥',x:33,y:5,s:40},{icon:'🗂',x:47,y:15,s:28},
  {icon:'📊',x:62,y:3,s:36},{icon:'💬',x:78,y:18,s:22},{icon:'🚀',x:88,y:8,s:44},{icon:'📅',x:12,y:38,s:26},
  {icon:'🔒',x:25,y:52,s:38},{icon:'⚡',x:40,y:42,s:20},{icon:'🎯',x:55,y:58,s:34},{icon:'📌',x:70,y:35,s:28},
  {icon:'🔔',x:83,y:48,s:42},{icon:'📎',x:92,y:30,s:24},{icon:'🏆',x:7,y:65,s:36},{icon:'✏️',x:20,y:75,s:28},
  {icon:'📁',x:35,y:68,s:44},{icon:'🔗',x:50,y:80,s:22},{icon:'🖥️',x:65,y:72,s:38},{icon:'🧩',x:80,y:62,s:30},
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
    } else {
      setError(data.error || 'Failed to send reset email');
    }
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
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Reset Password 🔑</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 28px' }}>Enter your email to receive a password reset link</p>

          {error && (
            <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          {success ? (
            <div>
              <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12, padding: '16px', marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✉️</div>
                <div style={{ fontWeight: 700, color: '#34d399', fontSize: 15, marginBottom: 4 }}>Check your email!</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>We've sent a password reset link to <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{email}</strong></div>
              </div>
              <Link href="/login" style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 16px rgba(230,57,70,0.35)' }}>
                ← Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required className="auth-input"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 14, color: '#fff', background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={loading} className="sign-btn"
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, boxShadow: '0 4px 16px rgba(230,57,70,0.35)' }}>
                {loading ? 'Sending…' : 'Send Reset Link →'}
              </button>
            </form>
          )}

          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 800, color: '#457b9d', textDecoration: 'none' }}>← Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
