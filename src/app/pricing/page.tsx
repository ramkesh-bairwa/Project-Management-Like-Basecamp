'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicNav, { CtaBand, PageHero, PublicFooter } from '@/components/PublicNav';
import { usePageContent } from '@/lib/hooks/usePageContent';

interface Plan {
  id: number;
  name: string;
  price: number;
  billing_cycle: string;
  max_projects: number;
  max_members: number;
  max_tasks: number;
  max_groups: number;
  max_storage_gb: number;
  features: string[] | string;
}

const PLAN_STYLES = [
  { fg: 'var(--primary-text)', bg: 'var(--primary-soft)', icon: '🆓' },
  { fg: 'var(--accent)', bg: 'var(--accent-soft)', icon: '⚡' },
  { fg: 'var(--success-text)', bg: 'var(--success-soft)', icon: '🚀' },
  { fg: 'var(--info-text)', bg: 'var(--info-soft)', icon: '🏢' },
];

const PLAN_BADGES = ['', 'Most Popular', 'Best Value', ''];

function parseFeatures(raw: string[] | string): string[] {
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(String(raw)); if (Array.isArray(p)) return p; } catch { /**/ }
  return String(raw).split('|').map(s => s.trim()).filter(Boolean);
}

const Check = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
);

export default function PricingPage() {
  const { get } = usePageContent('pricing');
  const [plans, setPlans]     = useState<Plan[]>([]);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    fetch('/api/plans')
      .then(r => r.json())
      .then(d => setPlans(Array.isArray(d) ? d : []))
      .catch(() => setPlans([]))
      .finally(() => setLoaded(true));
  }, []);

  const faqs = [1,2,3,4,5,6].map(i => ({
    q: get(`faq${i}`, 'q', ''), a: get(`faq${i}`, 'a', ''),
  })).filter(f => f.q);

  const midIdx = plans.length <= 1 ? 0 : Math.floor((plans.length - 1) / 2);
  const cols = Math.min(plans.length, 4);
  const gridCols = cols >= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : cols === 3 ? 'md:grid-cols-3' : cols === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'max-w-md mx-auto';

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <PublicNav />

      <PageHero
        eyebrow="Pricing"
        title={get('hero', 'title', 'Simple, transparent pricing')}
        subtitle={get('hero', 'subtitle', 'Start free. Upgrade when your team grows. Cancel anytime.')}
      >
        {/* Billing toggle */}
        <div role="tablist" aria-label="Billing period" className="relative inline-flex rounded-full border border-line bg-surface p-1 shadow-[var(--shadow-sm)]">
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full shadow-[var(--shadow-glow)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
            style={{ background: 'var(--primary)', transform: billing === 'yearly' ? 'translateX(100%)' : 'none' }}
          />
          {(['monthly', 'yearly'] as const).map(b => (
            <button
              key={b}
              role="tab"
              aria-selected={billing === b}
              onClick={() => setBilling(b)}
              className={`relative z-10 flex w-32 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition-colors ${billing === b ? 'text-white' : 'text-muted hover:text-fg'}`}
            >
              {b === 'monthly' ? 'Monthly' : 'Yearly'}
              {b === 'yearly' && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${billing === b ? 'bg-white/20 text-white' : 'bg-[var(--success-soft)] text-[var(--success-text)]'}`}>-20%</span>
              )}
            </button>
          ))}
        </div>
      </PageHero>

      {/* ── Plan cards ── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        {!loaded ? (
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="card p-7">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton mt-5 h-12 w-32" />
                <div className="skeleton mt-6 h-20 w-full" />
                <div className="mt-6 space-y-2.5">{[0, 1, 2, 3].map(j => <div key={j} className="skeleton h-3 w-4/5" />)}</div>
                <div className="skeleton mt-8 h-12 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="card mx-auto max-w-md p-10 text-center text-muted">Plans are being updated. Please check back shortly.</div>
        ) : (
          <div className={`stagger grid items-stretch gap-5 ${gridCols}`}>
            {plans.map((p, idx) => {
              const s         = PLAN_STYLES[idx % PLAN_STYLES.length];
              const badge     = PLAN_BADGES[idx] || '';
              const isPopular = idx === midIdx && plans.length > 1;
              const rawPrice  = Number(p.price);
              const isFree    = rawPrice === 0;
              const price     = isFree ? 0 : billing === 'yearly' ? +(rawPrice * 0.8).toFixed(2) : rawPrice;
              const features  = parseFeatures(p.features);

              const limits = [
                { icon: '📋', val: p.max_projects === -1 ? '∞' : String(p.max_projects), label: 'Projects' },
                { icon: '👥', val: p.max_members  === -1 ? '∞' : String(p.max_members),  label: 'Members'  },
                { icon: '✅', val: p.max_tasks    === -1 ? '∞' : String(p.max_tasks),    label: 'Tasks'    },
                { icon: '💾', val: p.max_storage_gb === -1 ? '∞' : `${p.max_storage_gb}GB`, label: 'Storage' },
              ];

              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-[22px] p-7 transition-transform duration-300 ${
                    isPopular ? 'text-white shadow-[var(--shadow-glow)] xl:-my-3 xl:py-10' : 'card card-hover'
                  }`}
                  style={isPopular ? { background: 'var(--grad-brand)' } : undefined}
                >
                  {isPopular && (
                    <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px] opacity-25 [background-image:radial-gradient(rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(180deg,#000,transparent_60%)]" />
                  )}

                  {(badge || isPopular) && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider shadow-[var(--shadow-md)] ${isPopular ? 'bg-[var(--text)] text-[var(--bg)]' : ''}`}
                      style={isPopular ? undefined : { background: s.bg, color: s.fg }}>
                      {isPopular ? 'Most Popular' : badge}
                    </div>
                  )}

                  <div className="relative flex flex-1 flex-col">
                    {/* Name + icon */}
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-bold uppercase tracking-[0.14em] ${isPopular ? 'text-white/85' : ''}`} style={isPopular ? undefined : { color: s.fg }}>{p.name}</div>
                      <div className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${isPopular ? 'bg-white/15' : ''}`} style={isPopular ? undefined : { background: s.bg }}>{s.icon}</div>
                    </div>

                    {/* Price */}
                    <div className="mt-5">
                      {isFree ? (
                        <div className={`font-display text-5xl font-extrabold tracking-tight ${isPopular ? 'text-white' : 'text-fg'}`}>Free</div>
                      ) : (
                        <div className="flex items-end gap-0.5">
                          <span className={`mb-1.5 text-xl font-semibold ${isPopular ? 'text-white/70' : 'text-subtle'}`}>$</span>
                          <span key={`${billing}-${price}`} className={`animate-fade-up font-display text-5xl font-extrabold tracking-tight ${isPopular ? 'text-white' : 'text-fg'}`}>{price}</span>
                          <span className={`mb-1.5 ml-1 text-sm ${isPopular ? 'text-white/70' : 'text-subtle'}`}>/mo</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5 h-5">
                      {billing === 'yearly' && !isFree && (
                        <div className={`text-xs font-semibold ${isPopular ? 'text-white' : 'text-[var(--success-text)]'}`}>
                          Billed ${(price * 12).toFixed(0)}/yr · Save ${(rawPrice * 12 * 0.2).toFixed(0)}
                        </div>
                      )}
                    </div>

                    {/* Limits */}
                    <div className={`mt-5 grid grid-cols-2 gap-2 border-t pt-5 ${isPopular ? 'border-white/20' : 'border-line'}`}>
                      {limits.map(l => (
                        <div key={l.label} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${isPopular ? 'bg-white/10' : 'bg-surface-2'}`}>
                          <span className="text-sm">{l.icon}</span>
                          <div className="min-w-0">
                            <div className={`text-[13px] font-bold leading-none ${isPopular ? 'text-white' : 'text-fg'}`}>{l.val}</div>
                            <div className={`mt-0.5 text-[10px] ${isPopular ? 'text-white/70' : 'text-subtle'}`}>{l.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Features */}
                    <ul className={`mt-5 flex-1 space-y-2.5 border-t pt-5 ${isPopular ? 'border-white/20' : 'border-line'}`}>
                      {features.map(f => (
                        <li key={f} className={`flex items-start gap-2.5 text-sm leading-snug ${isPopular ? 'text-white/90' : 'text-muted'}`}>
                          <span className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full ${isPopular ? 'bg-white/20 text-white' : 'bg-[var(--success-soft)] text-[var(--success-text)]'}`}>
                            <Check size={10} />
                          </span>
                          {f}
                        </li>
                      ))}
                      {features.length === 0 && (
                        <li className={`text-sm italic ${isPopular ? 'text-white/60' : 'text-subtle'}`}>Basic access included</li>
                      )}
                    </ul>

                    {/* CTA */}
                    <Link
                      href="/register"
                      className={`group btn btn-lg mt-7 w-full ${isPopular ? 'bg-white text-[#2a1f7a] shadow-[var(--shadow-md)] hover:bg-white/90' : idx === 0 ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      {isFree ? 'Get Started Free' : `Start ${p.name}`}
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </Link>
                    <div className={`mt-2.5 h-4 text-center text-[11px] ${isPopular ? 'text-white/70' : 'text-subtle'}`}>
                      {isFree ? 'No credit card required' : 'Cancel anytime'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Trust bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-line bg-surface px-6 py-4 shadow-[var(--shadow-xs)]">
          {[['🔒','SSL Encrypted'], ['💳','Cancel anytime'], ['🔄','30-day refund'], ['🌍','GDPR compliant']].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-2 text-sm font-medium text-muted">
              <span className="text-base">{icon}</span>{label}
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      {faqs.length > 0 && (
        <section className="border-t border-line bg-surface px-4 py-24 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {get('faq', 'title', 'Frequently asked questions')}
            </h2>
            <p className="mt-3 text-center text-muted">Everything you need to know about our plans.</p>
            <div className="mt-12 space-y-3">
              {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
          </div>
        </section>
      )}

      <CtaBand title="Still not sure?" subtitle="Start with our free plan. No credit card required.">
        <Link href="/register" className="btn btn-lg bg-white text-[#2a1f7a] shadow-[var(--shadow-lg)] hover:bg-white/90">Get Started Free →</Link>
        <Link href="/contact" className="btn btn-lg border border-white/30 text-white hover:bg-white/10">Talk to us</Link>
      </CtaBand>

      <PublicFooter />
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`card overflow-hidden transition-[border-color,box-shadow] duration-200 ${open ? 'border-[var(--primary-ring)] shadow-[var(--shadow-md)]' : ''}`}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
      >
        <span className="font-display text-[15px] font-semibold text-fg sm:text-base">{q}</span>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-transform duration-300 ${open ? 'rotate-45 bg-primary-soft text-primary-text' : 'bg-surface-3 text-muted'}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted sm:px-6">{a}</p>
        </div>
      </div>
    </div>
  );
}
