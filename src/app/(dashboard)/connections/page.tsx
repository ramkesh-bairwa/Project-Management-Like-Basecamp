'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Connection { id: number; status: string; direction: string; user_id: number; name: string; email: string; avatar?: string }
interface UserResult { id: number; name: string; email: string; avatar?: string }
interface UserProfile {
  id: number; name: string; email: string; avatar?: string; bio?: string;
  is_org: boolean; created_at: string; plan_name?: string;
  project_count: number; connection_count: number;
}

const avatarBgs = ['#e63946','#457b9d','#2a9d8f','#f4a261','#6d6875','#e9c46a'];

function Avatar({ name, avatar, size = 9, i = 0 }: { name: string; avatar?: string; size?: number; i?: number }) {
  if (avatar) return <img src={avatar} alt={name} className={`w-${size} h-${size} rounded-xl object-cover flex-shrink-0`} />;
  return (
    <div className={`w-${size} h-${size} rounded-xl flex items-center justify-center text-white font-black flex-shrink-0`}
      style={{ background: avatarBgs[i % avatarBgs.length], fontSize: size > 9 ? 16 : 13 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

export default function ConnectionsPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<number | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/connections', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) && setConnections(d));
  }, []);

  useEffect(() => {
    if (!search.trim()) { setUsers([]); setShowDrop(false); return; }
    setLoadingSearch(true);
    const t = setTimeout(() => {
      fetch(`/api/users?search=${encodeURIComponent(search)}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) { setUsers(d); setShowDrop(true); } })
        .finally(() => setLoadingSearch(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function loadConnections() {
    fetch('/api/connections', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) && setConnections(d));
  }

  async function openProfile(userId: number) {
    setProfileLoading(true);
    setProfile(null);
    const res = await fetch(`/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setProfile(data);
    setProfileLoading(false);
  }

  async function sendRequest(receiver_id: number) {
    const res = await fetch('/api/connections', { method: 'POST', headers, body: JSON.stringify({ receiver_id }) });
    if (res.ok) { setSearch(''); setUsers([]); setShowDrop(false); loadConnections(); }
  }

  async function respond(connection_id: number, status: string) {
    await fetch('/api/connections/respond', { method: 'PUT', headers, body: JSON.stringify({ connection_id, status }) });
    setConnections(c => c.map(cn => cn.id === connection_id ? { ...cn, status } : cn));
  }

  async function startChat(userId: number) {
    setStartingChat(userId);
    const res = await fetch('/api/chats', { method: 'POST', headers, body: JSON.stringify({ type: 'direct', participant_ids: [userId] }) });
    const data = await res.json();
    setStartingChat(null);
    if (res.ok) {
      setProfile(null);
      sessionStorage.setItem('openChatId', String(data.id));
      router.push('/chats');
    }
  }

  const connectedIds = new Set(connections.map(c => c.user_id));
  const pending  = connections.filter(c => c.status === 'pending' && c.direction === 'received');
  const accepted = connections.filter(c => c.status === 'accepted');
  const sent     = connections.filter(c => c.status === 'pending' && c.direction === 'sent');

  return (
    <div>
      {/* Search */}
      <div className="bg-white rounded-2xl p-6 mb-8" style={{ border: '1px solid #d0dce8' }}>
        <div className="font-black text-[#1d3557] mb-4 flex items-center gap-2">🔍 Find People</div>

        <div className="relative" ref={dropRef}>
          <div className="relative">
            <input
              placeholder="Type a name or email to search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => users.length > 0 && setShowDrop(true)}
              autoComplete="off"
              className="w-full rounded-xl px-4 py-3 pr-10 text-[#1d3557] text-sm focus:outline-none"
              style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }}
            />
            {loadingSearch
              ? <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#457b9d] border-t-transparent animate-spin" />
              : search && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] cursor-pointer text-lg" onClick={() => { setSearch(''); setUsers([]); setShowDrop(false); }}>×</span>
            }
          </div>

          {/* Dropdown suggestions */}
          {showDrop && users.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
              style={{ border: '1.5px solid #d0dce8', maxHeight: 320, overflowY: 'auto' }}>
              {users.map((u, i) => {
                const isConnected = connectedIds.has(u.id);
                const isSent = connections.some(c => c.user_id === u.id && c.status === 'pending' && c.direction === 'sent');
                return (
                  <div key={u.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition cursor-pointer"
                    style={{ borderBottom: i < users.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <Avatar name={u.name} avatar={u.avatar} size={10} i={i} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#1d3557] truncate">{u.name}</div>
                      <div className="text-xs text-[#6b7a8d] truncate">{u.email}</div>
                    </div>
                    {isConnected
                      ? <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: '#f0fdf9', color: '#0f766e' }}>✓ Connected</span>
                      : isSent
                      ? <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: '#fff7ed', color: '#c2410c' }}>Pending</span>
                      : <button onClick={() => sendRequest(u.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition flex-shrink-0"
                          style={{ background: '#e63946' }}>+ Connect</button>
                    }
                  </div>
                );
              })}
            </div>
          )}

          {showDrop && users.length === 0 && search.trim() && !loadingSearch && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl z-50 px-4 py-6 text-center"
              style={{ border: '1.5px solid #d0dce8' }}>
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-sm text-[#6b7a8d]">No users found for <strong>{search}</strong></div>
            </div>
          )}
        </div>
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
                <Avatar name={c.name} avatar={c.avatar} size={10} i={i} />
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
            <div key={c.id}
              className="bg-white rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
              style={{ border: '1px solid #d0dce8' }}>
              <div className="cursor-pointer flex items-center gap-3 flex-1 min-w-0" onClick={() => openProfile(c.user_id)}>
                <Avatar name={c.name} avatar={c.avatar} size={11} i={i} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#1d3557] text-sm truncate">{c.name}</div>
                  <div className="text-xs text-[#6b7a8d] truncate">{c.email}</div>
                </div>
              </div>
              <button
                onClick={() => startChat(c.user_id)}
                disabled={startingChat === c.user_id}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:opacity-90 disabled:opacity-50 transition flex-shrink-0"
                style={{ background: '#1d3557' }}
                title="Send message">
                {startingChat === c.user_id
                  ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                }
              </button>
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
                <Avatar name={c.name} avatar={c.avatar} size={9} i={i} />
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

      {/* Profile Modal */}
      {(profile || profileLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(15,23,42,0.6)' }}
          onClick={() => { setProfile(null); setProfileLoading(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>

            {profileLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-4 border-[#457b9d] border-t-transparent animate-spin" />
              </div>
            ) : profile && (
              <>
                {/* Header banner */}
                <div className="h-24 relative flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1d3557 0%, #457b9d 100%)' }}>
                  <button onClick={() => setProfile(null)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition">
                    ✕
                  </button>
                </div>

                {/* Avatar overlapping banner */}
                <div className="px-6 pb-6">
                  <div className="-mt-10 mb-4 flex items-end justify-between">
                    {profile.avatar
                      ? <img src={profile.avatar} alt={profile.name}
                          className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                          style={{ border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                      : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black flex-shrink-0"
                          style={{ background: '#457b9d', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                          {profile.name[0].toUpperCase()}
                        </div>
                    }
                    {profile.is_org && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#eff6ff', color: '#1d4ed8' }}>🏢 Organization</span>
                    )}
                  </div>

                  {/* Name & email */}
                  <h2 className="text-xl font-black text-[#1d3557]">{profile.name}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5 mb-4">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span className="text-sm text-[#6b7a8d]">{profile.email}</span>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-sm text-[#475569] leading-relaxed mb-4 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      {profile.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl p-3 text-center" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="text-lg font-black text-[#1d3557]">{profile.project_count}</div>
                      <div className="text-xs text-[#6b7a8d] mt-0.5">Projects</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="text-lg font-black text-[#1d3557]">{profile.connection_count}</div>
                      <div className="text-xs text-[#6b7a8d] mt-0.5">Connections</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <div className="text-lg font-black text-[#1d3557]">{profile.plan_name || 'Free'}</div>
                      <div className="text-xs text-[#6b7a8d] mt-0.5">Plan</div>
                    </div>
                  </div>

                  {/* Member since */}
                  <div className="flex items-center gap-2 text-xs text-[#94a3b8] mb-5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Member since {new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                  </div>

                  {/* Message button — only for accepted connections */}
                  {accepted.some(c => c.user_id === profile.id) && (
                    <button
                      onClick={() => startChat(profile.id)}
                      disabled={startingChat === profile.id}
                      className="w-full py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                      style={{ background: '#1d3557' }}>
                      {startingChat === profile.id
                        ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Message</>
                      }
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
