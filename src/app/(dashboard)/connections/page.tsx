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

const avatarBgs = ['#f43f5e','#6366f1','#10b981','#f59e0b','#8b5cf6','#eab308'];

function Avatar({ name, avatar, size = 9, i = 0 }: { name: string; avatar?: string; size?: number; i?: number }) {
  if (avatar) return <img src={avatar} alt={name} className={`w-${size} h-${size} rounded-xl object-cover flex-shrink-0`} />;
  return (
    <div className={`w-${size} h-${size} rounded-xl flex items-center justify-center text-white font-black flex-shrink-0`}
      style={{ background: avatarBgs[i % avatarBgs.length], fontSize: size > 9 ? 16 : 13 }}>
      {name[0].toUpperCase()}
    </div>
  );
}


function fmtDT(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = dt.getDate();
  const s = day%10===1&&day!==11?'st':day%10===2&&day!==12?'nd':day%10===3&&day!==13?'rd':'th';
  const mon = dt.toLocaleString('en',{month:'short'});
  const h = dt.getHours()%12||12, m = String(dt.getMinutes()).padStart(2,'0'), ap = dt.getHours()>=12?'PM':'AM';
  return `${day}${s} ${mon} ${dt.getFullYear()} ${h}:${m} ${ap}`;
}
function fmtD(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = dt.getDate();
  const s = day%10===1&&day!==11?'st':day%10===2&&day!==12?'nd':day%10===3&&day!==13?'rd':'th';
  return `${day}${s} ${dt.toLocaleString('en',{month:'short'})} ${dt.getFullYear()}`;
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
      <div className="bg-surface rounded-2xl p-6 mb-8" style={{ border: '1px solid var(--border)' }}>
        <div className="font-black text-[var(--text)] mb-4 flex items-center gap-2">🔍 Find People</div>

        <div className="relative" ref={dropRef}>
          <div className="relative">
            <input
              placeholder="Type a name or email to search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => users.length > 0 && setShowDrop(true)}
              autoComplete="off"
              className="w-full rounded-xl px-4 py-3 pr-10 text-[var(--text)] text-sm focus:outline-none"
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }}
            />
            {loadingSearch
              ? <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[var(--link)] border-t-transparent animate-spin" />
              : search && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] cursor-pointer text-lg" onClick={() => { setSearch(''); setUsers([]); setShowDrop(false); }}>×</span>
            }
          </div>

          {/* Dropdown suggestions */}
          {showDrop && users.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-surface rounded-2xl shadow-xl z-50 overflow-hidden"
              style={{ border: '1.5px solid var(--border)', maxHeight: 320, overflowY: 'auto' }}>
              {users.map((u, i) => {
                const isConnected = connectedIds.has(u.id);
                const isSent = connections.some(c => c.user_id === u.id && c.status === 'pending' && c.direction === 'sent');
                return (
                  <div key={u.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)] transition cursor-pointer"
                    style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                    <Avatar name={u.name} avatar={u.avatar} size={10} i={i} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[var(--text)] truncate">{u.name}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{u.email}</div>
                    </div>
                    {isConnected
                      ? <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: 'var(--success-soft)', color: 'var(--success-text)' }}>✓ Connected</span>
                      : isSent
                      ? <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)' }}>Pending</span>
                      : <button onClick={() => sendRequest(u.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition flex-shrink-0"
                          style={{ background: 'var(--accent)' }}>+ Connect</button>
                    }
                  </div>
                );
              })}
            </div>
          )}

          {showDrop && users.length === 0 && search.trim() && !loadingSearch && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-surface rounded-2xl shadow-xl z-50 px-4 py-6 text-center"
              style={{ border: '1.5px solid var(--border)' }}>
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-sm text-[var(--text-muted)]">No users found for <strong>{search}</strong></div>
            </div>
          )}
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-black text-[var(--text)]">Pending Requests</span>
            <span className="text-xs font-black text-white px-2 py-0.5 rounded-full" style={{ background: '#f59e0b' }}>{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map((c, i) => (
              <div key={c.id} className="flex items-center gap-4 bg-surface rounded-2xl p-4" style={{ border: '1.5px solid var(--warning-soft)' }}>
                <Avatar name={c.name} avatar={c.avatar} size={10} i={i} />
                <div className="flex-1">
                  <div className="font-bold text-[var(--text)] text-sm">{c.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{c.email}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => respond(c.id, 'accepted')} className="px-4 py-2 rounded-lg text-xs font-bold text-white hover:opacity-90 transition" style={{ background: 'var(--success)' }}>Accept</button>
                  <button onClick={() => respond(c.id, 'rejected')} className="px-4 py-2 rounded-lg text-xs font-bold text-[var(--text)] hover:bg-[var(--bg)] transition" style={{ border: '1px solid var(--border)' }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected */}
      <div className="mb-8">
        <div className="font-black text-[var(--text)] mb-4">Connected <span className="font-normal text-[var(--text-muted)] text-sm">({accepted.length})</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accepted.map((c, i) => (
            <div key={c.id}
              className="bg-surface rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
              style={{ border: '1px solid var(--border)' }}>
              <div className="cursor-pointer flex items-center gap-3 flex-1 min-w-0" onClick={() => openProfile(c.user_id)}>
                <Avatar name={c.name} avatar={c.avatar} size={11} i={i} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[var(--text)] text-sm truncate">{c.name}</div>
                  <div className="text-xs text-[var(--text-muted)] truncate">{c.email}</div>
                </div>
              </div>
              <button
                onClick={() => startChat(c.user_id)}
                disabled={startingChat === c.user_id}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:opacity-90 disabled:opacity-50 transition flex-shrink-0"
                style={{ background: 'var(--primary)' }}
                title="Send message">
                {startingChat === c.user_id
                  ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                }
              </button>
            </div>
          ))}
          {accepted.length === 0 && (
            <div className="col-span-3 bg-surface rounded-2xl p-12 text-center" style={{ border: '2px dashed var(--border)' }}>
              <div className="text-4xl mb-3">🔗</div>
              <div className="text-[var(--text-muted)] text-sm">No connections yet. Search for people above!</div>
            </div>
          )}
        </div>
      </div>

      {/* Sent */}
      {sent.length > 0 && (
        <div>
          <div className="font-black text-[var(--text)] mb-4">Sent Requests <span className="font-normal text-[var(--text-muted)] text-sm">({sent.length})</span></div>
          <div className="space-y-3">
            {sent.map((c, i) => (
              <div key={c.id} className="bg-surface rounded-xl p-4 flex items-center gap-3" style={{ border: '1px solid var(--border)' }}>
                <Avatar name={c.name} avatar={c.avatar} size={9} i={i} />
                <div className="flex-1">
                  <div className="font-bold text-[var(--text)] text-sm">{c.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{c.email}</div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)' }}>Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {(profile || profileLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(15,23,42,0.6)' }}
          onClick={() => { setProfile(null); setProfileLoading(false); }}>
          <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            {profileLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-4 border-[var(--link)] border-t-transparent animate-spin" />
              </div>
            ) : profile && (
              <>
                {/* Header banner */}
                <div className="h-24 relative flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--link) 100%)' }}>
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
                          style={{ background: 'var(--link)', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                          {profile.name[0].toUpperCase()}
                        </div>
                    }
                    {profile.is_org && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--info-soft)', color: 'var(--info-text)' }}>🏢 Organization</span>
                    )}
                  </div>

                  {/* Name & email */}
                  <h2 className="text-xl font-black text-[var(--text)]">{profile.name}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5 mb-4">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span className="text-sm text-[var(--text-muted)]">{profile.email}</span>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4 p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      {profile.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div className="text-lg font-black text-[var(--text)]">{profile.project_count}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">Projects</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div className="text-lg font-black text-[var(--text)]">{profile.connection_count}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">Connections</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div className="text-lg font-black text-[var(--text)]">{profile.plan_name || 'Free'}</div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">Plan</div>
                    </div>
                  </div>

                  {/* Member since */}
                  <div className="flex items-center gap-2 text-xs text-[var(--text-subtle)] mb-5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Member since {fmtD(profile.created_at)}
                  </div>

                  {/* Message button — only for accepted connections */}
                  {accepted.some(c => c.user_id === profile.id) && (
                    <button
                      onClick={() => startChat(profile.id)}
                      disabled={startingChat === profile.id}
                      className="w-full py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                      style={{ background: 'var(--primary)' }}>
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
