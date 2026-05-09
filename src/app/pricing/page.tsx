'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
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
  { color: '#457b9d', light: '#eef5fb', icon: '🆓' },
  { color: '#e63946', light: '#fff1f2', icon: '⚡' },
  { color: '#2a9d8f', light: '#f0fdf9', icon: '🚀' },
  { color: '#6366f1', light: '#f5f3ff', icon: '🏢' },
];

const PLAN_BADGES = ['', 'Most Popular', 'Best Value', ''];

function parseFeatures(raw: string[] | string): string[] {
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(String(raw)); if (Array.isArray(p)) return p; } catch { /**/ }
  return String(raw).split('|').map(s => s.trim()).filter(Boolean);
}

export default function PricingPage() {
  const { get } = usePageContent('pricing');
  const [plans, setPlans]     = useState<Plan[]>([]);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetch('/api/plans').then(r => r.json()).then(d => setPlans(Array.isArray(d) ? d : []));
  }, []);

  const faqs = [1,2,3,4,5,6].map(i => ({
    q: get(`faq${i}`, 'q', ''), a: get(`faq${i}`, 'a', ''),
  })).filter(f => f.q);

  // Collect ALL features across all plans to build a unified comparison list
  const allFeatureSet = new Set<string>();
  plans.forEach(p => parseFeatures(p.features).forEach(f => allFeatureSet.add(f)));
  const allFeatures = Array.from(allFeatureSet);

  const midIdx = plans.length <= 1 ? 0 : Math.floor((plans.length - 1) / 2);

  return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f8fafc', color: '#1d3557' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .plan-card { transition: box-shadow 0.25s, border-color 0.25s; }
        .plan-card:hover { box-shadow: 0 20px 48px rgba(0,0,0,0.13) !important; }
        .plan-cta { transition: opacity 0.2s, transform 0.2s; }
        .plan-cta:hover { opacity: 0.88; transform: translateY(-1px); }
        .toggle-btn { transition: background 0.2s, color 0.2s; }
      `}</style>

      <PublicNav />

      {/* ── Hero ── */}
      <section style={{ padding: '72px 24px 0', textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Pricing</div>
        <h1 style={{ fontSize: 52, fontWeight: 900, margin: '0 0 16px', letterSpacing: '-2px', lineHeight: 1.1 }}>
          {get('hero', 'title', 'Simple, transparent pricing')}
        </h1>
        <p style={{ fontSize: 18, color: '#6b7a8d', margin: '0 0 36px', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          {get('hero', 'subtitle', 'Start free. Upgrade when your team grows. Cancel anytime.')}
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'inline-flex', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 4, marginBottom: 60 }}>
          {(['monthly', 'yearly'] as const).map(b => (
            <button key={b} onClick={() => setBilling(b)} className="toggle-btn"
              style={{ padding: '8px 24px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: billing === b ? '#1d3557' : 'transparent', color: billing === b ? '#fff' : '#6b7a8d' }}>
              {b === 'monthly' ? 'Monthly' : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Yearly
                  <span style={{ fontSize: 10, background: '#10b981', color: '#fff', padding: '2px 7px', borderRadius: 8, fontWeight: 800 }}>-20%</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ── Plan cards ── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 4)}, 1fr)`, gap: 24 }}>
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
              <div key={p.id} className="plan-card"
                style={{
                  background: isPopular ? 'linear-gradient(160deg,#1a2f4a,#243d5c)' : '#fff',
                  border: `2px solid ${isPopular ? '#e63946' : '#e2e8f0'}`,
                  borderRadius: 20,
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: isPopular ? '0 24px 56px rgba(29,53,87,0.22)' : '0 2px 8px rgba(0,0,0,0.05)',
                }}>

                {/* Badge */}
                {(badge || isPopular) && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: isPopular ? '#e63946' : s.color, color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    {isPopular ? 'Most Popular' : badge}
                  </div>
                )}

                {/* ── 1. Plan name + icon ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isPopular ? '#a8dadc' : s.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{p.name}</div>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: isPopular ? 'rgba(255,255,255,0.1)' : s.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{s.icon}</div>
                </div>

                {/* ── 2. Price ── */}
                <div style={{ marginBottom: 8 }}>
                  {isFree ? (
                    <div style={{ fontSize: 48, fontWeight: 900, color: isPopular ? '#fff' : '#1d3557', lineHeight: 1 }}>Free</div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: isPopular ? 'rgba(255,255,255,0.5)' : '#94a3b8', lineHeight: 1, marginBottom: 8 }}>$</span>
                      <span style={{ fontSize: 48, fontWeight: 900, color: isPopular ? '#fff' : '#1d3557', lineHeight: 1 }}>{price}</span>
                      <span style={{ fontSize: 14, color: isPopular ? 'rgba(255,255,255,0.4)' : '#94a3b8', marginBottom: 8, marginLeft: 2 }}>/mo</span>
                    </div>
                  )}
                </div>

                {/* Yearly saving note */}
                <div style={{ height: 20, marginBottom: 20 }}>
                  {billing === 'yearly' && !isFree && (
                    <div style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>
                      Billed ${(price * 12).toFixed(0)}/yr · Save ${(rawPrice * 12 * 0.2).toFixed(0)}
                    </div>
                  )}
                </div>

                {/* ── 3. Divider ── */}
                <div style={{ height: 1, background: isPopular ? 'rgba(255,255,255,0.1)' : '#f1f5f9', marginBottom: 20 }} />

                {/* ── 4. Limits — always 4 items in 2×2 grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {limits.map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 10, background: isPopular ? 'rgba(255,255,255,0.07)' : s.light }}>
                      <span style={{ fontSize: 14 }}>{l.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: isPopular ? '#fff' : s.color, lineHeight: 1 }}>{l.val}</div>
                        <div style={{ fontSize: 10, color: isPopular ? 'rgba(255,255,255,0.45)' : '#94a3b8', marginTop: 1 }}>{l.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── 5. Divider ── */}
                <div style={{ height: 1, background: isPopular ? 'rgba(255,255,255,0.1)' : '#f1f5f9', marginBottom: 20 }} />

                {/* ── 6. Features — flex:1 so all cards stretch equally ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: isPopular ? 'rgba(42,157,143,0.3)' : `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: isPopular ? '#2a9d8f' : s.color }}>✓</span>
                      </div>
                      <span style={{ fontSize: 13, color: isPopular ? 'rgba(255,255,255,0.75)' : '#475569', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                  {features.length === 0 && (
                    <div style={{ fontSize: 13, color: isPopular ? 'rgba(255,255,255,0.3)' : '#cbd5e1', fontStyle: 'italic' }}>Basic access included</div>
                  )}
                </div>

                {/* ── 7. CTA — always at bottom ── */}
                <Link href="/register" className="plan-cta"
                  style={{ display: 'block', textAlign: 'center', padding: '14px', borderRadius: 12, fontWeight: 800, fontSize: 14, textDecoration: 'none', background: isPopular ? 'linear-gradient(135deg,#e63946,#c1121f)' : s.color, color: '#fff', boxShadow: isPopular ? '0 4px 16px rgba(230,57,70,0.4)' : `0 4px 12px ${s.color}35` }}>
                  {isFree ? 'Get Started Free' : `Start ${p.name}`} →
                </Link>

                {/* ── 8. Sub-note — always same height ── */}
                <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: isPopular ? 'rgba(255,255,255,0.3)' : '#94a3b8', height: 16 }}>
                  {isFree ? 'No credit card required' : 'Cancel anytime'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust bar */}
        <div style={{ marginTop: 36, padding: '18px 24px', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          {[['🔒','SSL Encrypted'], ['💳','Cancel anytime'], ['🔄','30-day refund'], ['🌍','GDPR compliant']].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#6b7a8d', fontWeight: 500 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>{label}
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      {faqs.length > 0 && (
        <section style={{ background: '#fff', padding: '80px 24px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2 style={{ fontSize: 36, fontWeight: 900, textAlign: 'center', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              {get('faq', 'title', 'Frequently asked questions')}
            </h2>
            <p style={{ textAlign: 'center', color: '#6b7a8d', fontSize: 15, margin: '0 0 48px' }}>Everything you need to know about our plans.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom CTA ── */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto', background: 'linear-gradient(135deg,#1d3557,#2a4a73)', borderRadius: 24, padding: '56px 40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(230,57,70,0.1)', top: -60, right: -40 }} />
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 12px', position: 'relative' }}>Still not sure?</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '0 0 28px', position: 'relative' }}>Start with our free plan. No credit card required.</p>
          <Link href="/register" style={{ display: 'inline-block', padding: '13px 32px', borderRadius: 12, background: '#e63946', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none', position: 'relative', boxShadow: '0 4px 20px rgba(230,57,70,0.4)' }}>
            Get Started Free →
          </Link>
        </div>
      </section>

      <footer style={{ background: '#0f1f35', padding: '24px', textAlign: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>© 2025 ProjectHub · <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link></span>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1.5px solid ${open ? '#6366f1' : '#e2e8f0'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: open ? '#fafafe' : '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1d3557' }}>{q}</span>
        <span style={{ fontSize: 20, color: '#6366f1', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, lineHeight: 1 }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 22px 18px', fontSize: 14, color: '#6b7a8d', lineHeight: 1.7, borderTop: '1px solid #f1f5f9' }}>{a}</div>
      )}
    </div>
  );
}
