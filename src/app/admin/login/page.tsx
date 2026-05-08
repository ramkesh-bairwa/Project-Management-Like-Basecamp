'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [setup, setSetup] = useState({ name: '', email: '', password: '', confirm: '' });
  const [setupMsg, setSetupMsg] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'Login failed'); return; }
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('token', data.token);
    window.location.href = '/admin';
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (setup.password !== setup.confirm) { setSetupMsg('Passwords do not match'); return; }
    setLoading(true); setSetupMsg('');
    const res = await fetch('/api/admin/auth', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: setup.name, email: setup.email, password: setup.password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setSetupMsg(data.error || 'Failed'); return; }
    setSetupMsg('success');
    setShowSetup(false);
    setForm({ email: setup.email, password: '' });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0',
    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', padding: 24 }}>
      <style>{`
        * { box-sizing: border-box; }
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .link-btn:hover { color: #a5b4fc !important; }
      `}</style>

      {/* Decorative background circles */}
      <div style={{ position: 'fixed', width: 500, height: 500, borderRadius: '50%', background: 'rgba(99,102,241,0.05)', top: -150, right: -150, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', width: 400, height: 400, borderRadius: '50%', background: 'rgba(139,92,246,0.05)', bottom: -100, left: -100, pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}>A</div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: '0 0 4px' }}>
            {showSetup ? 'Create Admin Account' : 'Admin Sign In'}
          </h1>
          <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
            {showSetup ? 'Set up your administrator account' : 'Restricted access — admins only'}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, border: '1px solid #334155', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          {setupMsg === 'success' && (
            <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', fontSize: 13, fontWeight: 600, marginBottom: 18 }}>
              ✓ Admin account created — you can now sign in
            </div>
          )}

          {!showSetup ? (
            <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, fontWeight: 600 }}>
                  ⚠ {error}
                </div>
              )}
              <div>
                <label style={labelStyle}>Email address</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required autoFocus placeholder="admin@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required placeholder="••••••••" style={{ ...inputStyle, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 14, padding: 4 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="submit-btn"
                style={{ padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s, transform 0.15s', marginTop: 4 }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={() => { setShowSetup(true); setError(''); }} className="link-btn"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 12, transition: 'color 0.15s' }}>
                  First time? Create admin account →
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={createAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {setupMsg && setupMsg !== 'success' && (
                <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13, fontWeight: 600 }}>
                  ⚠ {setupMsg}
                </div>
              )}
              <div>
                <label style={labelStyle}>Full Name</label>
                <input value={setup.name} onChange={e => setSetup(p => ({ ...p, name: e.target.value }))}
                  required placeholder="Admin Name" autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={setup.email} onChange={e => setSetup(p => ({ ...p, email: e.target.value }))}
                  required placeholder="admin@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={setup.password} onChange={e => setSetup(p => ({ ...p, password: e.target.value }))}
                  required placeholder="Min 8 characters" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" value={setup.confirm} onChange={e => setSetup(p => ({ ...p, confirm: e.target.value }))}
                  required placeholder="Repeat password" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} className="submit-btn"
                style={{ padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s, transform 0.15s', marginTop: 4 }}>
                {loading ? 'Creating...' : 'Create Admin Account'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={() => { setShowSetup(false); setSetupMsg(''); }} className="link-btn"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 12, transition: 'color 0.15s' }}>
                  ← Back to login
                </button>
              </div>
            </form>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>🔒</span>
          <span style={{ color: '#334155', fontSize: 12 }}>Restricted to administrators only</span>
        </div>
      </div>
    </div>
  );
}
