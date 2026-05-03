'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface User { name: string; email: string; plan_name: string; is_org: boolean }

const tiles = [
  { href: '/projects', label: 'Projects', desc: 'Track work, set priorities, hit deadlines.', icon: '📋', bg: '#e63946', shadow: 'rgba(230,57,70,0.3)', light: false },
  { href: '/chats', label: 'Chats', desc: 'Direct messages and group conversations.', icon: '💬', bg: '#457b9d', shadow: 'rgba(69,123,157,0.3)', light: false },
  { href: '/organizations', label: 'Organizations', desc: 'Team workspaces with roles and permissions.', icon: '🏢', bg: '#2a9d8f', shadow: 'rgba(42,157,143,0.3)', light: false },
  { href: '/groups', label: 'Groups', desc: 'Focused circles for any team or topic.', icon: '👥', bg: '#e9c46a', shadow: 'rgba(233,196,106,0.3)', light: true },
  { href: '/connections', label: 'Connections', desc: 'Build and grow your professional network.', icon: '🔗', bg: '#f4a261', shadow: 'rgba(244,162,97,0.3)', light: true },
  { href: '/notifications', label: 'Notifications', desc: 'Stay on top of everything happening.', icon: '🔔', bg: '#6d6875', shadow: 'rgba(109,104,117,0.3)', light: false },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState({ projects: 0, connections: 0, notifications: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    fetch('/api/users/me', { headers: h }).then(r => r.json()).then(setUser);
    Promise.all([
      fetch('/api/projects', { headers: h }).then(r => r.json()),
      fetch('/api/connections', { headers: h }).then(r => r.json()),
      fetch('/api/notifications', { headers: h }).then(r => r.json()),
    ]).then(([p, c, n]) => setCounts({
      projects: Array.isArray(p) ? p.length : 0,
      connections: Array.isArray(c) ? c.filter((x: { status: string }) => x.status === 'accepted').length : 0,
      notifications: Array.isArray(n) ? n.filter((x: { is_read: boolean }) => !x.is_read).length : 0,
    }));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      {/* Hero greeting band */}
      <div style={{ background: '#1d3557' }} className="py-14 px-5 text-center">
        <p className="text-white/40 text-xs font-semibold mb-2 tracking-widest uppercase">
          {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-4xl font-black text-white mb-2">
          {greeting}{user ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-white/40 text-base">What are you working on today?</p>
        <div className="flex items-center justify-center gap-10 mt-8">
          {[
            { label: 'Projects', value: counts.projects, color: '#e63946' },
            { label: 'Connections', value: counts.connections, color: '#a8dadc' },
            { label: 'Unread', value: counts.notifications, color: '#f4a261' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-white/40 text-xs mt-0.5 font-medium uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade strip */}
      {!user?.is_org && (
        <div style={{ background: '#152840' }} className="py-2.5 px-5 text-center">
          <span className="text-white/40 text-sm">
            Want team workspaces?{' '}
            <Link href="/plans" className="font-bold hover:underline" style={{ color: '#a8dadc' }}>Upgrade your plan</Link>
          </span>
        </div>
      )}

      {/* Tile grid */}
      <div className="max-w-5xl mx-auto px-5 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiles.map(tile => (
            <Link key={tile.href} href={tile.href}
              className="group rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
              style={{ boxShadow: `0 4px 20px ${tile.shadow}` }}>
              <div className="p-7 h-full flex flex-col" style={{ background: tile.bg }}>
                <div className="text-4xl mb-4">{tile.icon}</div>
                <div className={`text-xl font-black mb-2 ${tile.light ? 'text-[#1d3557]' : 'text-white'}`}>{tile.label}</div>
                <div className={`text-sm leading-relaxed flex-1 ${tile.light ? 'text-[#1d3557]/65' : 'text-white/65'}`}>{tile.desc}</div>
                <div className={`mt-5 text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all ${tile.light ? 'text-[#1d3557]/50' : 'text-white/40'}`}>
                  Open {tile.label} <span>&#8594;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Plans banner */}
        <div className="mt-5 rounded-2xl p-7 flex items-center justify-between gap-6"
          style={{ background: '#1d3557', boxShadow: '0 4px 20px rgba(29,53,87,0.25)' }}>
          <div className="flex items-center gap-5">
            <div className="text-4xl">💎</div>
            <div>
              <div className="text-white font-black text-lg">
                {user?.is_org ? 'Organization Plan Active' : 'Upgrade to unlock Organizations'}
              </div>
              <div className="text-white/40 text-sm mt-0.5">
                {user?.is_org
                  ? `You are on the ${user.plan_name || 'Pro'} plan — full access enabled.`
                  : 'Pro, Business and Enterprise plans unlock team workspaces, custom roles, and more.'}
              </div>
            </div>
          </div>
          <Link href="/plans"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition hover:opacity-90"
            style={{ background: '#e63946' }}>
            {user?.is_org ? 'Manage Plan' : 'See Plans'}
          </Link>
        </div>
      </div>
    </div>
  );
}
