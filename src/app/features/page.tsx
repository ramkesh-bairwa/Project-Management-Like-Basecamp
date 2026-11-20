'use client';
import Link from 'next/link';
import PublicNav, { CtaBand, PageHero, PublicFooter } from '@/components/PublicNav';
import { usePageContent } from '@/lib/hooks/usePageContent';

/** Token-based accent per card so colors adapt to light/dark. */
const ACCENTS = [
  { fg: 'var(--primary-text)', bg: 'var(--primary-soft)' },
  { fg: 'var(--accent)', bg: 'var(--accent-soft)' },
  { fg: 'var(--success-text)', bg: 'var(--success-soft)' },
  { fg: 'var(--warning-text)', bg: 'var(--warning-soft)' },
  { fg: 'var(--info-text)', bg: 'var(--info-soft)' },
  { fg: 'var(--primary-text)', bg: 'var(--violet-soft)' },
];

export default function FeaturesPage() {
  const { content, get } = usePageContent('features');
  const loading = Object.keys(content).length === 0;

  const features = [1,2,3,4,5,6,7,8,9].map((i, idx) => ({
    icon:   get(`feature${i}`,'icon',''),
    title:  get(`feature${i}`,'title',''),
    desc:   get(`feature${i}`,'desc',''),
    points: get(`feature${i}`,'points','').split('|').filter(Boolean),
    accent: ACCENTS[idx % ACCENTS.length],
  })).filter(f => f.title);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <PublicNav />

      <PageHero
        eyebrow={get('hero','badge','Features')}
        title={<>{get('hero','title','Everything your team needs')}</>}
        subtitle={get('hero','subtitle','One platform to manage projects, collaborate with your team, and ship products faster.')}
      >
        <Link href="/register" className="group btn btn-gradient btn-lg">
          {get('hero','cta_text','Start for Free →')}
        </Link>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        {loading && features.length === 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-7">
                <div className="skeleton h-12 w-12 rounded-2xl" />
                <div className="skeleton mt-5 h-5 w-2/3" />
                <div className="skeleton mt-3 h-3 w-full" />
                <div className="skeleton mt-2 h-3 w-4/5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <div key={f.title} className="group card card-hover relative overflow-hidden p-7">
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" style={{ background: f.accent.bg }} />
                <div className="relative">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" style={{ background: f.accent.bg }}>{f.icon}</div>
                  <h3 className="mt-5 font-display text-lg font-bold text-fg">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
                  {f.points.length > 0 && (
                    <ul className="mt-5 space-y-2 border-t border-line pt-5">
                      {f.points.map(p => (
                        <li key={p} className="flex items-start gap-2.5 text-sm text-muted">
                          <span className="mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full" style={{ background: f.accent.bg, color: f.accent.fg }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CtaBand title={get('cta','title','Ready to try it all?')} subtitle={get('cta','subtitle','Free forever. No credit card required.')}>
        <Link href="/register" className="btn btn-lg bg-white text-[#2a1f7a] shadow-[var(--shadow-lg)] hover:bg-white/90">
          {get('cta','button','Get Started →')}
        </Link>
      </CtaBand>

      <PublicFooter />
    </div>
  );
}
