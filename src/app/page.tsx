import Link from 'next/link';
import type { ReactNode } from 'react';
import { OWNER } from '@/lib/owner';
import PublicNav, { CtaBand, PublicFooter } from '@/components/PublicNav';

/* ════════════════════════════════════════════════════════════════
   Small presentational helpers
   ════════════════════════════════════════════════════════════════ */
const AVATARS = [
  { i: 'AK', bg: 'linear-gradient(135deg,#6d5efc,#8b5cf6)' },
  { i: 'RS', bg: 'linear-gradient(135deg,#f43f5e,#ec4899)' },
  { i: 'MJ', bg: 'linear-gradient(135deg,#10b981,#14b8a6)' },
  { i: 'PL', bg: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  { i: 'DN', bg: 'linear-gradient(135deg,#3b82f6,#6366f1)' },
];

function Avatar({ idx, size = 22, ring = true }: { idx: number; size?: number; ring?: boolean }) {
  const a = AVATARS[idx % AVATARS.length];
  return (
    <span
      className={`inline-grid place-items-center rounded-full font-bold text-white ${ring ? 'ring-2 ring-[var(--surface)]' : ''}`}
      style={{ width: size, height: size, background: a.bg, fontSize: size * 0.38 }}
    >
      {a.i}
    </span>
  );
}

function AvatarStack({ ids, size = 22 }: { ids: number[]; size?: number }) {
  return (
    <span className="flex -space-x-1.5">
      {ids.map(i => <Avatar key={i} idx={i} size={size} />)}
    </span>
  );
}

function Icon({ d, size = 18, className = '' }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  check: 'M20 6L9 17l-5-5',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  kanban: 'M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v6h-4z',
  doc: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  report: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  org: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h6',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  rocket: 'M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1zM12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2zM9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5',
  calendar: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9z',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
};

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: ReactNode; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary-text shadow-[var(--shadow-xs)]">
        {eyebrow}
      </span>
      <h2 className="mt-5 font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-fg text-balance">{title}</h2>
      {subtitle && <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted text-pretty">{subtitle}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Hero app preview — pure HTML/CSS mock of the product
   ════════════════════════════════════════════════════════════════ */
type MockTask = { title: string; tag: string; tagColor: string; avatars: number[]; progress?: number; due?: string; comments?: number };
const KANBAN: { name: string; color: string; tasks: MockTask[] }[] = [
  {
    name: 'To do', color: 'var(--text-subtle)',
    tasks: [
      { title: 'Draft Q3 launch brief', tag: 'Marketing', tagColor: 'var(--accent)', avatars: [1], due: 'Jul 12', comments: 3 },
      { title: 'Audit onboarding emails', tag: 'Growth', tagColor: 'var(--warning)', avatars: [3, 4], due: 'Jul 14' },
    ],
  },
  {
    name: 'In progress', color: 'var(--primary)',
    tasks: [
      { title: 'Redesign billing settings', tag: 'Design', tagColor: 'var(--primary)', avatars: [0, 2], progress: 68, comments: 8 },
      { title: 'Realtime chat presence', tag: 'Eng', tagColor: 'var(--info)', avatars: [4], progress: 34 },
    ],
  },
  {
    name: 'Done', color: 'var(--success)',
    tasks: [
      { title: 'Ship docs editor v2', tag: 'Product', tagColor: 'var(--success)', avatars: [0, 1, 3], progress: 100 },
      { title: 'Migrate to MySQL 8', tag: 'Infra', tagColor: 'var(--info)', avatars: [2], progress: 100 },
    ],
  },
];

function TaskCard({ t, done }: { t: MockTask; done?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow-xs)]">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.tagColor }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{t.tag}</span>
      </div>
      <div className={`mt-1.5 text-[12.5px] font-semibold leading-snug ${done ? 'text-muted line-through decoration-[var(--text-subtle)]' : 'text-fg'}`}>{t.title}</div>
      {typeof t.progress === 'number' && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: done ? 'var(--success)' : 'var(--grad-brand)' }} />
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between">
        <AvatarStack ids={t.avatars} size={18} />
        <div className="flex items-center gap-2 text-[10px] font-medium text-subtle">
          {t.comments && (
            <span className="inline-flex items-center gap-0.5"><Icon d={ICONS.chat} size={11} />{t.comments}</span>
          )}
          {t.due && (
            <span className="inline-flex items-center gap-0.5"><Icon d={ICONS.calendar} size={11} />{t.due}</span>
          )}
          {done && <span className="inline-flex items-center gap-0.5 text-[var(--success-text)]"><Icon d={ICONS.check} size={11} />Done</span>}
        </div>
      </div>
    </div>
  );
}

function AppPreview() {
  return (
    <div className="relative mx-auto max-w-6xl">
      {/* glow */}
      <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[40px] opacity-60 blur-3xl" style={{ background: 'var(--grad-brand-soft)' }} />

      <div className="ring-gradient rounded-[22px] bg-surface p-1.5 shadow-[var(--shadow-lg)] sm:p-2">
        <div className="overflow-hidden rounded-[16px] border border-line bg-bg">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="mx-auto flex h-6 w-full max-w-xs items-center justify-center gap-1.5 rounded-md bg-surface-3 px-3 text-[10.5px] text-subtle">
              <Icon d={ICONS.shield} size={10} /> app.projecthub.io/projects/website
            </div>
            <div className="hidden w-12 sm:block" />
          </div>

          <div className="flex min-h-[340px] sm:min-h-[420px]">
            {/* Sidebar */}
            <aside className="hidden w-48 shrink-0 flex-col gap-1 border-r border-line bg-surface p-3 md:flex">
              <div className="mb-2 flex items-center gap-2 px-1.5">
                <span className="grid h-6 w-6 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: 'var(--grad-brand)' }}>A</span>
                <span className="text-[12px] font-bold text-fg">Acme Inc.</span>
              </div>
              <div className="mb-2 flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 text-[10.5px] text-subtle">
                <Icon d={ICONS.search} size={11} /> Search <span className="kbd ml-auto !h-4 !min-w-4 !text-[9px]">⌘K</span>
              </div>
              {[
                { l: 'Dashboard', d: ICONS.report },
                { l: 'Projects', d: ICONS.folder, active: true },
                { l: 'Chats', d: ICONS.chat, badge: '3' },
                { l: 'Docs', d: ICONS.doc },
                { l: 'Daily reports', d: ICONS.calendar },
                { l: 'Notifications', d: ICONS.bell },
              ].map(n => (
                <div key={n.l} className={`flex h-7 items-center gap-2 rounded-md px-2 text-[11.5px] font-medium ${n.active ? 'bg-primary-soft text-primary-text' : 'text-muted'}`}>
                  <Icon d={n.d} size={13} /> {n.l}
                  {n.badge && <span className="ml-auto rounded-full bg-[var(--accent)] px-1.5 text-[9px] font-bold text-white">{n.badge}</span>}
                </div>
              ))}
              <div className="mt-3 px-2 text-[9.5px] font-semibold uppercase tracking-wider text-subtle">Projects</div>
              {[['Website redesign', 'var(--primary)'], ['Mobile app v2', 'var(--accent)'], ['API platform', 'var(--success)']].map(([p, c]) => (
                <div key={p} className="flex h-7 items-center gap-2 rounded-md px-2 text-[11.5px] text-muted">
                  <span className="h-2 w-2 rounded-[3px]" style={{ background: c }} /> {p}
                </div>
              ))}
            </aside>

            {/* Main */}
            <div className="min-w-0 flex-1 p-3 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10.5px] font-medium text-subtle">Projects / Website</div>
                  <div className="mt-0.5 font-display text-[15px] font-bold text-fg sm:text-[17px]">Website redesign</div>
                </div>
                <div className="flex items-center gap-2">
                  <AvatarStack ids={[0, 1, 2, 3]} size={24} />
                  <span className="hidden h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold text-white sm:inline-flex" style={{ background: 'var(--primary)' }}>
                    <Icon d={ICONS.plus} size={12} /> New task
                  </span>
                </div>
              </div>

              {/* progress strip */}
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
                <span className="text-[11px] font-semibold text-muted">Sprint 14</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full w-[72%] rounded-full animate-[gradient-pan_6s_ease_infinite] bg-[length:200%_100%]" style={{ backgroundImage: 'var(--grad-brand)' }} />
                </div>
                <span className="text-[11px] font-bold text-fg">72%</span>
              </div>

              {/* kanban */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {KANBAN.map((col, ci) => (
                  <div key={col.name} className={`rounded-xl bg-surface-2 p-2 ${ci > 0 ? 'hidden sm:block' : ''}`}>
                    <div className="mb-2 flex items-center gap-1.5 px-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-[11px] font-bold text-fg">{col.name}</span>
                      <span className="ml-auto text-[10px] font-semibold text-subtle">{col.tasks.length}</span>
                    </div>
                    <div className="space-y-2">
                      {col.tasks.map(t => <TaskCard key={t.title} t={t} done={ci === 2} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute -left-6 top-1/3 hidden w-56 animate-float rounded-2xl border border-line glass p-3 shadow-[var(--shadow-lg)] lg:block xl:-left-14">
        <div className="flex items-start gap-2.5">
          <Avatar idx={1} size={30} ring={false} />
          <div className="min-w-0">
            <div className="text-[11.5px] font-semibold text-fg">Riya <span className="font-normal text-muted">mentioned you</span></div>
            <div className="mt-1 rounded-lg bg-surface-2 px-2 py-1.5 text-[11px] leading-snug text-muted">
              <span className="font-semibold text-primary-text">@you</span> billing mock is ready for review 🎉
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-6 bottom-16 hidden w-52 animate-float rounded-2xl border border-line glass p-3 shadow-[var(--shadow-lg)] [animation-delay:-3s] lg:block xl:-right-12">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--success-soft)] text-[var(--success-text)]"><Icon d={ICONS.check} size={14} /></span>
          <div>
            <div className="text-[11.5px] font-semibold text-fg">Daily report sent</div>
            <div className="text-[10.5px] text-subtle">6 tasks · 2 blockers cleared</div>
          </div>
        </div>
        <div className="mt-2.5 flex h-8 items-end gap-1">
          {[40, 65, 30, 80, 55, 95, 70].map((h, i) => (
            <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 5 ? 'var(--grad-brand)' : 'var(--primary-soft)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Bento visuals
   ════════════════════════════════════════════════════════════════ */
function BentoCard({ icon, title, desc, className = '', children }: { icon: string; title: string; desc: string; className?: string; children?: ReactNode }) {
  return (
    <div className={`group card card-hover relative flex flex-col overflow-hidden p-6 sm:p-7 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: 'var(--grad-brand-soft)' }} />
      <div className="relative">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary-text ring-1 ring-[var(--primary-ring)]">
          <Icon d={icon} size={19} />
        </span>
        <h3 className="mt-4 font-display text-lg font-bold text-fg">{title}</h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">{desc}</p>
      </div>
      {children && <div className="relative mt-6 flex-1">{children}</div>}
    </div>
  );
}

const FAQS = [
  { q: 'Is there really a free plan?', a: 'Yes. The Free plan is free forever — 3 projects, 5 members and the core tools. No credit card needed to sign up.' },
  { q: 'Can I switch plans later?', a: 'Upgrade or downgrade any time from your Plans page. Changes apply immediately and billing is prorated.' },
  { q: 'Does ProjectHub work for remote teams?', a: 'Absolutely. Real-time chat, @mentions, daily reports and notifications keep distributed teams in sync across time zones.' },
  { q: 'How is my data secured?', a: 'All traffic is encrypted with SSL, access is role-based per organization and project, and every account is reviewed before activation.' },
  { q: 'Can I bring my whole organization?', a: 'Yes — create an organization, invite members, group them into teams and control exactly who sees what.' },
];

const TESTIMONIALS = [
  { quote: 'We replaced three tools with ProjectHub in a week. Standups went from 30 minutes to 5 thanks to daily reports.', name: 'Ananya Kapoor', role: 'Head of Product, Lumen', idx: 0 },
  { quote: 'The kanban board is fast, the chat is right where the work is, and onboarding new folks takes minutes.', name: 'Marcus Johnson', role: 'Engineering Lead, Northwind', idx: 2 },
  { quote: 'Finally a PM tool my clients actually enjoy using. Docs + tasks in one place is a game changer for our agency.', name: 'Priya Laghari', role: 'Founder, Studio Kite', idx: 3 },
];

const PLANS = [
  { name: 'Free', price: '$0', period: '/forever', desc: 'Perfect for individuals and small teams.', features: ['3 projects', '5 members', '20 tasks', '1GB storage', 'Basic chat'], cta: 'Get Started', highlight: false },
  { name: 'Pro', price: '$9.99', period: '/month', desc: 'For growing teams that need more power.', features: ['20 projects', '50 members', 'Unlimited tasks', '20GB storage', 'Group chat', 'Priority support', 'Analytics'], cta: 'Start Pro Trial', highlight: true },
  { name: 'Enterprise', price: '$99.99', period: '/month', desc: 'For large organizations at scale.', features: ['Unlimited everything', '1000GB storage', 'Custom roles', 'API access', 'SLA guarantee', 'Dedicated support'], cta: 'Contact Sales', highlight: false },
];

/* ════════════════════════════════════════════════════════════════
   Page
   ════════════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <style>{`
        @keyframes ph-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .ph-marquee { animation: ph-marquee 32s linear infinite; }
        .ph-faq[open] .ph-faq-icon { transform: rotate(45deg); }
        .ph-faq summary::-webkit-details-marker { display: none; }
      `}</style>

      <PublicNav />

      {/* ── HERO (aurora extends up behind the transparent nav) ── */}
      <div className="relative -mt-16 pt-16">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 aurora" />
        <div aria-hidden className="pointer-events-none absolute inset-0 dot-grid opacity-70 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_30%,transparent_100%)]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[680px] max-w-full -translate-x-1/2 rounded-full opacity-40 blur-[120px]" style={{ background: 'var(--grad-brand)' }} />

        <div className="relative z-10">
          <section className="mx-auto max-w-7xl px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-24 sm:pb-24">
            <div className="stagger">
              <Link href="/features" className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 py-1 pl-1 pr-3 text-xs font-medium text-muted shadow-[var(--shadow-xs)] backdrop-blur transition hover:border-[var(--border-strong)]">
                <span className="relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: 'var(--grad-brand)' }}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  New
                </span>
                Trusted by 10,000+ teams worldwide
                <Icon d={ICONS.arrow} size={13} className="transition-transform group-hover:translate-x-0.5" />
              </Link>

              <h1 className="mx-auto mt-7 max-w-4xl font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-fg sm:text-6xl md:text-7xl lg:text-[5.25rem]">
                Ship projects
                <br className="hidden sm:block" />{' '}
                <span className="text-gradient animate-[gradient-pan_8s_ease_infinite] bg-[length:200%_200%]">faster, together.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-xl text-pretty">
                One workspace for tasks, teams, chats and deadlines. Stop juggling tools — start shipping.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className="group btn btn-gradient btn-lg w-full sm:w-auto">
                  Start for free
                  <Icon d={ICONS.arrow} size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/login" className="btn btn-secondary btn-lg w-full sm:w-auto">
                  Sign in
                  <span className="kbd ml-1 hidden sm:inline-flex">↵</span>
                </Link>
              </div>
              <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-subtle">
                {['Free forever', 'No credit card', 'Cancel anytime'].map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5"><Icon d={ICONS.check} size={13} className="text-[var(--success)]" />{t}</span>
                ))}
              </p>
            </div>

            <div className="mt-14 animate-fade-up [animation-delay:.25s] sm:mt-20">
              <AppPreview />
            </div>
          </section>
        </div>
      </div>

      {/* ── LOGO STRIP ── */}
      <section className="border-y border-line bg-surface/60 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-subtle">Powering teams at fast-moving companies</p>
        <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
          <div className="ph-marquee flex w-max items-center gap-14 pr-14">
            {[...Array(2)].flatMap((_, k) =>
              ['Northwind', 'Lumen', 'Acme', 'Vertex', 'Studio Kite', 'Orbital', 'Pinecone', 'Helix'].map(n => (
                <span key={`${k}-${n}`} className="flex items-center gap-2 font-display text-lg font-bold text-subtle opacity-80 transition hover:opacity-100 hover:text-fg sm:text-xl">
                  <span className="h-5 w-5 rounded-md border-2 border-current opacity-70" />
                  {n}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
        <SectionHeader
          eyebrow="Features"
          title={<>Everything in <span className="text-gradient">one place</span></>}
          subtitle="No more switching between 5 different tools. Tasks, docs, chat and reports — beautifully connected."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 sm:gap-5">
          {/* Tasks */}
          <BentoCard className="md:col-span-2 lg:col-span-4" icon={ICONS.kanban} title="Tasks & Kanban" desc="Kanban boards, subtasks, priorities and due dates. Drag work across columns and keep every task on track.">
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {KANBAN.map((col, ci) => (
                <div key={col.name} className="rounded-xl bg-surface-2 p-2">
                  <div className="mb-2 flex items-center gap-1.5 px-0.5 text-[10.5px] font-bold text-fg">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.color }} />{col.name}
                  </div>
                  <div className="space-y-1.5">
                    {col.tasks.slice(0, ci === 1 ? 2 : 1).map(t => (
                      <div key={t.title} className={`rounded-lg border border-line bg-surface p-2 shadow-[var(--shadow-xs)] transition-transform duration-500 ${ci === 1 ? 'group-hover:-translate-y-1 group-hover:rotate-[-1.5deg]' : ''}`}>
                        <div className="truncate text-[11px] font-semibold text-fg">{t.title}</div>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="h-1 w-8 rounded-full" style={{ background: t.tagColor }} />
                          <Avatar idx={t.avatars[0]} size={14} ring={false} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Chat */}
          <BentoCard className="lg:col-span-2" icon={ICONS.chat} title="Real-time chat" desc="Instant messaging, comments and @mentions. Your team stays in sync, always.">
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <Avatar idx={2} size={22} ring={false} />
                <div className="rounded-2xl rounded-bl-md bg-surface-2 px-3 py-2 text-[12px] text-fg">Pushed the fix to staging 🚀</div>
              </div>
              <div className="flex items-end justify-end gap-2">
                <div className="rounded-2xl rounded-br-md px-3 py-2 text-[12px] text-white" style={{ background: 'var(--primary)' }}>Looks great — merging now</div>
              </div>
              <div className="flex items-center gap-2 pl-8 text-[11px] text-subtle">
                <span className="flex gap-0.5">
                  {[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-subtle)]" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </span>
                Riya is typing
              </div>
            </div>
          </BentoCard>

          {/* Docs */}
          <BentoCard className="lg:col-span-2" icon={ICONS.doc} title="Docs" desc="Rich-text docs that live next to the work — specs, notes and wikis per project.">
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <div className="h-2.5 w-2/3 rounded bg-[var(--text)] opacity-80" />
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 w-full rounded bg-surface-3" />
                <div className="h-1.5 w-11/12 rounded bg-surface-3" />
                <div className="h-1.5 w-4/5 rounded bg-surface-3" />
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-1 text-[10.5px] font-medium text-primary-text">
                <Icon d={ICONS.check} size={11} /> Linked to 4 tasks
              </div>
            </div>
          </BentoCard>

          {/* Daily reports */}
          <BentoCard className="lg:col-span-2" icon={ICONS.report} title="Daily reports" desc="Async standups in seconds. See what shipped, what's next and what's blocked.">
            <div className="flex h-24 items-end gap-1.5">
              {[35, 55, 42, 70, 60, 88, 76].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="w-full rounded-md transition-all duration-500 group-hover:opacity-100" style={{ height: `${h}%`, background: i === 5 ? 'var(--grad-brand)' : 'var(--primary-soft)', opacity: i === 5 ? 1 : 0.9 }} />
                  <span className="text-[9px] font-medium text-subtle">{'MTWTFSS'[i]}</span>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Notifications */}
          <BentoCard className="lg:col-span-2" icon={ICONS.bell} title="Notifications" desc="Smart, real-time alerts for mentions, assignments and deadlines — never miss a beat.">
            <div className="space-y-2">
              {[
                { t: 'Task assigned to you', s: 'Redesign billing settings', c: 'var(--primary)' },
                { t: 'Deadline tomorrow', s: 'Q3 launch brief', c: 'var(--warning)' },
              ].map((n, i) => (
                <div key={n.t} className={`flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5 shadow-[var(--shadow-xs)] transition-transform duration-500 ${i === 0 ? 'group-hover:translate-x-1' : ''}`}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.c, boxShadow: `0 0 0 4px color-mix(in srgb, ${n.c} 18%, transparent)` }} />
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] font-semibold text-fg">{n.t}</div>
                    <div className="truncate text-[10.5px] text-subtle">{n.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>

          {/* Organizations */}
          <BentoCard className="lg:col-span-3" icon={ICONS.org} title="Organizations & groups" desc="Team workspaces with custom roles, permissions and org-wide visibility.">
            <div className="flex flex-wrap items-center gap-2">
              {[['Owner', 0], ['Admin', 1], ['Member', 2], ['Member', 3], ['Guest', 4]].map(([role, i]) => (
                <span key={`${role}-${i}`} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 text-[11px] font-medium text-muted">
                  <Avatar idx={i as number} size={20} ring={false} /> {role}
                </span>
              ))}
            </div>
          </BentoCard>

          {/* Security */}
          <BentoCard className="md:col-span-2 lg:col-span-3" icon={ICONS.shield} title="Enterprise security" desc="Role-based access control, account approval and enterprise-grade encryption.">
            <div className="grid grid-cols-3 gap-2">
              {['SSL', 'RBAC', 'Approval'].map(s => (
                <div key={s} className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-2 py-3 text-[11px] font-semibold text-muted">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success-text)]"><Icon d={ICONS.check} size={13} /></span>
                  {s}
                </div>
              ))}
            </div>
          </BentoCard>
        </div>

        <div className="mt-10 text-center">
          <Link href="/features" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary-text">
            Explore all features <Icon d={ICONS.arrow} size={15} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative overflow-hidden border-y border-line bg-surface py-24 sm:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-0 dot-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,#000_10%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader eyebrow="How it works" title="Up and running in minutes" subtitle="Four steps to transform how your team works." />
          <div className="relative mt-16">
          <div aria-hidden className="absolute left-[12%] right-[12%] top-7 hidden h-px lg:block" style={{ background: 'linear-gradient(90deg, transparent, var(--border-strong), var(--primary), var(--border-strong), transparent)' }} />
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '01', icon: ICONS.folder, title: 'Create project', desc: 'Set up your project in seconds with a name, description and team.' },
              { step: '02', icon: ICONS.kanban, title: 'Add tasks', desc: 'Break work into tasks, assign members and set priorities.' },
              { step: '03', icon: ICONS.report, title: 'Track progress', desc: 'Monitor progress with live dashboards and status updates.' },
              { step: '04', icon: ICONS.rocket, title: 'Deliver on time', desc: 'Hit every deadline and celebrate wins with your team.' },
            ].map(s => (
              <li key={s.step} className="relative text-center">
                <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface text-primary-text shadow-[var(--shadow-md)]">
                  <Icon d={s.icon} size={22} />
                  <span className="absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: 'var(--grad-brand)' }}>{s.step}</span>
                </div>
                <h3 className="mt-5 font-display text-base font-bold text-fg">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-[15rem] text-sm leading-relaxed text-muted">{s.desc}</p>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-[var(--border)] lg:grid-cols-4">
          {[
            ['10k+', 'Teams worldwide'],
            ['1.2M', 'Tasks shipped'],
            ['99.9%', 'Uptime SLA'],
            ['50+', 'Countries'],
          ].map(([v, l]) => (
            <div key={l} className="bg-surface px-6 py-10 text-center">
              <div className="font-display text-4xl font-extrabold tracking-tight text-gradient sm:text-5xl">{v}</div>
              <div className="mt-2 text-sm font-medium text-muted">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 sm:pb-32">
        <SectionHeader eyebrow="Loved by teams" title="Teams ship more with ProjectHub" />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure key={t.name} className={`card card-hover flex flex-col p-7 ${i === 1 ? 'ring-gradient md:-translate-y-4' : ''}`}>
              <div className="flex gap-0.5 text-[var(--warning)]">
                {[0, 1, 2, 3, 4].map(s => (
                  <svg key={s} width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={ICONS.star} /></svg>
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-fg">“{t.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                <Avatar idx={t.idx} size={38} ring={false} />
                <div>
                  <div className="text-sm font-semibold text-fg">{t.name}</div>
                  <div className="text-xs text-subtle">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section id="pricing" className="relative overflow-hidden border-y border-line bg-surface py-24 sm:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-0 aurora opacity-70" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader eyebrow="Pricing" title="Simple, transparent pricing" subtitle="Start free. Upgrade when you need more." />
          <div className="mt-14 grid items-stretch gap-5 md:grid-cols-3">
            {PLANS.map(p => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-[22px] p-7 ${p.highlight ? 'text-white shadow-[var(--shadow-glow)] md:-my-3 md:py-10' : 'card'}`}
                style={p.highlight ? { background: 'var(--grad-brand)' } : undefined}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--text)] px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--bg)] shadow-[var(--shadow-md)]">Most popular</span>
                )}
                <div className={`text-sm font-semibold ${p.highlight ? 'text-white/85' : 'text-primary-text'}`}>{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className={`font-display text-4xl font-extrabold tracking-tight ${p.highlight ? 'text-white' : 'text-fg'}`}>{p.price}</span>
                  <span className={`text-sm ${p.highlight ? 'text-white/70' : 'text-subtle'}`}>{p.period}</span>
                </div>
                <p className={`mt-2 text-sm ${p.highlight ? 'text-white/80' : 'text-muted'}`}>{p.desc}</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.features.map(f => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${p.highlight ? 'text-white/90' : 'text-muted'}`}>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${p.highlight ? 'bg-white/20 text-white' : 'bg-[var(--success-soft)] text-[var(--success-text)]'}`}>
                        <Icon d={ICONS.check} size={11} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`btn btn-lg mt-8 w-full ${p.highlight ? 'bg-white text-[#2a1f7a] hover:bg-white/90 shadow-[var(--shadow-md)]' : 'btn-secondary'}`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/pricing" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-primary-text">
              Compare all plans <Icon d={ICONS.arrow} size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32">
        <SectionHeader eyebrow="FAQ" title="Questions? Answers." />
        <div className="mt-12 space-y-3">
          {FAQS.map(f => (
            <details key={f.q} className="ph-faq group card overflow-hidden transition-colors open:border-[var(--primary-ring)] open:shadow-[var(--shadow-md)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
                <span className="font-display text-[15px] font-semibold text-fg sm:text-base">{f.q}</span>
                <span className="ph-faq-icon grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-3 text-muted transition-transform duration-300">
                  <Icon d={ICONS.plus} size={14} />
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-muted sm:px-6">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted">
          Still curious? <a href={`mailto:${OWNER.email}`} className="font-semibold text-primary-text hover:underline">Email us</a> or visit the <Link href="/contact" className="font-semibold text-primary-text hover:underline">contact page</Link>.
        </p>
      </section>

      {/* ── CTA BAND ── */}
      <CtaBand title="Ready to get started?" subtitle="Join thousands of teams already using ProjectHub.">
        <Link href="/register" className="group btn btn-lg bg-white text-[#2a1f7a] shadow-[var(--shadow-lg)] hover:bg-white/90">
          Start for free <Icon d={ICONS.arrow} size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
        <Link href="/contact" className="btn btn-lg border border-white/30 text-white hover:bg-white/10">Talk to sales</Link>
      </CtaBand>

      <PublicFooter />
    </div>
  );
}
