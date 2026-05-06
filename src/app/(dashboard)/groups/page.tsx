'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';

interface Group { id: number; name: string; description: string; is_private: boolean; org_id: number | null; owner_id: number }

const palette = [
  { bg: '#457b9d', light: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  { bg: '#2a9d8f', light: '#f0fdf9', border: '#99f6e4', text: '#0f766e' },
  { bg: '#6d6875', light: '#faf5ff', border: '#e9d5ff', text: '#7c3aed' },
  { bg: '#e63946', light: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
  { bg: '#f4a261', light: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  { bg: '#e9c46a', light: '#fefce8', border: '#fef08a', text: '#a16207' },
];

type ViewMode = 'grid' | 'list' | 'box';

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1.5px solid #d0dce8' }}>
      {(['grid','list','box'] as ViewMode[]).map(v => (
        <button key={v} onClick={() => onChange(v)}
          className="px-3 py-1.5 text-xs font-bold transition"
          style={{ background: view === v ? '#1d3557' : '#fff', color: view === v ? '#fff' : '#6b7a8d' }}
          title={v.charAt(0).toUpperCase() + v.slice(1)}>
          {v === 'grid' ? '⊞' : v === 'list' ? '☰' : '▦'}
        </button>
      ))}
    </div>
  );
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', is_private: false });
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [myId, setMyId] = useState(0);
  const [view, setView] = useState<ViewMode>('grid');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const authHeader = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/groups', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setGroups(d));
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => d?.id && setMyId(d.id));
  }, []);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/groups', { method: 'POST', headers: authHeader, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', description: '', is_private: false });
      router.push(`/groups/${data.id}`);
    }
  }

  async function deleteGroup() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/groups?id=${deleteTarget.id}`, { method: 'DELETE', headers: authHeader });
    setDeleting(false);
    setDeleteTarget(null);
    setGroups(g => g.filter(x => x.id !== deleteTarget.id));
  }

  return (
    <div>
      <div className="flex justify-end mb-5 gap-2">
        <ViewToggle view={view} onChange={setView} />
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
          style={{ background: '#457b9d' }}>
          + New Group
        </button>
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}>
          {groups.map((g, i) => {
            const p = palette[i % palette.length];
            return (
              <div key={g.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f8fafc] transition cursor-pointer"
                style={{ borderBottom: i < groups.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                onClick={() => router.push(`/groups/${g.id}`)}>  
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{ background: p.bg }}>
                  {g.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: p.text }}>{g.name}</div>
                  {g.description && <div className="text-xs truncate" style={{ color: '#6b7a8d' }}>{g.description}</div>}
                </div>
                <span className="text-xs" style={{ color: '#6b7a8d' }}>{g.is_private ? '🔒 Private' : '🌐 Public'}</span>
                {g.owner_id === myId && (
                  <button onClick={e => { e.stopPropagation(); setDeleteTarget(g); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-50 flex-shrink-0"
                    style={{ color: '#e63946', border: '1px solid #fecaca' }}>🗑</button>
                )}
              </div>
            );
          })}
          {groups.length === 0 && (
            <div className="p-16 text-center">
              <div className="text-5xl mb-4">👥</div>
              <div className="font-black text-[#1d3557] mb-2">No groups yet</div>
              <button onClick={() => setShowForm(true)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90" style={{ background: '#457b9d' }}>Create Group</button>
            </div>
          )}
        </div>
      ) : (
      <div className={view === 'box' ? 'grid grid-cols-1 gap-5' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'}>
        {groups.map((g, i) => {
          const p = palette[i % palette.length];
          return (
            <div key={g.id} className="rounded-2xl overflow-hidden hover:shadow-lg transition-all relative group"
              style={{ background: p.light, border: `1.5px solid ${p.border}` }}>
              <div className="h-1.5" style={{ background: p.bg }} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-black flex-shrink-0"
                    style={{ background: p.bg }}>
                    {g.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm truncate" style={{ color: p.text }}>{g.name}</div>
                    <div className="text-xs text-[#6b7a8d] mt-0.5">{g.is_private ? '🔒 Private' : '🌐 Public'}</div>
                  </div>
                  {g.owner_id === myId && (
                    <button onClick={e => { e.stopPropagation(); setDeleteTarget(g); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-50 flex-shrink-0"
                      style={{ color: '#e63946', border: '1px solid #fecaca' }}>🗑</button>
                  )}
                </div>
                {g.description && <p className="text-xs text-[#6b7a8d] line-clamp-2 mb-3">{g.description}</p>}
                <div className="flex gap-2 pt-3" style={{ borderTop: `1px solid ${p.border}` }}>
                  <button onClick={() => router.push(`/groups/${g.id}`)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition text-white"
                    style={{ background: p.bg }}>
                    View Group
                  </button>
                  <button onClick={() => router.push(`/groups/${g.id}?tab=chat`)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition"
                    style={{ background: p.light, color: p.text, border: `1.5px solid ${p.border}` }}>
                    💬 Chat
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="col-span-3 bg-white rounded-2xl p-16 text-center" style={{ border: '2px dashed #d0dce8' }}>
            <div className="text-5xl mb-4">👥</div>
            <div className="font-black text-[#1d3557] mb-2">No groups yet</div>
            <div className="text-[#6b7a8d] text-sm mb-6">Create a group to collaborate with your team</div>
            <button onClick={() => setShowForm(true)}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90"
              style={{ background: '#457b9d' }}>Create Group</button>
          </div>
        )}
      </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Group"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={deleteGroup}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Create Group Modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[#1d3557]">New Group</h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b7a8d] hover:bg-[#f1faee]">✕</button>
            </div>
            <form onSubmit={createGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Group name *</label>
                <input placeholder="e.g. Design Team" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Description</label>
                <textarea placeholder="What is this group for?" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none resize-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }}>
                <input type="checkbox" checked={form.is_private}
                  onChange={e => setForm(p => ({ ...p, is_private: e.target.checked }))} className="w-4 h-4" />
                <div>
                  <div className="text-sm font-bold text-[#1d3557]">Private group</div>
                  <div className="text-xs text-[#6b7a8d]">Only invited members can join</div>
                </div>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90"
                  style={{ background: '#457b9d' }}>Create Group</button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1d3557]"
                  style={{ border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
