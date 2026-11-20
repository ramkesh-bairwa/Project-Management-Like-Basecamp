'use client';
import Link from 'next/link';
import PublicNav, { CtaBand, PageHero, PublicFooter } from '@/components/PublicNav';
import { usePageContent } from '@/lib/hooks/usePageContent';
import { OWNER } from '@/lib/owner';

export default function AboutPage() {
  const { get } = usePageContent('about');

  const values = [1,2,3,4].map(i => ({
    icon:  get(`value${i}`,'icon',''),
    title: get(`value${i}`,'title',''),
    desc:  get(`value${i}`,'desc',''),
  })).filter(v => v.title);

  const members = [1,2,3,4,5,6].map(i => ({
    name:   get(`member${i}`,'name',''),
    role:   get(`member${i}`,'role',''),
    avatar: get(`member${i}`,'avatar',''),
    color:  get(`member${i}`,'color','#6366f1'),
    bio:    get(`member${i}`,'bio',''),
  })).filter(m => m.name);

  const stats = [
    [get('stats','teams','10k+'),    'Teams worldwide'],
    [get('stats','countries','50+'), 'Countries'],
    [get('stats','uptime','99.9%'),  'Uptime SLA'],
    [get('stats','founded','2022'),  'Founded'],
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <PublicNav />

      <PageHero eyebrow="About us" title={get('hero','title','We are on a mission')} subtitle={get('hero','subtitle','') || undefined} />

      {/* Story + Stats */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-text">Our story</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{get('story','title','Our Story')}</h2>
            <div
              className="mt-5 space-y-4 text-[15px] leading-relaxed text-muted [&_a]:text-primary-text [&_p]:mb-4 [&_strong]:text-fg"
              dangerouslySetInnerHTML={{ __html: get('story','body','') }}
            />
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-[var(--border)] shadow-[var(--shadow-sm)]">
            {stats.map(([val, lbl]) => (
              <div key={lbl} className="bg-surface px-5 py-9 text-center">
                <div className="font-display text-4xl font-extrabold tracking-tight text-gradient">{val}</div>
                <div className="mt-1.5 text-sm font-medium text-muted">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      {values.length > 0 && (
        <section className="relative overflow-hidden border-y border-line bg-surface px-4 py-24 sm:px-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 dot-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,#000_10%,transparent_70%)]" />
          <div className="relative mx-auto max-w-6xl">
            <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{get('values','title','Our Values')}</h2>
            <div className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map(v => (
                <div key={v.title} className="group card card-hover p-6 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-3xl transition-transform duration-300 group-hover:scale-110">{v.icon}</div>
                  <h3 className="mt-4 font-display text-base font-bold text-fg">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {members.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{get('team','title','Meet the Team')}</h2>
          <div className="stagger mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {members.map(m => (
              <div key={m.name} className="group card card-hover relative overflow-hidden p-7 text-center">
                <div aria-hidden className="absolute inset-x-0 top-0 h-20 opacity-15" style={{ background: m.color }} />
                <div
                  className="relative mx-auto grid h-20 w-20 place-items-center rounded-full text-2xl font-extrabold text-white ring-4 ring-[var(--surface)] shadow-[var(--shadow-md)] transition-transform duration-300 group-hover:scale-105"
                  style={{ background: m.color }}
                >
                  {m.avatar}
                </div>
                <div className="relative mt-4 font-display text-lg font-bold text-fg">{m.name}</div>
                <div className="relative mt-0.5 text-sm font-semibold" style={{ color: m.color }}>{m.role}</div>
                <p className="relative mt-3 text-sm leading-relaxed text-muted">{m.bio}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact strip */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <div className="font-display text-base font-bold text-fg">Get in touch</div>
            <div className="mt-1 text-sm text-muted">{OWNER.address}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${OWNER.email}`} className="btn btn-secondary btn-sm">{OWNER.email}</a>
            <a href={`tel:${OWNER.phone}`} className="btn btn-secondary btn-sm">{OWNER.phone}</a>
          </div>
        </div>
      </section>

      <CtaBand title={get('cta','title','Join our growing team')} subtitle={get('cta','subtitle','We are always looking for talented people.')}>
        <Link href="/contact" className="btn btn-lg bg-white text-[#2a1f7a] shadow-[var(--shadow-lg)] hover:bg-white/90">{get('cta','button1','View Open Roles')}</Link>
        <Link href="/register" className="btn btn-lg border border-white/30 text-white hover:bg-white/10">{get('cta','button2','Try ProjectHub')}</Link>
      </CtaBand>

      <PublicFooter />
    </div>
  );
}
