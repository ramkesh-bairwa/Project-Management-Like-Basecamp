'use client';
import Link from 'next/link';
import PublicNav, { PageHero, PublicFooter } from '@/components/PublicNav';
import { usePageContent } from '@/lib/hooks/usePageContent';

export default function DocsPage() {
  const { get } = usePageContent('docs');

  const quicklinks = [1,2,3,4].map(i => ({
    icon:  get(`quicklink${i}`,'icon',''),
    label: get(`quicklink${i}`,'label',''),
    desc:  get(`quicklink${i}`,'desc',''),
  })).filter(q => q.label);

  const sections = [1,2,3,4,5,6].map(i => {
    const raw = get(`section${i}`,'articles','');
    const articles = raw.split('|').filter(Boolean).map(a => {
      const [title, time] = a.split(':');
      return { title: title?.trim() || '', time: time?.trim() || '' };
    });
    return {
      icon:     get(`section${i}`,'icon','📄'),
      title:    get(`section${i}`,'title',''),
      articles,
    };
  }).filter(s => s.title);

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <PublicNav />

      <PageHero
        eyebrow="Documentation"
        title={get('hero','title','How can we help?')}
        subtitle={get('hero','subtitle','Search our docs or browse by category below.')}
      >
        <div className="relative mx-auto max-w-xl">
          <div aria-hidden className="absolute -inset-1 rounded-[18px] opacity-50 blur-lg" style={{ background: 'var(--grad-brand)' }} />
          <div className="relative flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-[var(--shadow-lg)] transition focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-[var(--primary-ring)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-subtle"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input
              placeholder="Search documentation…"
              aria-label="Search documentation"
              className="h-14 w-full min-w-0 bg-transparent text-[15px] text-fg !border-0 !shadow-none outline-none"
            />
            <span className="kbd hidden shrink-0 sm:inline-flex">⌘K</span>
          </div>
        </div>
      </PageHero>

      {/* Quick links */}
      {quicklinks.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className={`stagger grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 ${quicklinks.length >= 4 ? 'lg:grid-cols-4' : quicklinks.length === 3 ? 'lg:grid-cols-3' : ''}`}>
            {quicklinks.map(q => (
              <div key={q.label} className="group card card-hover cursor-pointer p-5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">{q.icon}</div>
                <div className="mt-4 font-display text-[15px] font-bold text-fg">{q.label}</div>
                <div className="mt-1 text-sm text-muted">{q.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Doc sections */}
      {sections.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
          <div className="stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sections.map(s => (
              <div key={s.title} className="card p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-xl">{s.icon}</span>
                  <h3 className="font-display text-base font-bold text-fg">{s.title}</h3>
                </div>
                <div className="mt-4 flex flex-col">
                  {s.articles.map(a => (
                    <a key={a.title} href="#" className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm text-muted transition-colors hover:bg-[var(--surface-hover)] hover:text-fg">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-subtle transition-colors group-hover:text-primary-text"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" /></svg>
                        <span className="truncate">{a.title}</span>
                      </span>
                      {a.time && <span className="shrink-0 text-xs text-subtle">{a.time}</span>}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Support */}
      <section className="px-4 py-20 sm:px-6">
        <div className="card relative mx-auto max-w-3xl overflow-hidden px-6 py-12 text-center sm:px-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 aurora" />
          <div className="relative">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface text-3xl shadow-[var(--shadow-md)]">🤝</div>
            <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{get('support','title','Still need help?')}</h2>
            <p className="mx-auto mt-3 max-w-md text-muted">{get('support','subtitle','Our support team is available Monday–Friday, 9am–6pm EST.')}</p>
            <Link href="/contact" className="btn btn-primary btn-lg mt-7">
              {get('support','button','Contact Support →')}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
