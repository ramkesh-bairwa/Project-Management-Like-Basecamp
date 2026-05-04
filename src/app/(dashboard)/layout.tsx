'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/lib/ws-client';
import AuthGuard from '@/components/AuthGuard';

const nav = [
  { href: '/dashboard', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/organizations', label: 'Organizations' },
  { href: '/groups', label: 'Groups' },
  { href: '/connections', label: 'Connections' },
  { href: '/plans', label: 'Plans' },
];

interface Chat {
  id: number;
  type: string;
  name: string;
  other_user_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  group_slug?: string | null;
  project_slug?: string | null;
}

interface Connection {
  user_id: number;
  name: string;
  email: string;
  status: string;
}

const avatarBgs = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#6d6875', '#e9c46a'];
function avatarBg(name: string) { return avatarBgs[name.charCodeAt(0) % avatarBgs.length]; }

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  // Chat dropdown state
  const [chatOpen, setChatOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [totalUnreadChat, setTotalUnreadChat] = useState(0);
  const [chatView, setChatView] = useState<'list' | 'new'>('list');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connSearch, setConnSearch] = useState('');
  const [startingChat, setStartingChat] = useState<number | null>(null);
  const chatDropRef = useRef<HTMLDivElement>(null);

  // Load token + notifications on mount/route change
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    setToken(t);
    if (!t) return;
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => { if (d?.name) setUserName(d.name); })
      .catch(() => {});
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => Array.isArray(d) && setUnread(d.filter((n: { is_read: boolean }) => !n.is_read).length))
      .catch(() => {});
  }, [pathname]);

  // Load chats once
  useEffect(() => {
    if (!token) return;
    fetch('/api/chats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) return;
        const direct = d.filter((c: Chat) => c.type === 'direct');
        setChats(direct);
        setTotalUnreadChat(direct.reduce((s: number, c: Chat) => s + (c.unread_count || 0), 0));
      });
  }, [token]);

  // Close chat dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (chatDropRef.current && !chatDropRef.current.contains(e.target as Node)) {
        setChatOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // WebSocket: bump notification badge + update chat unread
  const handleWS = useCallback((msg: Record<string, unknown>) => {
    if (msg.type === 'notification') setUnread(u => u + 1);
    if (msg.type === 'chat_message') {
      const chatId = Number(msg.chat_id);
      setChats(prev => {
        const updated = prev.map(c =>
          c.id === chatId
            ? { ...c, last_message: msg.content as string, last_message_at: msg.created_at as string, unread_count: c.unread_count + 1 }
            : c
        ).filter(c => c.type === 'direct');
        const idx = updated.findIndex(c => c.id === chatId);
        if (idx > 0) { const [item] = updated.splice(idx, 1); updated.unshift(item); }
        setTotalUnreadChat(updated.reduce((s, c) => s + (c.unread_count || 0), 0));
        return updated;
      });
    }
  }, []);
  useWebSocket(token, handleWS);

  useEffect(() => { if (pathname === '/notifications') setUnread(0); }, [pathname]);
  useEffect(() => { if (pathname === '/chats') { setTotalUnreadChat(0); setChatOpen(false); } }, [pathname]);

  function openChatDropdown() {
    setChatOpen(o => !o);
    setChatView('list');
    setConnSearch('');
  }

  function loadConnections() {
    if (!token || connections.length) return;
    fetch('/api/connections', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => Array.isArray(d) && setConnections(d.filter((c: Connection) => c.status === 'accepted')));
  }

  function openNewChat() {
    setChatView('new');
    loadConnections();
    setConnSearch('');
  }

  async function startChat(userId: number) {
    if (!token) return;
    setStartingChat(userId);
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'direct', participant_ids: [userId] }),
    });
    const data = await res.json();
    setStartingChat(null);
    if (res.ok) {
      setChatOpen(false);
      sessionStorage.setItem('openChatId', String(data.id));
      router.push('/chats');
    }
  }

  function logout() {
    window.location.href = '/logout';
  }

  const isHome = pathname === '/dashboard';
  const filteredConns = connections.filter(c =>
    c.name.toLowerCase().includes(connSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(connSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: '#f1faee' }}>
      <AuthGuard />
      <header style={{ background: '#1d3557' }} className="sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-base" style={{ background: '#e63946', color: '#fff' }}>P</div>
            <span className="font-black text-white text-lg tracking-tight hidden sm:block">ProjectHub</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {nav.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${active ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">

            {/* ── Chat dropdown ── */}
            <div className="relative" ref={chatDropRef}>
              <button onClick={openChatDropdown}
                className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {totalUnreadChat > 0 && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-white font-black"
                    style={{ background: '#2a9d8f', fontSize: '9px' }}>
                    {totalUnreadChat > 9 ? '9+' : totalUnreadChat}
                  </span>
                )}
              </button>

              {chatOpen && (
                <div className="absolute right-0 top-11 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
                  style={{ background: '#fff', border: '1.5px solid #d0dce8' }}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ background: '#1d3557' }}>
                    {chatView === 'list' ? (
                      <>
                        <div>
                          <div className="font-black text-white text-sm">Messages</div>
                          {totalUnreadChat > 0 && <div className="text-xs text-white/50">{totalUnreadChat} unread</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={openNewChat}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white hover:bg-white/10 transition"
                            style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            New Chat
                          </button>
                          <Link href="/chats" onClick={() => setChatOpen(false)}
                            className="text-xs font-bold text-white/60 hover:text-white transition">
                            See all →
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setChatView('list')} className="flex items-center gap-1.5 text-white/70 hover:text-white transition text-sm">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                          Back
                        </button>
                        <div className="font-black text-white text-sm">New Chat</div>
                        <div className="w-12" />
                      </>
                    )}
                  </div>

                  {/* List view */}
                  {chatView === 'list' && (
                    <div className="max-h-80 overflow-y-auto">
                      {chats.length === 0 ? (
                        <div className="py-10 text-center">
                          <div className="text-3xl mb-2">💬</div>
                          <div className="text-sm font-bold text-[#1d3557] mb-1">No conversations yet</div>
                          <button onClick={openNewChat} className="text-xs font-bold hover:underline" style={{ color: '#457b9d' }}>Start one</button>
                        </div>
                      ) : (
                        chats.map(chat => {
                          const displayName = chat.other_user_name || chat.name || 'User';
                          return (
                            <button key={chat.id}
                              onClick={() => {
                                setChatOpen(false);
                                sessionStorage.setItem('openChatId', String(chat.id));
                                router.push('/chats');
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition text-left"
                              style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                                style={{ background: avatarBg(displayName) }}>
                                {displayName[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-sm font-bold text-[#1d3557] truncate">{displayName}</span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {chat.last_message_at && (
                                      <span className="text-xs" style={{ color: '#94a3b8' }}>{timeAgo(chat.last_message_at)}</span>
                                    )}
                                    {chat.unread_count > 0 && (
                                      <span className="text-xs font-black text-white rounded-full w-5 h-5 flex items-center justify-center"
                                        style={{ background: '#2a9d8f', fontSize: '9px' }}>
                                        {chat.unread_count > 9 ? '9+' : chat.unread_count}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {chat.last_message && (
                                  <span className="text-xs truncate block mt-0.5" style={{ color: '#94a3b8' }}>{chat.last_message}</span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* New chat — pick a connection */}
                  {chatView === 'new' && (
                    <div>
                      <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <input
                            autoFocus
                            value={connSearch}
                            onChange={e => setConnSearch(e.target.value)}
                            placeholder="Search connections…"
                            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm focus:outline-none"
                            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1d3557' }}
                          />
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {connections.length === 0 ? (
                          <div className="py-10 text-center">
                            <div className="text-3xl mb-2">🔗</div>
                            <div className="text-sm font-bold text-[#1d3557] mb-1">No connections yet</div>
                            <Link href="/connections" onClick={() => setChatOpen(false)} className="text-xs font-bold hover:underline" style={{ color: '#457b9d' }}>
                              Find people
                            </Link>
                          </div>
                        ) : filteredConns.length === 0 ? (
                          <div className="py-8 text-center text-sm" style={{ color: '#94a3b8' }}>No results for &ldquo;{connSearch}&rdquo;</div>
                        ) : (
                          filteredConns.map(conn => (
                            <button key={conn.user_id}
                              onClick={() => startChat(conn.user_id)}
                              disabled={startingChat === conn.user_id}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition disabled:opacity-50"
                              style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                                style={{ background: avatarBg(conn.name) }}>
                                {conn.name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="text-sm font-bold text-[#1d3557] truncate">{conn.name}</div>
                                <div className="text-xs truncate" style={{ color: '#94a3b8' }}>{conn.email}</div>
                              </div>
                              {startingChat === conn.user_id ? (
                                <div className="w-4 h-4 rounded-full border-2 border-[#457b9d] border-t-transparent animate-spin flex-shrink-0" />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" className="flex-shrink-0">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                </svg>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <Link href="/notifications"
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-black"
                  style={{ background: '#e63946', fontSize: '9px' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition">
                <span className="text-sm font-bold text-white hidden sm:block">{userName || 'User'}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white"
                  style={{ background: '#457b9d' }}>
                  {userName ? userName[0].toUpperCase() : 'U'}
                </div>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 bg-white border border-[#d0dce8] rounded-xl shadow-xl w-44 py-1 z-50">
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1d3557] hover:bg-[#f1faee] transition">👤 Profile</Link>
                  <Link href="/plans" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1d3557] hover:bg-[#f1faee] transition">💎 Plans</Link>
                  <div className="border-t border-[#d0dce8] my-1" />
                  <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">🚪 Sign out</button>
                </div>
              )}
            </div>

            <button onClick={() => setMenuOpen(o => !o)} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition">☰</button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-3 flex flex-col gap-1" style={{ background: '#152840' }}>
            {nav.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition">
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Page header band */}
      {!isHome && (
        <div style={{ background: '#1d3557' }} className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-5 py-5">
            <h1 className="text-xl font-black text-white capitalize">
              {pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Dashboard'}
            </h1>
          </div>
        </div>
      )}

      <main className={isHome ? '' : 'max-w-7xl mx-auto px-5 py-8'}>
        {children}
      </main>
    </div>
  );
}
