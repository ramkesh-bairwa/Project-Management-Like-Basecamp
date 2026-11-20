'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Org { id: number; name: string; slug: string; description: string; plan_name: string; website: string }

const orgAccents = ['#f43f5e','#6366f1','#10b981','#f59e0b','#8b5cf6','#eab308'];

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [isOrg, setIsOrg] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', website: '' });
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setIsOrg(d.is_org));
    fetch('/api/organizations', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) && setOrgs(d));
  }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const res = await fetch('/api/organizations', { method: 'POST', headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setOrgs(o => [...o, { ...form, id: data.id, slug: data.slug, plan_name: 'Free' }]);
    setShowForm(false); setForm({ name: '', description: '', website: '' });
  }

  return (
    <div>
      {!isOrg && (
        <div className="rounded-2xl p-5 mb-8 flex items-center justify-between gap-4" style={{ background: 'var(--warning-soft)', border: '1.5px solid var(--warning-soft)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#ffedd5' }}>🔒</div>
            <div>
              <div className="font-black text-[var(--text)]">Organizations require a paid plan</div>
              <div className="text-sm text-[var(--text-muted)] mt-0.5">Upgrade to Pro, Business, or Enterprise to create team workspaces.</div>
            </div>
          </div>
          <a href="/plans" className="flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: '#f59e0b' }}>Upgrade Plan</a>
        </div>
      )}

      <div className="flex justify-end mb-6">
        {isOrg && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: 'var(--success)' }}>
            + New Organization
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orgs.map((org, i) => {
          const accent = orgAccents[i % orgAccents.length];
          return (
            <div key={org.id} className="bg-surface rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all" style={{ border: '1px solid var(--border)' }}>
              <div className="h-1.5" style={{ background: accent }} />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black flex-shrink-0" style={{ background: accent }}>
                    {org.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-black text-[var(--text)]">{org.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">@{org.slug}</div>
                  </div>
                </div>
                {org.description && <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">{org.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--bg)', color: 'var(--success)' }}>{org.plan_name || 'Free'}</span>
                  <div className="flex items-center gap-2">
                    {org.website && <a href={org.website} target="_blank" rel="noreferrer" className="text-xs text-[var(--text-muted)] hover:text-[var(--link)] transition">🌐 Website</a>}
                    <Link href={`/organizations/${org.id}`} className="text-xs font-bold px-3 py-1 rounded-lg hover:opacity-90 transition" style={{ background: 'var(--primary)', color: '#fff' }}>⚙️ Manage</Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {orgs.length === 0 && (
          <div className="col-span-3 bg-surface rounded-2xl p-16 text-center" style={{ border: '2px dashed var(--border)' }}>
            <div className="text-5xl mb-4">🏢</div>
            <div className="font-black text-[var(--text)] mb-2">No organizations yet</div>
            <div className="text-[var(--text-muted)] text-sm">{isOrg ? 'Create your first organization' : 'Upgrade your plan to get started'}</div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(15,18,34,0.5)' }}>
          <div className="bg-surface rounded-2xl p-8 w-full max-w-lg shadow-2xl" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[var(--text)]">New Organization</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg)] transition">✕</button>
            </div>
            {error && <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium" style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)', border: '1px solid var(--danger-soft)' }}>⚠️ {error}</div>}
            <form onSubmit={createOrg} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text)] mb-1.5">Organization name *</label>
                <input placeholder="e.g. Acme Corp" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                  className="w-full rounded-xl px-4 py-3 text-[var(--text)] text-sm focus:outline-none"
                  style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text)] mb-1.5">Description</label>
                <textarea placeholder="What does your organization do?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full rounded-xl px-4 py-3 text-[var(--text)] text-sm focus:outline-none resize-none"
                  style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text)] mb-1.5">Website</label>
                <input placeholder="https://yourcompany.com" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-[var(--text)] text-sm focus:outline-none"
                  style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: 'var(--success)' }}>Create Organization</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-[var(--text)] hover:bg-[var(--bg)] transition" style={{ border: '1.5px solid var(--border)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
