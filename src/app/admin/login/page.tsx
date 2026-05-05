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

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0',
    outline: 'none', transition: 'border-color 0.15s',
  };

  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.07em' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f172a', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .link-btn:hover { color: #a5b4fc !important; }
      `}</style>

      {/* Left panel — branding */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)', borderRight: '1px solid #1e293b', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(99,102,241,0.06)', top: -100, right: -100 }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(139,92,246,0.06)', bottom: -80, left: -80 }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 340 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>A</div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 28, margin: '0 0 10px', lineHeight: 1.2 }}>ProjectHub Admin</h1>
          <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            Manage users, projects, plans, and monitor your platform from one place.
          </p>

          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '👥', text: 'User management & roles' },
              { icon: '💎', text: 'Subscription plan control' },
              { icon: '📊', text: 'Revenue & payment tracking' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ width: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          {setupMsg === 'success' && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
              ✓ Admin account created — you can now sign in
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: '0 0 6px' }}>
              {showSetup ? 'Create Admin Account' : 'Sign in to Admin'}
            </h2>
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
              {showSetup ? 'Set up your administrator account' : 'Restricted access — admins only'}
            </p>
          </div>

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
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 14, padding: 4 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="submit-btn" style={{ padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s, transform 0.15s', marginTop: 4 }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <button type="button" onClick={() => { setShowSetup(true); setError(''); }} className="link-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 12, transition: 'color 0.15s' }}>
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
              <button type="submit" disabled={loading} className="submit-btn" style={{ padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s, transform 0.15s', marginTop: 4 }}>
                {loading ? 'Creating...' : 'Create Admin Account'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={() => { setShowSetup(false); setSetupMsg(''); }} className="link-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 12, transition: 'color 0.15s' }}>
                  ← Back to login
                </button>
              </div>
            </form>
          )}

          <div style={{ marginTop: 32, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ color: '#334155', fontSize: 12 }}>This area is restricted to administrators only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
