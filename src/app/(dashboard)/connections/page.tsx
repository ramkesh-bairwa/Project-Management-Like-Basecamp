'use client';
import { useEffect, useState } from 'react';

interface Connection { id: number; status: string; direction: string; user_id: number; name: string; email: string }

const avatarBgs = ['#e63946','#457b9d','#2a9d8f','#f4a261','#6d6875','#e9c46a'];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<{ id: number; name: string; email: string }[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/connections', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) && setConnections(d));
  }, []);

  useEffect(() => {
    if (!search) { setUsers([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/users?search=${search}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) && setUsers(d));
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function sendRequest(receiver_id: number) {
    const res = await fetch('/api/connections', { method: 'POST', headers, body: JSON.stringify({ receiver_id }) });
    if (res.ok) { setSearch(''); setUsers([]); fetch('/api/connections', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) && setConnections(d)); }
  }

  async function respond(connection_id: number, status: string) {
    await fetch('/api/connections/respond', { method: 'PUT', headers, body: JSON.stringify({ connection_id, status }) });
    setConnections(c => c.map(cn => cn.id === connection_id ? { ...cn, status } : cn));
  }

  const pending = connections.filter(c => c.status === 'pending' && c.direction === 'received');
  const accepted = connections.filter(c => c.status === 'accepted');
  const sent = connections.filter(c => c.status === 'pending' && c.direction === 'sent');

  return (
    <div>
      {/* Search */}
      <div className="bg-white rounded-2xl p-6 mb-8" style={{ border: '1px solid #d0dce8' }}>
        <div className="font-black text-[#1d3557] mb-4 flex items-center gap-2">🔍 Find People</div>
        <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
          style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
        {users.length > 0 && (
          <div className="mt-4 space-y-2">
            {users.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#f1faee', border: '1px solid #d0dce8' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{ background: avatarBgs[i % avatarBgs.length] }}>{u.name[0]}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#1d3557]">{u.name}</div>
                  <div className="text-xs text-[#6b7a8d]">{u.email}</div>
                </div>
                <button onClick={() => sendRequest(u.id)} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition" style={{ background: '#e63946' }}>Connect</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-black text-[#1d3557]">Pending Requests</span>
            <span className="text-xs font-black text-white px-2 py-0.5 rounded-full" style={{ background: '#f4a261' }}>{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 bg-white rounded-2xl p-4" style={{ border: '1.5px solid #fed7aa' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0" style={{ background: avatarBgs[i % avatarBgs.length] }}>{c.name[0]}</div>
                <div className="flex-1">
                  <div className="font-bold text-[#1d3557] text-sm">{c.name}</div>
                  <div className="text-xs text-[#6b7a8d]">{c.email}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => respond(c.id, 'accepted')} className="px-4 py-2 rounded-lg text-xs font-bold text-white hover:opacity-90 transition" style={{ background: '#2a9d8f' }}>Accept</button>
                  <button onClick={() => respond(c.id, 'rejected')} className="px-4 py-2 rounded-lg text-xs font-bold text-[#1d3557] hover:bg-[#f1faee] transition" style={{ border: '1px solid #d0dce8' }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected */}
      <div className="mb-8">
        <div className="font-black text-[#1d3557] mb-4">Connected <span className="font-normal text-[#6b7a8d] text-sm">({accepted.length})</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accepted.map((c, i) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition" style={{ border: '1px solid #d0dce8' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black flex-shrink-0" style={{ background: avatarBgs[i % avatarBgs.length] }}>{c.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1d3557] text-sm truncate">{c.name}</div>
                <div className="text-xs text-[#6b7a8d] truncate">{c.email}</div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#f0fdf9', color: '#0f766e' }}>Connected</span>
            </div>
          ))}
          {accepted.length === 0 && (
            <div className="col-span-3 bg-white rounded-2xl p-12 text-center" style={{ border: '2px dashed #d0dce8' }}>
              <div className="text-4xl mb-3">🔗</div>
              <div className="text-[#6b7a8d] text-sm">No connections yet. Search for people above!</div>
            </div>
          )}
        </div>
      </div>

      {/* Sent */}
      {sent.length > 0 && (
        <div>
          <div className="font-black text-[#1d3557] mb-4">Sent Requests <span className="font-normal text-[#6b7a8d] text-sm">({sent.length})</span></div>
          <div className="space-y-3">
            {sent.map((c, i) => (
              <div key={c.id} className="bg-white rounded-xl p-4 flex items-center gap-3" style={{ border: '1px solid #d0dce8' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0" style={{ background: avatarBgs[i % avatarBgs.length] }}>{c.name[0]}</div>
                <div className="flex-1">
                  <div className="font-bold text-[#1d3557] text-sm">{c.name}</div>
                  <div className="text-xs text-[#6b7a8d]">{c.email}</div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#fff7ed', color: '#c2410c' }}>Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
