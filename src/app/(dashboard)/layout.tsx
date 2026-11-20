'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useWebSocket } from '@/lib/ws-client';
import AuthGuard from '@/components/AuthGuard';
import { ToastProvider } from '@/components/GlobalToast';
import ThemeToggle from '@/components/ThemeToggle';
import CommandPalette from '@/components/shell/CommandPalette';
import ShortcutsModal from '@/components/shell/ShortcutsModal';
import FocusTimer from '@/components/shell/FocusTimer';
import { applyTheme } from '@/lib/theme';
import {
  IconHome, IconFolder, IconReport, IconBuilding, IconUsers, IconLink, IconGem, IconChat, IconSpark,
  IconBell, IconSearch, IconPlus, IconUser, IconArchive, IconShield, IconLogout, IconMenu, IconX,
  IconChevronLeft, IconTimer, IconKeyboard, IconChevronRight, IconSidebar, IconTask,
} from '@/components/shell/Icons';

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: 'chat' | 'notif' };
const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Workspace',
    items: [
      { href: '/dashboard', label: 'Home', icon: <IconHome /> },
      { href: '/projects', label: 'Projects', icon: <IconFolder /> },
      { href: '/daily-reports', label: 'Daily Reports', icon: <IconReport /> },
      { href: '/chats', label: 'Messages', icon: <IconChat />, badge: 'chat' },
      { href: '/chatme', label: 'ChatMe', icon: <IconSpark /> },
    ],
  },
  {
    title: 'Team',
    items: [
      { href: '/organizations', label: 'Organizations', icon: <IconBuilding /> },
      { href: '/groups', label: 'Groups', icon: <IconUsers /> },
      { href: '/connections', label: 'Connections', icon: <IconLink /> },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/notifications', label: 'Notifications', icon: <IconBell />, badge: 'notif' },
      { href: '/plans', label: 'Plans & Billing', icon: <IconGem /> },
    ],
  },
];

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Home', projects: 'Projects', 'daily-reports': 'Daily Reports', organizations: 'Organizations',
  groups: 'Groups', connections: 'Connections', plans: 'Plans & Billing', notifications: 'Notifications',
  chats: 'Messages', profile: 'Profile', archive: 'Archive', tasks: 'Tasks', docs: 'Docs', chat: 'Chat',
  new: 'New', create: 'Create', edit: 'Edit', payment: 'Payment', success: 'Success', cancel: 'Cancelled',
  razorpay: 'Checkout', sandbox: 'Checkout',
};

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

interface RecentProject { id: number; name: string; slug?: string; status?: string }

function avatarGradient(name: string) {
  const h = (name.charCodeAt(0) * 47 + (name.charCodeAt(1) || 0) * 13) % 360;
  return `linear-gradient(135deg, hsl(${h} 75% 60%), hsl(${(h + 40) % 360} 75% 50%))`;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function prettify(seg: string) {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg];
  const clean = decodeURIComponent(seg).replace(/-[a-z0-9]{6,}$/i, '').replace(/[-_]/g, ' ');
  return clean.replace(/\b\w/g, c => c.toUpperCase());
}

function Avatar({ name, src, size = 32 }: { name: string; src?: string; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
      style={{ width: size, height: size, background: avatarGradient(name || 'U'), fontSize: size * 0.4 }}>
      {(name || 'U')[0].toUpperCase()}
    </div>
  );
}

function Badge({ n, tone = 'accent' }: { n: number; tone?: 'accent' | 'success' }) {
  if (n <= 0) return null;
  return (
    <span className="min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
      style={{ background: tone === 'accent' ? 'var(--accent)' : 'var(--success)' }}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

interface SiteSettings { site_name: string; site_logo_url: string; logo_letter: string; primary_color: string; accent_color: string; secondary_color: string; }
const DEFAULT_SETTINGS: SiteSettings = { site_name: 'ProjectHub', site_logo_url: '', logo_letter: 'P', primary_color: '#1d3557', accent_color: '#e63946', secondary_color: '#457b9d' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrg, setIsOrg] = useState<boolean | null>(null);
  const [planName, setPlanName] = useState('');
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);

  // Notification dropdown state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number; title: string; body: string; link: string; is_read: boolean; created_at: string; type: string }[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [totalUnreadChat, setTotalUnreadChat] = useState(0);
  const [chatView, setChatView] = useState<'list' | 'new'>('list');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connSearch, setConnSearch] = useState('');
  const [startingChat, setStartingChat] = useState<number | null>(null);
  const chatDropRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);

  // Restore sidebar preference
  useEffect(() => {
    try { setCollapsed(localStorage.getItem('sidebar-collapsed') === '1'); } catch { /* ignore */ }
  }, []);
  const toggleCollapsed = useCallback(() => {
    setCollapsed(c => {
      try { localStorage.setItem('sidebar-collapsed', c ? '0' : '1'); } catch { /* ignore */ }
      return !c;
    });
  }, []);

  // Load site settings once
  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setSite({ ...DEFAULT_SETTINGS, ...d })).catch(() => {});
  }, []);

  // Load token + user + notifications on mount/route change
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    setToken(t);
    if (!t) return;
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (d?.name) setUserName(d.name);
        if (d?.email) setUserEmail(d.email);
        if (d?.avatar) setUserAvatar(d.avatar);
        if (d?.role === 'admin') setIsAdmin(true);
        if (d && 'is_org' in d) setIsOrg(!!d.is_org);
        if (d?.plan_name) setPlanName(d.plan_name);
      })
      .catch(() => {});
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) return;
        setNotifications(d.slice(0, 20));
        setUnread(d.filter((n: { is_read: boolean }) => !n.is_read).length);
      })
      .catch(() => {});
  }, [pathname]);

  // Recent projects for the sidebar
  useEffect(() => {
    if (!token) return;
    fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : []))
      .then(d => Array.isArray(d) && setRecentProjects(d.slice(0, 5)))
      .catch(() => {});
  }, [token]);

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
      })
      .catch(() => {});
  }, [token]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (chatDropRef.current && !chatDropRef.current.contains(t)) setChatOpen(false);
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
      const inUser = (userMenuRef.current?.contains(t)) || (mobileUserMenuRef.current?.contains(t));
      if (!inUser) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close the mobile drawer on navigation
  useEffect(() => { setDrawerOpen(false); setMenuOpen(false); }, [pathname]);

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

  useEffect(() => { if (pathname === '/notifications') { setUnread(0); setNotifOpen(false); } }, [pathname]);
  useEffect(() => { if (pathname === '/chats') { setTotalUnreadChat(0); setChatOpen(false); } }, [pathname]);

  // ── Global keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    let gPressed = 0;
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t || !t.tagName) return false;
      return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      // Don't hijack keys while a modal dialog from a page is open
      if (document.querySelector('[role="dialog"]') && e.key !== '?') return;
      const k = e.key.toLowerCase();
      if (Date.now() - gPressed < 1200) {
        const map: Record<string, string> = { h: '/dashboard', p: '/projects', r: '/daily-reports', m: '/chats', o: '/organizations', n: '/notifications', g: '/groups' };
        gPressed = 0;
        if (map[k]) { e.preventDefault(); router.push(map[k]); }
        return;
      }
      if (k === 'g') { gPressed = Date.now(); return; }
      if (e.key === '?') { e.preventDefault(); setShowShortcuts(s => !s); return; }
      if (k === '/') { e.preventDefault(); window.dispatchEvent(new Event('open-command-palette')); return; }
      if (k === 'f') { e.preventDefault(); setFocusSignal(s => s + 1); return; }
      if (k === 't') { e.preventDefault(); applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'); return; }
      if (k === '[') { e.preventDefault(); toggleCollapsed(); return; }
      if (k === 'c') { e.preventDefault(); router.push('/projects?new=1'); return; }
      if (k === 'd') { e.preventDefault(); router.push('/daily-reports/create'); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, toggleCollapsed]);

  function openChatDropdown() {
    setChatOpen(o => !o);
    setNotifOpen(false);
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

  async function markAllRead() {
    if (!token) return;
    await fetch('/api/notifications', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  }

  function openNotifDropdown() {
    setNotifOpen(o => !o);
    setChatOpen(false);
  }

  const isHome = pathname === '/dashboard';
  const isFullBleed = pathname.startsWith('/chats');
  const filteredConns = connections.filter(c =>
    c.name.toLowerCase().includes(connSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(connSearch.toLowerCase())
  );

  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => ({ label: prettify(seg), href: '/' + segments.slice(0, i + 1).join('/') }));
  const pageTitle = crumbs[crumbs.length - 1]?.label || 'Home';

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
  const badgeFor = (b?: 'chat' | 'notif') => (b === 'chat' ? totalUnreadChat : b === 'notif' ? unread : 0);

  const userMenu = (placement: string) => (
    <div className={`absolute ${placement} w-60 rounded-2xl p-1.5 z-50 animate-scale-in`}
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
      <div className="px-3 py-2.5 mb-1" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <div className="text-sm font-semibold text-fg truncate">{userName || 'User'}</div>
        <div className="text-xs text-subtle truncate">{userEmail}</div>
      </div>
      <Link href="/profile" className="nav-item"><IconUser size={16} /> Profile</Link>
      <Link href="/plans" className="nav-item"><IconGem size={16} /> Plans & Billing</Link>
      <Link href="/archive" className="nav-item"><IconArchive size={16} /> Archive</Link>
      <button onClick={() => { setMenuOpen(false); setShowShortcuts(true); }} className="nav-item w-full"><IconKeyboard size={16} /> Shortcuts <span className="ml-auto kbd">?</span></button>
      {isAdmin && <Link href="/admin" className="nav-item" style={{ color: 'var(--accent)' }}><IconShield size={16} /> Admin Panel</Link>}
      <div className="my-1 h-px" style={{ background: 'var(--border-soft)' }} />
      <button onClick={logout} className="nav-item w-full" style={{ color: 'var(--danger)' }}><IconLogout size={16} /> Sign out</button>
    </div>
  );

  // ── Sidebar (shared by desktop rail and mobile drawer) ─────────────
  const sidebar = (mini: boolean, withUserMenu: boolean) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center h-16 flex-shrink-0 ${mini ? 'justify-center px-2' : 'px-4 gap-2.5'}`}>
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 group">
          {site.site_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.site_logo_url} alt="logo" className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-extrabold text-white flex-shrink-0 transition-transform group-hover:scale-105 group-hover:-rotate-6"
              style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-glow)', fontSize: site.logo_letter.length > 1 ? 12 : 16 }}>
              {site.logo_letter}
            </div>
          )}
          {!mini && <span className="font-display font-bold text-[17px] text-fg truncate tracking-tight">{site.site_name}</span>}
        </Link>
        {!mini && withUserMenu && (
          <button onClick={toggleCollapsed} className="ml-auto hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-subtle hover:text-fg hover:bg-[var(--surface-hover)] transition" title="Collapse sidebar ( [ )">
            <IconChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Search + create */}
      <div className={`flex flex-col gap-2 ${mini ? 'px-2 items-center' : 'px-3'} pb-3`}>
        <button onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          className={`flex items-center gap-2.5 h-9 rounded-xl text-sm text-subtle transition hover:text-fg ${mini ? 'w-10 justify-center' : 'px-3 w-full'}`}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} title="Search (⌘K)">
          <IconSearch size={16} />
          {!mini && <><span className="flex-1 text-left">Search…</span><span className="kbd">⌘K</span></>}
        </button>
        <Link href="/projects?new=1" className={`btn btn-gradient ${mini ? 'w-10 h-10 px-0' : 'w-full'}`} title="New project (C)">
          <IconPlus size={17} />
          {!mini && 'New project'}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden ${mini ? 'px-2' : 'px-3'} pb-4`}>
        {NAV_SECTIONS.map(section => (
          <div key={section.title} className="mt-3 first:mt-1">
            {!mini && <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">{section.title}</div>}
            {mini && <div className="mx-auto my-2 w-6 h-px" style={{ background: 'var(--border)' }} />}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = isActive(item.href);
                const count = badgeFor(item.badge);
                return (
                  <Link key={item.href} href={item.href} data-active={active} title={mini ? item.label : undefined}
                    className={`nav-item ${mini ? 'justify-center px-0 w-10 mx-auto' : ''}`}>
                    <span className="relative flex-shrink-0 flex">
                      {item.icon}
                      {mini && count > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                    </span>
                    {!mini && <span className="flex-1 truncate">{item.label}</span>}
                    {!mini && <Badge n={count} tone={item.badge === 'chat' ? 'success' : 'accent'} />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Recent projects */}
        {!mini && recentProjects.length > 0 && (
          <div className="mt-5">
            <div className="px-3 mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Recent projects</span>
              <Link href="/projects" className="text-[11px] font-semibold text-subtle hover:text-primary-text">All</Link>
            </div>
            <div className="space-y-0.5">
              {recentProjects.map(p => {
                const href = `/projects/${p.slug || p.id}`;
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link key={p.id} href={href} data-active={active} className="nav-item">
                    <span className="w-[18px] h-[18px] rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: avatarGradient(p.name) }}>{p.name[0]?.toUpperCase()}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Upgrade card */}
      {!mini && isOrg === false && (
        <div className="mx-3 mb-3 p-4 rounded-2xl relative overflow-hidden" style={{ background: 'var(--grad-brand-soft)', border: '1px solid var(--border)' }}>
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-40 blur-2xl" style={{ background: 'var(--grad-brand)' }} />
          <div className="relative">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg"><IconGem size={16} className="text-primary-text" /> Go Pro</div>
            <p className="text-xs text-muted mt-1 leading-relaxed">Unlock organizations, roles and unlimited projects.</p>
            <Link href="/plans" className="btn btn-sm btn-primary w-full mt-3">Upgrade</Link>
          </div>
        </div>
      )}

      {/* User */}
      <div className={`flex-shrink-0 ${mini ? 'p-2' : 'p-3'}`} style={{ borderTop: '1px solid var(--border)' }} ref={withUserMenu ? userMenuRef : mobileUserMenuRef}>
        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)}
            className={`w-full flex items-center gap-3 rounded-xl transition hover:bg-[var(--surface-hover)] ${mini ? 'justify-center p-1' : 'p-2'}`}>
            <span className="relative flex">
              <Avatar name={userName || 'U'} src={userAvatar} size={34} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: 'var(--success)', border: '2px solid var(--bg-elevated)' }} />
            </span>
            {!mini && (
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-sm font-semibold text-fg truncate">{userName || 'User'}</span>
                <span className="block text-xs text-subtle truncate">{planName ? `${planName} plan` : userEmail}</span>
              </span>
            )}
            {!mini && <IconChevronRight size={15} className="text-subtle" />}
          </button>
          {menuOpen && userMenu(mini ? 'bottom-0 left-full ml-2' : 'bottom-full mb-2 left-0')}
        </div>
      </div>
    </div>
  );

  const dropdownStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg">
        <AuthGuard />
        <style>{`@media (min-width: 1024px) { :root { --content-pl: ${collapsed ? '76px' : 'var(--sidebar-w)'}; } }`}</style>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 z-40 transition-[width] duration-300"
          style={{ width: collapsed ? 76 : 'var(--sidebar-w)', background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)' }}>
          {sidebar(collapsed, true)}
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-[80]">
            <div className="absolute inset-0 animate-fade-in" style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)' }} onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] animate-fade-in" style={{ background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)' }}>
              <button onClick={() => setDrawerOpen(false)} className="absolute top-4 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-subtle hover:text-fg z-10" aria-label="Close menu"><IconX size={17} /></button>
              {sidebar(false, false)}
            </aside>
          </div>
        )}

        {/* Main column */}
        <div className="transition-[padding] duration-300" style={{ paddingLeft: 'var(--content-pl, 0px)' }}>
          {/* Top bar */}
          <header className="sticky top-0 z-30 glass" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
              <button onClick={() => setDrawerOpen(true)} className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-[var(--surface-hover)]" aria-label="Open menu">
                <IconMenu />
              </button>
              {collapsed && (
                <button onClick={toggleCollapsed} className="hidden lg:flex w-9 h-9 rounded-xl items-center justify-center text-muted hover:text-fg hover:bg-[var(--surface-hover)]" title="Expand sidebar ( [ )">
                  <IconSidebar size={17} />
                </button>
              )}

              {/* Breadcrumbs */}
              <nav className="flex items-center gap-1.5 min-w-0 text-sm" aria-label="Breadcrumb">
                {crumbs.map((c, i) => (
                  <span key={c.href} className={`flex items-center gap-1.5 min-w-0 ${i < crumbs.length - 1 ? 'hidden sm:flex' : ''}`}>
                    {i > 0 && <IconChevronRight size={14} className="text-subtle flex-shrink-0" />}
                    {i === crumbs.length - 1
                      ? <span className="font-semibold text-fg truncate">{c.label}</span>
                      : <Link href={c.href} className="text-muted hover:text-fg truncate">{c.label}</Link>}
                  </span>
                ))}
              </nav>

              <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
                <button onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
                  className="hidden md:flex items-center gap-2 h-9 pl-3 pr-2 mr-1 rounded-xl text-sm text-subtle hover:text-fg transition w-56"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <IconSearch size={15} />
                  <span className="flex-1 text-left">Quick search</span>
                  <span className="kbd">⌘K</span>
                </button>
                <button onClick={() => window.dispatchEvent(new Event('open-command-palette'))} className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-[var(--surface-hover)]" aria-label="Search">
                  <IconSearch size={18} />
                </button>

                <button onClick={() => setFocusSignal(s => s + 1)} className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-muted hover:text-fg hover:bg-[var(--surface-hover)] transition" title="Focus timer (F)">
                  <IconTimer size={18} />
                </button>

                <ThemeToggle />

                {/* ── Chat dropdown ── */}
                <div className="relative" ref={chatDropRef}>
                  <button onClick={openChatDropdown}
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-[var(--surface-hover)] transition" title="Messages">
                    <IconChat size={18} />
                    {totalUnreadChat > 0 && (
                      <span className="absolute top-1 right-0.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-white font-bold text-[9px]"
                        style={{ background: 'var(--success)', boxShadow: '0 0 0 2px var(--surface)' }}>
                        {totalUnreadChat > 9 ? '9+' : totalUnreadChat}
                      </span>
                    )}
                  </button>

                  {chatOpen && (
                    <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-12 sm:w-[340px] rounded-2xl overflow-hidden z-50 animate-scale-in origin-top-right" style={dropdownStyle}>
                      <div className="flex items-center justify-between px-4 h-14" style={{ borderBottom: '1px solid var(--border)' }}>
                        {chatView === 'list' ? (
                          <>
                            <div>
                              <div className="font-display font-bold text-fg text-sm">Messages</div>
                              {totalUnreadChat > 0 && <div className="text-xs text-subtle">{totalUnreadChat} unread</div>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={openNewChat} className="btn btn-sm btn-secondary"><IconPlus size={13} /> New</button>
                              <Link href="/chats" onClick={() => setChatOpen(false)} className="btn btn-sm btn-ghost">See all</Link>
                            </div>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setChatView('list')} className="flex items-center gap-1 text-sm text-muted hover:text-fg transition">
                              <IconChevronLeft size={15} /> Back
                            </button>
                            <div className="font-display font-bold text-fg text-sm">New chat</div>
                            <div className="w-12" />
                          </>
                        )}
                      </div>

                      {chatView === 'list' && (
                        <div className="max-h-96 overflow-y-auto p-1.5">
                          {chats.length === 0 ? (
                            <div className="py-10 text-center">
                              <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-primary-soft text-primary-text"><IconChat /></div>
                              <div className="text-sm font-semibold text-fg mb-1">No conversations yet</div>
                              <button onClick={openNewChat} className="text-xs font-semibold text-primary-text hover:underline">Start one</button>
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
                                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-[var(--surface-hover)] transition text-left">
                                  <Avatar name={displayName} size={38} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`text-sm truncate text-fg ${chat.unread_count > 0 ? 'font-bold' : 'font-medium'}`}>{displayName}</span>
                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {chat.last_message_at && <span className="text-[11px] text-subtle">{timeAgo(chat.last_message_at)}</span>}
                                        <Badge n={chat.unread_count} tone="success" />
                                      </div>
                                    </div>
                                    {chat.last_message && <span className="text-xs truncate block mt-0.5 text-subtle">{chat.last_message}</span>}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}

                      {chatView === 'new' && (
                        <div>
                          <div className="p-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                            <div className="relative">
                              <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
                              <input autoFocus value={connSearch} onChange={e => setConnSearch(e.target.value)} placeholder="Search connections…"
                                className="input h-9 pl-9 text-sm" />
                            </div>
                          </div>
                          <div className="max-h-72 overflow-y-auto p-1.5">
                            {connections.length === 0 ? (
                              <div className="py-10 text-center">
                                <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-primary-soft text-primary-text"><IconLink /></div>
                                <div className="text-sm font-semibold text-fg mb-1">No connections yet</div>
                                <Link href="/connections" onClick={() => setChatOpen(false)} className="text-xs font-semibold text-primary-text hover:underline">Find people</Link>
                              </div>
                            ) : filteredConns.length === 0 ? (
                              <div className="py-8 text-center text-sm text-subtle">No results for &ldquo;{connSearch}&rdquo;</div>
                            ) : (
                              filteredConns.map(conn => (
                                <button key={conn.user_id} onClick={() => startChat(conn.user_id)} disabled={startingChat === conn.user_id}
                                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-[var(--surface-hover)] transition disabled:opacity-50">
                                  <Avatar name={conn.name} size={36} />
                                  <div className="flex-1 min-w-0 text-left">
                                    <div className="text-sm font-semibold text-fg truncate">{conn.name}</div>
                                    <div className="text-xs truncate text-subtle">{conn.email}</div>
                                  </div>
                                  {startingChat === conn.user_id
                                    ? <div className="w-4 h-4 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
                                    : <IconChat size={15} className="text-subtle flex-shrink-0" />}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notifications dropdown */}
                <div className="relative" ref={notifRef}>
                  <button onClick={openNotifDropdown}
                    className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-[var(--surface-hover)] transition" title="Notifications">
                    <IconBell size={18} />
                    {unread > 0 && (
                      <span className="absolute top-1 right-0.5 min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-white font-bold text-[9px]"
                        style={{ background: 'var(--accent)', boxShadow: '0 0 0 2px var(--surface)' }}>
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-12 sm:w-[380px] rounded-2xl z-50 overflow-hidden animate-scale-in origin-top-right" style={dropdownStyle}>
                      <div className="flex items-center justify-between px-4 h-14" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <div className="font-display font-bold text-fg text-sm">Notifications</div>
                          {unread > 0 && <div className="text-xs text-subtle">{unread} unread</div>}
                        </div>
                        {unread > 0 && <button onClick={markAllRead} className="btn btn-sm btn-ghost">Mark all read</button>}
                      </div>

                      <div className="max-h-96 overflow-y-auto p-1.5">
                        {notifications.length === 0 ? (
                          <div className="py-10 text-center">
                            <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-primary-soft text-primary-text"><IconBell /></div>
                            <div className="text-sm font-semibold text-fg">You’re all caught up</div>
                            <div className="text-xs text-subtle mt-1">New activity will show up here.</div>
                          </div>
                        ) : (
                          notifications.map(n => (
                            <Link key={n.id} href={n.link || '/notifications'}
                              onClick={() => {
                                setNotifOpen(false);
                                if (!n.is_read) {
                                  fetch('/api/notifications', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) });
                                  setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                                  setUnread(u => Math.max(0, u - 1));
                                }
                              }}
                              className="flex items-start gap-3 px-2.5 py-2.5 rounded-xl hover:bg-[var(--surface-hover)] transition"
                              style={{ background: n.is_read ? 'transparent' : 'var(--primary-soft)' }}>
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ background: n.type === 'task' ? 'var(--info-soft)' : n.type === 'project' ? 'var(--success-soft)' : 'var(--warning-soft)', color: n.type === 'task' ? 'var(--info)' : n.type === 'project' ? 'var(--success)' : 'var(--warning)' }}>
                                {n.type === 'task' ? <IconTask size={15} /> : n.type === 'project' ? <IconFolder size={15} /> : <IconBell size={15} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold text-fg line-clamp-2">{n.title}</div>
                                {n.body && <div className="text-xs truncate mt-0.5 text-muted">{n.body}</div>}
                                <div className="text-[11px] mt-1 text-subtle">{timeAgo(n.created_at)}</div>
                              </div>
                              {!n.is_read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: 'var(--accent)' }} />}
                            </Link>
                          ))
                        )}
                      </div>

                      <Link href="/notifications" onClick={() => setNotifOpen(false)}
                        className="flex items-center justify-center h-11 text-xs font-semibold text-primary-text hover:bg-[var(--surface-hover)] transition"
                        style={{ borderTop: '1px solid var(--border)' }}>
                        View all notifications
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <main key={pathname} className={`page-enter ${isHome ? '' : isFullBleed ? 'px-4 sm:px-6 py-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
            {!isHome && !isFullBleed && (
              <h1 className="font-display text-2xl sm:text-[28px] font-bold text-fg tracking-tight mb-6">{pageTitle}</h1>
            )}
            {children}
          </main>
        </div>

        <CommandPalette isAdmin={isAdmin} onShowShortcuts={() => setShowShortcuts(true)} onToggleFocus={() => setFocusSignal(s => s + 1)} />
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
        <FocusTimer toggleSignal={focusSignal} />
      </div>
    </ToastProvider>
  );
}
