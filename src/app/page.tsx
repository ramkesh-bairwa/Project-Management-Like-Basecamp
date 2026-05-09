import Link from 'next/link';
import { OWNER } from '@/lib/owner';

const bgIcons = ['📋','✅','👥','🗂','📊','💬','🚀','📅','🔒','⚡','🎯','📌','🔔','📎','🏆'];

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f8fafc', color: '#1d3557', overflowX: 'hidden' }}>
      <style>{`
        @keyframes floatIcon { 0%,100%{transform:translateY(0) rotate(0deg);opacity:0.06} 50%{transform:translateY(-20px) rotate(8deg);opacity:0.11} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .hero-btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(230,57,70,0.5) !important; }
        .hero-btn-secondary:hover { background:#e2e8f0 !important; transform:translateY(-2px); }
        .hero-btn-primary,.hero-btn-secondary { transition:all 0.25s; }
        .feat-card:hover { transform:translateY(-6px) !important; box-shadow:0 20px 40px rgba(29,53,87,0.12) !important; }
        .feat-card { transition:all 0.3s; }
        .nav-link:hover { color:#1d3557 !important; }
        .shimmer-text {
          background: linear-gradient(90deg, #457b9d, #1d3557, #e63946, #1d3557, #457b9d);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
      `}</style>

      {/* Floating background icons */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        {bgIcons.map((icon, i) => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: 28 + (i % 3) * 10,
            left: `${(i * 67 + 5) % 95}%`,
            top: `${(i * 43 + 10) % 90}%`,
            animation: `floatIcon ${4 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
            opacity: 0.07,
            filter: 'grayscale(30%)',
          }}>{icon}</div>
        ))}
      </div>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(248,250,252,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#e63946,#c1121f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 17, boxShadow: '0 4px 14px rgba(230,57,70,0.3)' }}>P</div>
            <span style={{ fontWeight: 900, color: '#1d3557', fontSize: 19, letterSpacing: '-0.3px' }}>ProjectHub</span>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {([['Features','/features'],['Pricing','/pricing'],['Docs','/docs'],['Blog','/blog'],['About','/about'],['Contact','/contact']] as [string,string][]).map(([label, href]) => (
              <Link key={label} href={href} className="nav-link" style={{ padding: '7px 14px', borderRadius: 8, color: '#6b7a8d', fontWeight: 600, fontSize: 14, textDecoration: 'none', transition: 'color 0.2s' }}>{label}</Link>
            ))}
            <div style={{ width: 1, height: 20, background: '#d0dce8', margin: '0 8px' }} />
            <Link href="/login" className="nav-link" style={{ padding: '7px 16px', borderRadius: 8, color: '#1d3557', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Sign In</Link>
            <Link href="/register" style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 14px rgba(230,57,70,0.3)' }}>Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 1, padding: '120px 24px 100px', textAlign: 'center' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', animation: 'fadeUp 0.6s ease' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 24, background: 'rgba(42,157,143,0.08)', border: '1px solid rgba(42,157,143,0.2)', color: '#2a9d8f', fontSize: 13, fontWeight: 600, marginBottom: 32 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2a9d8f', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Trusted by 10,000+ teams worldwide
          </div>

          <h1 style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-2px' }}>
            Ship Projects<br />
            <span className="shimmer-text">Faster Together</span>
          </h1>

          <p style={{ fontSize: 19, color: '#6b7a8d', margin: '0 0 48px', lineHeight: 1.7, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            One workspace for tasks, teams, chats and deadlines. Stop juggling tools — start shipping.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <Link href="/register" className="hero-btn-primary" style={{ padding: '16px 36px', borderRadius: 14, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 20px rgba(230,57,70,0.4)' }}>
              Start for Free →
            </Link>
            <Link href="/login" className="hero-btn-secondary" style={{ padding: '16px 36px', borderRadius: 14, background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Free forever · No credit card · Cancel anytime</p>
        </div>

        {/* Dashboard mockup */}
        <div style={{ maxWidth: 860, margin: '64px auto 0', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 24, padding: '28px', boxShadow: '0 8px 40px rgba(29,53,87,0.08)', animation: 'fadeUp 0.8s ease 0.2s both' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#e63946' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#2a9d8f' }} />
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#f1f5f9', marginLeft: 8 }} />
          </div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { icon: '📋', label: 'Projects', val: '12', color: '#e63946' },
              { icon: '✅', label: 'Tasks Done', val: '48', color: '#2a9d8f' },
              { icon: '👥', label: 'Members', val: '24', color: '#457b9d' },
              { icon: '🗂', label: 'Groups', val: '6', color: '#a8dadc' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: 14, padding: '16px 12px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ color: s.color, fontWeight: 900, fontSize: 24 }}>{s.val}</div>
                <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Progress bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: 'Website Redesign', progress: 75, color: '#e63946' },
              { name: 'Mobile App v2', progress: 45, color: '#2a9d8f' },
              { name: 'API Integration', progress: 90, color: '#457b9d' },
            ].map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#6b7a8d', fontSize: 12, width: 140, textAlign: 'left' }}>{p.name}</span>
                <div style={{ flex: 1, height: 7, background: '#e2e8f0', borderRadius: 4 }}>
                  <div style={{ width: `${p.progress}%`, height: '100%', background: `linear-gradient(90deg,${p.color},${p.color}aa)`, borderRadius: 4 }} />
                </div>
                <span style={{ color: p.color, fontSize: 12, fontWeight: 700, width: 34 }}>{p.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(230,57,70,0.12)', border: '1px solid rgba(230,57,70,0.2)', color: '#e63946', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Features</div>
          <h2 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px' }}>Everything in one place</h2>
          <p style={{ color: '#6b7a8d', fontSize: 16 }}>No more switching between 5 different tools.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {[
            { icon: '✅', title: 'Task Management', desc: 'Kanban boards, subtasks, priorities and due dates. Keep every task on track.', color: '#e63946', bg: 'rgba(230,57,70,0.08)' },
            { icon: '💬', title: 'Real-time Chat', desc: 'Instant messaging, comments and @mentions. Your team stays in sync always.', color: '#457b9d', bg: 'rgba(69,123,157,0.08)' },
            { icon: '📊', title: 'Progress Tracking', desc: 'Visual dashboards and live reports. See exactly where every project stands.', color: '#2a9d8f', bg: 'rgba(42,157,143,0.08)' },
            { icon: '📅', title: 'Smart Scheduling', desc: 'Set deadlines, milestones and reminders. Never miss a delivery date again.', color: '#f4a261', bg: 'rgba(244,162,97,0.08)' },
            { icon: '🏢', title: 'Organizations', desc: 'Team workspaces with custom roles, permissions and org-wide visibility.', color: '#a8dadc', bg: 'rgba(168,218,220,0.08)' },
            { icon: '🔒', title: 'Enterprise Security', desc: 'Role-based access control, audit logs and enterprise-grade encryption.', color: '#6d6875', bg: 'rgba(109,104,117,0.08)' },
          ].map(f => (
            <div key={f.title} className="feat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '28px 24px' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: f.bg, border: `1px solid ${f.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 18 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px', color: '#1d3557' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#6b7a8d', margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(69,123,157,0.1)', border: '1px solid rgba(69,123,157,0.2)', color: '#457b9d', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>How It Works</div>
          <h2 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px', color: '#1d3557' }}>Up and running in minutes</h2>
          <p style={{ color: '#6b7a8d', fontSize: 16, margin: '0 0 56px' }}>Four steps to transform how your team works</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {[
              { step: '01', icon: '📋', title: 'Create Project', desc: 'Set up your project in seconds with a name, description and team.' },
              { step: '02', icon: '✅', title: 'Add Tasks', desc: 'Break work into tasks, assign members and set priorities.' },
              { step: '03', icon: '📊', title: 'Track Progress', desc: 'Monitor progress with live dashboards and status updates.' },
              { step: '04', icon: '🚀', title: 'Deliver On Time', desc: 'Hit every deadline and celebrate wins with your team.' },
            ].map((s, i) => (
              <div key={s.step} style={{ position: 'relative' }}>
                {i < 3 && <div style={{ position: 'absolute', top: 26, left: '65%', width: '70%', height: 1, background: '#d0dce8' }} />}
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', border: '1.5px solid #d0dce8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(29,53,87,0.08)' }}>{s.icon}</div>
                <div style={{ color: '#457b9d', fontSize: 11, fontWeight: 800, letterSpacing: 2, marginBottom: 6 }}>STEP {s.step}</div>
                <h3 style={{ color: '#1d3557', fontWeight: 800, fontSize: 15, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ color: '#6b7a8d', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ position: 'relative', zIndex: 1, padding: '80px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(69,123,157,0.1)', border: '1px solid rgba(69,123,157,0.2)', color: '#457b9d', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Pricing</div>
          <h2 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px', color: '#1d3557' }}>Simple, transparent pricing</h2>
          <p style={{ color: '#6b7a8d', fontSize: 16 }}>Start free. Upgrade when you need more.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'start' }}>
          {[
            { name: 'Free', price: '$0', period: '/forever', desc: 'Perfect for individuals and small teams.', color: '#457b9d', features: ['3 projects', '5 members', '20 tasks', '1GB storage', 'Basic chat'], cta: 'Get Started Free', highlight: false },
            { name: 'Pro', price: '$9.99', period: '/month', desc: 'For growing teams that need more power.', color: '#e63946', features: ['20 projects', '50 members', 'Unlimited tasks', '20GB storage', 'Group chat', 'Priority support', 'Analytics'], cta: 'Start Pro Trial', highlight: true },
            { name: 'Enterprise', price: '$99.99', period: '/month', desc: 'For large organizations at scale.', color: '#2a9d8f', features: ['Unlimited everything', '1000GB storage', 'Custom roles', 'API access', 'SLA guarantee', 'Dedicated support'], cta: 'Contact Sales', highlight: false },
          ].map(p => (
            <div key={p.name} style={{ background: p.highlight ? 'linear-gradient(145deg,#1d3557,#2a4a73)' : '#fff', border: p.highlight ? '1px solid rgba(230,57,70,0.3)' : '1px solid #e2e8f0', borderRadius: 22, padding: '32px 28px', position: 'relative', boxShadow: p.highlight ? '0 20px 60px rgba(29,53,87,0.2)' : '0 2px 12px rgba(29,53,87,0.06)', transform: p.highlight ? 'scale(1.04)' : 'none' }}>
              {p.highlight && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
              <div style={{ fontSize: 14, fontWeight: 800, color: p.highlight ? '#a8dadc' : p.color, marginBottom: 8 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 38, fontWeight: 900, color: '#fff' }}>{p.price}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>{p.period}</span>
              </div>
              <p style={{ fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.5)' : '#6b7a8d', margin: '0 0 24px', lineHeight: 1.5 }}>{p.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: p.highlight ? '#2a9d8f' : p.color, fontWeight: 900, fontSize: 14 }}>✓</span>
                    <span style={{ fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.7)' : '#475569' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/register" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 12, background: p.highlight ? 'linear-gradient(135deg,#e63946,#c1121f)' : 'transparent', border: p.highlight ? 'none' : `1.5px solid ${p.color}55`, color: p.highlight ? '#fff' : p.color, fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 24px', background: '#1d3557' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(230,57,70,0.08)', top: -80, right: -60, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(42,157,143,0.08)', bottom: -60, left: -40, pointerEvents: 'none' }} />
          <h2 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px', position: 'relative', color: '#fff' }}>Ready to get started?</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, margin: '0 0 36px', position: 'relative' }}>Join thousands of teams already using ProjectHub.</p>
          <Link href="/register" style={{ display: 'inline-block', padding: '16px 40px', borderRadius: 14, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 24px rgba(230,57,70,0.4)', position: 'relative' }}>
            Start for Free →
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 16, position: 'relative' }}>No credit card · Free forever · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, background: '#1d3557', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#e63946,#c1121f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff' }}>P</div>
                <span style={{ fontWeight: 900, color: '#fff', fontSize: 17 }}>ProjectHub</span>
              </div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 1.7, margin: 0, maxWidth: 240 }}>The all-in-one project management tool for modern teams.</p>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <a href={`mailto:${OWNER.email}`} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textDecoration: 'none' }}>✉ {OWNER.email}</a>
                <a href={`tel:${OWNER.phone}`}    style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textDecoration: 'none' }}>📞 {OWNER.phone}</a>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>📍 {OWNER.address}</span>
              </div>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{col.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecoration: 'none' }}>{l}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>© 2025 ProjectHub. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 16 }}>
              {['Twitter', 'GitHub', 'LinkedIn'].map(s => (
                <a key={s} href="#" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, textDecoration: 'none' }}>{s}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
