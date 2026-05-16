'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const bgIcons = [
  {icon:'📋',x:5,y:8,s:32},{icon:'✅',x:18,y:22,s:24},{icon:'👥',x:33,y:5,s:40},{icon:'🗂',x:47,y:15,s:28},
  {icon:'📊',x:62,y:3,s:36},{icon:'💬',x:78,y:18,s:22},{icon:'🚀',x:88,y:8,s:44},{icon:'📅',x:12,y:38,s:26},
  {icon:'🔒',x:25,y:52,s:38},{icon:'⚡',x:40,y:42,s:20},{icon:'🎯',x:55,y:58,s:34},{icon:'📌',x:70,y:35,s:28},
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Invalid or missing reset token');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } else {
      setError(data.error || 'Failed to reset password');
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
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Set New Password 🔐</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '0 0 28px' }}>Enter your new password below</p>

          {error && (
            <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#fca5a5', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          {success ? (
            <div>
              <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12, padding: '16px', marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, color: '#34d399', fontSize: 15, marginBottom: 4 }}>Password Reset Successful!</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Redirecting to login...</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required className="auth-input"
                    style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 14, color: '#fff', background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box' }} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" required className="auth-input"
                    style={{ width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)', fontSize: 14, color: '#fff', background: 'rgba(255,255,255,0.07)', boxSizing: 'border-box' }} />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                    {showConfirm ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading || !token} className="sign-btn"
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: (loading || !token) ? 'not-allowed' : 'pointer', opacity: (loading || !token) ? 0.7 : 1, marginTop: 4, boxShadow: '0 4px 16px rgba(230,57,70,0.35)' }}>
                {loading ? 'Resetting…' : 'Reset Password →'}
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
