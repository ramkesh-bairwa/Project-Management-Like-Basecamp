import Link from 'next/link';

const tiles = [
  { icon: '📋', label: 'Projects', desc: 'Track work, set priorities, hit deadlines', bg: '#e63946' },
  { icon: '✅', label: 'Tasks', desc: 'Kanban boards, sub-tasks, priorities', bg: '#457b9d' },
  { icon: '💬', label: 'Chats', desc: 'Direct messages and group conversations', bg: '#2a9d8f' },
  { icon: '🏢', label: 'Organizations', desc: 'Team workspaces with roles', bg: '#6d6875' },
  { icon: '👥', label: 'Groups', desc: 'Focused circles for any team', bg: '#f4a261' },
  { icon: '🔗', label: 'Connections', desc: 'Build your professional network', bg: '#e9c46a' },
];

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: '#f1faee' }}>
      {/* Nav */}
      <header style={{ background: '#1d3557' }} className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-base" style={{ background: '#e63946', color: '#fff' }}>P</div>
            <span className="font-black text-white text-lg tracking-tight">ProjectHub</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-bold text-white/70 hover:text-white transition">Sign in</Link>
            <Link href="/register" className="px-4 py-2 text-sm font-black text-white rounded-lg transition hover:opacity-90" style={{ background: '#e63946' }}>Get started free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: '#1d3557' }} className="py-20 px-5 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-8" style={{ background: 'rgba(168,218,220,0.15)', color: '#a8dadc', border: '1px solid rgba(168,218,220,0.3)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#a8dadc' }} />
          All-in-one project management
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-6">
          Everything your team<br />
          <span style={{ color: '#a8dadc' }}>needs to ship.</span>
        </h1>
        <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
          Projects, tasks, chats, groups, and organizations — all connected. Work solo or scale your entire company.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="px-8 py-3.5 rounded-xl font-black text-base text-white transition hover:opacity-90" style={{ background: '#e63946' }}>
            Start for free
          </Link>
          <Link href="/login" className="px-8 py-3.5 rounded-xl font-black text-base transition hover:bg-white/10" style={{ border: '2px solid rgba(255,255,255,0.2)', color: '#fff' }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* Tiles */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-black text-center mb-2" style={{ color: '#1d3557' }}>Everything in one place</h2>
        <p className="text-center text-sm mb-10" style={{ color: '#6b7a8d' }}>No more switching between tools</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {tiles.map((t, i) => (
            <div key={t.label} className="rounded-2xl p-6 hover:-translate-y-0.5 transition-all"
              style={{ background: t.bg, boxShadow: '0 4px 16px rgba(29,53,87,0.12)' }}>
              <div className="text-3xl mb-3">{t.icon}</div>
              <div className={`font-black text-lg mb-1 ${i >= 3 ? 'text-[#1d3557]' : 'text-white'}`}>{t.label}</div>
              <div className={`text-sm ${i >= 3 ? 'text-[#1d3557]/60' : 'text-white/60'}`}>{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-5 pb-16">
        <div className="rounded-2xl p-10 text-center" style={{ background: '#1d3557' }}>
          <h2 className="text-3xl font-black text-white mb-3">Ready to get started?</h2>
          <p className="text-white/50 mb-8">Free forever. No credit card required.</p>
          <Link href="/register" className="inline-block px-8 py-3.5 rounded-xl font-black text-base text-white hover:opacity-90 transition" style={{ background: '#e63946' }}>
            Create free account
          </Link>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #d0dce8' }} className="bg-white py-6">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center font-black text-xs" style={{ background: '#e63946', color: '#fff' }}>P</div>
            <span className="font-black text-sm" style={{ color: '#1d3557' }}>ProjectHub</span>
          </div>
          <span className="text-sm" style={{ color: '#6b7a8d' }}>2025 ProjectHub</span>
        </div>
      </footer>
    </div>
  );
}
