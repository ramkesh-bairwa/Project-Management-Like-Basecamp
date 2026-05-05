'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', String(data.user?.id));
    window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: '#f1faee' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{ background: '#e63946', color: '#fff' }}>P</div>
            <span className="font-black text-2xl" style={{ color: '#1d3557' }}>ProjectHub</span>
          </div>
          <h1 className="text-3xl font-black mb-1" style={{ color: '#1d3557' }}>Create your account</h1>
          <p className="text-sm" style={{ color: '#6b7a8d' }}>Free forever. No credit card required.</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm" style={{ border: '1px solid #d0dce8' }}>
          {error && (
            <div className="rounded-xl px-4 py-3 mb-6 text-sm font-medium flex items-center gap-2" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
              ⚠️ {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>Full name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>Email address</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" required
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>Password</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min. 8 characters" required minLength={8}
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white transition hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: '#e63946' }}>
              {loading ? 'Creating account...' : 'Create free account'}
            </button>
          </form>
          <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid #d0dce8' }}>
            <span className="text-sm" style={{ color: '#6b7a8d' }}>Already have an account? </span>
            <Link href="/login" className="text-sm font-black hover:underline" style={{ color: '#e63946' }}>Sign in</Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[['🔒','Secure','End-to-end'],['⚡','Fast','Instant setup'],['🆓','Free','No card needed']].map(([icon,title,sub]) => (
            <div key={title} className="bg-white rounded-xl p-3 text-center" style={{ border: '1px solid #d0dce8' }}>
              <div className="text-lg mb-1">{icon}</div>
              <div className="text-xs font-black" style={{ color: '#1d3557' }}>{title}</div>
              <div className="text-xs" style={{ color: '#6b7a8d' }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
