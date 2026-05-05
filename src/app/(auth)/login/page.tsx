'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: 'test@projecthub.com', password: 'Test@123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        router.replace('/dashboard');
      }
    } catch { /* invalid token, stay */ }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', String(data.user.id));
    window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f1faee' }}>
      {/* Left */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12" style={{ background: '#1d3557' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base" style={{ background: '#e63946', color: '#fff' }}>P</div>
          <span className="font-black text-white text-xl">ProjectHub</span>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-4 mb-10">
            {[
              { icon: '📋', label: 'Projects', bg: '#e63946' },
              { icon: '💬', label: 'Chats', bg: '#457b9d' },
              { icon: '🏢', label: 'Organizations', bg: '#2a9d8f' },
              { icon: '👥', label: 'Groups', bg: '#6d6875' },
            ].map(t => (
              <div key={t.label} className="rounded-2xl p-5" style={{ background: t.bg }}>
                <div className="text-2xl mb-2">{t.icon}</div>
                <div className="text-white font-black text-sm">{t.label}</div>
              </div>
            ))}
          </div>
          <blockquote className="text-white/60 text-lg leading-relaxed">
            “The best way to manage your team’s work — all in one place.”
          </blockquote>
        </div>
        <div className="text-white/20 text-sm">2025 ProjectHub</div>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black" style={{ background: '#e63946', color: '#fff' }}>P</div>
            <span className="font-black text-xl" style={{ color: '#1d3557' }}>ProjectHub</span>
          </div>
          <h1 className="text-3xl font-black mb-1" style={{ color: '#1d3557' }}>Welcome back</h1>
          <p className="mb-8 text-sm" style={{ color: '#6b7a8d' }}>Sign in to continue to your workspace</p>

          {error && (
            <div className="rounded-xl px-4 py-3 mb-6 text-sm font-medium flex items-center gap-2" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>Email address</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>Password</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white transition hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: '#e63946' }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid #d0dce8' }}>
            <span className="text-sm" style={{ color: '#6b7a8d' }}>No account? </span>
            <Link href="/register" className="text-sm font-black hover:underline" style={{ color: '#e63946' }}>Create one free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
