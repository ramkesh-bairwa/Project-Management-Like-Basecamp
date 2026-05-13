'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Org { id: number; name: string; slug: string; description: string; plan_name: string; website: string }

const orgAccents = ['#e63946','#457b9d','#2a9d8f','#f4a261','#6d6875','#e9c46a'];

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
        <div className="rounded-2xl p-5 mb-8 flex items-center justify-between gap-4" style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#ffedd5' }}>🔒</div>
            <div>
              <div className="font-black text-[#1d3557]">Organizations require a paid plan</div>
              <div className="text-sm text-[#6b7a8d] mt-0.5">Upgrade to Pro, Business, or Enterprise to create team workspaces.</div>
            </div>
          </div>
          <a href="/plans" className="flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: '#f4a261' }}>Upgrade Plan</a>
        </div>
      )}

      <div className="flex justify-end mb-6">
        {isOrg && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: '#2a9d8f' }}>
            + New Organization
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orgs.map((org, i) => {
          const accent = orgAccents[i % orgAccents.length];
          return (
            <div key={org.id} className="bg-white rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all" style={{ border: '1px solid #d0dce8' }}>
              <div className="h-1.5" style={{ background: accent }} />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black flex-shrink-0" style={{ background: accent }}>
                    {org.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-black text-[#1d3557]">{org.name}</div>
                    <div className="text-xs text-[#6b7a8d]">@{org.slug}</div>
                  </div>
                </div>
                {org.description && <p className="text-sm text-[#6b7a8d] mb-4 line-clamp-2">{org.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#f1faee', color: '#2a9d8f' }}>{org.plan_name || 'Free'}</span>
                  <div className="flex items-center gap-2">
                    {org.website && <a href={org.website} target="_blank" rel="noreferrer" className="text-xs text-[#6b7a8d] hover:text-[#457b9d] transition">🌐 Website</a>}
                    <Link href={`/organizations/${org.id}`} className="text-xs font-bold px-3 py-1 rounded-lg hover:opacity-90 transition" style={{ background: '#1d3557', color: '#fff' }}>⚙️ Manage</Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {orgs.length === 0 && (
          <div className="col-span-3 bg-white rounded-2xl p-16 text-center" style={{ border: '2px dashed #d0dce8' }}>
            <div className="text-5xl mb-4">🏢</div>
            <div className="font-black text-[#1d3557] mb-2">No organizations yet</div>
            <div className="text-[#6b7a8d] text-sm">{isOrg ? 'Create your first organization' : 'Upgrade your plan to get started'}</div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[#1d3557]">New Organization</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b7a8d] hover:bg-[#f1faee] transition">✕</button>
            </div>
            {error && <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>⚠️ {error}</div>}
            <form onSubmit={createOrg} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Organization name *</label>
                <input placeholder="e.g. Acme Corp" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Description</label>
                <textarea placeholder="What does your organization do?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none resize-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Website</label>
                <input placeholder="https://yourcompany.com" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: '#2a9d8f' }}>Create Organization</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1d3557] hover:bg-[#f1faee] transition" style={{ border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
