'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AuthCard, AuthCenter, Field, Icon, PasswordField, SubmitButton } from '@/components/auth/AuthShell';

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

  return (
    <AuthCenter
      productName="ProjectHub"
      logoMark="A"
      maxWidth={420}
      footer={
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-subtle">
          <Icon.Lock size={13} />Restricted to administrators only
        </p>
      }
    >
      <AuthCard>
        {/* Header */}
        <div className="text-center mb-7">
          <div className="relative mx-auto mb-5 w-14 h-14">
            <span className="absolute inset-0 rounded-2xl blur-xl opacity-60" style={{ background: 'var(--primary)' }} />
            <span className="relative grid place-items-center w-14 h-14 rounded-2xl text-white" style={{ background: 'var(--grad-brand)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25)' }}>
              <Icon.Shield size={26} />
            </span>
          </div>
          <span className="badge bg-primary-soft text-primary-text mb-3">Admin console</span>
          <h1 className="font-display text-[1.55rem] font-extrabold text-fg">
            {showSetup ? 'Create Admin Account' : 'Admin Sign In'}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-muted">
            {showSetup ? 'Set up your administrator account' : 'Restricted access — admins only'}
          </p>
        </div>

        {setupMsg === 'success' && (
          <Alert tone="success" className="mb-5">Admin account created — you can now sign in</Alert>
        )}

        {!showSetup ? (
          <form key="login" onSubmit={login} className="flex flex-col gap-4 animate-fade-in">
            {error && <Alert tone="danger">{error}</Alert>}
            <Field
              label="Email address" icon={<Icon.Mail size={17} />}
              type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required autoFocus placeholder="admin@example.com" autoComplete="email"
            />
            <PasswordField
              label="Password" show={showPass} onToggleShow={() => setShowPass(p => !p)}
              value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required placeholder="••••••••" autoComplete="current-password"
            />
            <SubmitButton loading={loading} loadingText="Signing in..." className="mt-2">Sign In</SubmitButton>
            <button type="button" onClick={() => { setShowSetup(true); setError(''); }}
              className="mx-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-primary-text transition">
              First time? Create admin account<Icon.ArrowRight size={13} />
            </button>
          </form>
        ) : (
          <form key="setup" onSubmit={createAdmin} className="flex flex-col gap-4 animate-fade-in">
            {setupMsg && setupMsg !== 'success' && <Alert tone="danger">{setupMsg}</Alert>}
            <Field
              label="Full Name" icon={<Icon.User size={17} />}
              value={setup.name} onChange={e => setSetup(p => ({ ...p, name: e.target.value }))}
              required placeholder="Admin Name" autoFocus autoComplete="name"
            />
            <Field
              label="Email" icon={<Icon.Mail size={17} />}
              type="email" value={setup.email} onChange={e => setSetup(p => ({ ...p, email: e.target.value }))}
              required placeholder="admin@example.com" autoComplete="email"
            />
            <PasswordField
              label="Password"
              value={setup.password} onChange={e => setSetup(p => ({ ...p, password: e.target.value }))}
              required placeholder="Min 8 characters" autoComplete="new-password"
            />
            <PasswordField
              label="Confirm Password"
              value={setup.confirm} onChange={e => setSetup(p => ({ ...p, confirm: e.target.value }))}
              required placeholder="Repeat password" autoComplete="new-password"
            />
            <SubmitButton loading={loading} loadingText="Creating..." className="mt-2">Create Admin Account</SubmitButton>
            <button type="button" onClick={() => { setShowSetup(false); setSetupMsg(''); }}
              className="mx-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-primary-text transition">
              <Icon.ArrowLeft size={13} />Back to login
            </button>
          </form>
        )}
      </AuthCard>
    </AuthCenter>
  );
}
