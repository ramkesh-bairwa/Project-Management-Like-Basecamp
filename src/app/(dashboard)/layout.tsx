'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const nav = [
  { href: '/dashboard', label: 'Home' },
  { href: '/projects', label: 'Projects' },
  { href: '/organizations', label: 'Organizations' },
  { href: '/groups', label: 'Groups' },
  { href: '/chats', label: 'Chats' },
  { href: '/connections', label: 'Connections' },
  { href: '/plans', label: 'Plans' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!token) return;
    function fetchUnread() {
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => Array.isArray(d) && setUnread(d.filter((n: { is_read: boolean }) => !n.is_read).length))
        .catch(() => {});
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  function logout() {
    fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('token');
    router.push('/login');
  }

  const isHome = pathname === '/dashboard';

  return (
    <div className="min-h-screen" style={{ background: '#f1faee' }}>
      {/* Top Nav */}
      <header style={{ background: '#1d3557' }} className="sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-base" style={{ background: '#e63946', color: '#fff' }}>P</div>
            <span className="font-black text-white text-lg tracking-tight hidden sm:block">ProjectHub</span>
          </Link>

          {/* Center nav links */}
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/notifications"
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition text-base">
              🔔
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-black"
                  style={{ background: '#e63946', fontSize: '9px' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)}
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white transition"
                style={{ background: '#457b9d' }}>
                U
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
            {/* Mobile menu */}
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

      {/* Page header band — only on inner pages */}
      {!isHome && (
        <div style={{ background: '#1d3557' }} className="border-b border-white/10">
          <div className="max-w-6xl mx-auto px-5 py-5">
            <h1 className="text-xl font-black text-white capitalize">
              {pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Dashboard'}
            </h1>
          </div>
        </div>
      )}

      <main className={isHome ? '' : 'max-w-6xl mx-auto px-5 py-8'}>
        {children}
      </main>
    </div>
  );
}
