'use client';
import { useState } from 'react';
import Link from 'next/link';
import PublicNav, { PageHero, PublicFooter } from '@/components/PublicNav';
import { usePageContent } from '@/lib/hooks/usePageContent';
import { OWNER } from '@/lib/owner';

export default function ContactPage() {
  const { get } = usePageContent('contact');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const offices = [
    { city: 'Jaipur, India', address: OWNER.address, flag: '🇮🇳' },
  ];

  const contactOptions = [
    { icon: '💬', title: 'Live Chat',     desc: 'Chat with our team in real-time',  badge: 'Online',  fg: 'var(--success-text)', bg: 'var(--success-soft)', href: undefined },
    { icon: '📧', title: 'Email Support', desc: OWNER.email,                        badge: '< 24h',   fg: 'var(--primary-text)', bg: 'var(--primary-soft)', href: `mailto:${OWNER.email}` },
    { icon: '📞', title: 'Phone',         desc: OWNER.phone,                        badge: 'Mon–Fri', fg: 'var(--accent)',       bg: 'var(--accent-soft)',  href: `tel:${OWNER.phone}` },
    { icon: '🐦', title: 'Twitter / X',   desc: get('info','twitter','@projecthub'), badge: 'DM us',  fg: 'var(--info-text)',    bg: 'var(--info-soft)',    href: undefined },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <PublicNav />

      <PageHero
        eyebrow="Contact us"
        title={get('hero','title',"We'd love to hear from you")}
        subtitle={get('hero','subtitle',"Whether you have a question, feedback or just want to say hi — we're here.")}
      />

      {/* Contact options */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="stagger grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {contactOptions.map(o => {
            const inner = (
              <>
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl transition-transform duration-300 group-hover:scale-110" style={{ background: o.bg }}>{o.icon}</span>
                  <span className="badge" style={{ background: o.bg, color: o.fg }}>{o.badge}</span>
                </div>
                <div className="mt-4 font-display text-[15px] font-bold text-fg">{o.title}</div>
                <div className="mt-1 break-words text-sm text-muted">{o.desc}</div>
              </>
            );
            return o.href ? (
              <a key={o.title} href={o.href} className="group card card-hover block p-5">{inner}</a>
            ) : (
              <div key={o.title} className="group card card-hover p-5">{inner}</div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          {/* Form */}
          <div className="card relative overflow-hidden p-6 sm:p-10">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full opacity-60 blur-3xl" style={{ background: 'var(--grad-brand-soft)' }} />
            <div className="relative">
              {sent ? (
                <div className="animate-scale-in py-10 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--success-soft)] text-[var(--success-text)]">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-extrabold text-fg">Message sent!</h2>
                  <p className="mt-2 text-sm text-muted">We&apos;ll get back to you within 24 hours.</p>
                  <button
                    onClick={() => { setSent(false); setForm({ name:'',email:'',subject:'',message:'' }); }}
                    className="btn btn-primary mt-6"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-2xl font-extrabold tracking-tight text-fg">Send us a message</h2>
                  <p className="mt-1.5 text-sm text-muted">We typically respond within 24 hours.</p>
                  <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="mt-7 flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="c-name" className="label">Full name</label>
                        <input id="c-name" className="input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Jane Smith" required />
                      </div>
                      <div>
                        <label htmlFor="c-email" className="label">Email</label>
                        <input id="c-email" className="input" type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="you@example.com" required />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="c-subject" className="label">Subject</label>
                      <input id="c-subject" className="input" value={form.subject} onChange={e => setForm(p=>({...p,subject:e.target.value}))} placeholder="How can we help?" required />
                    </div>
                    <div>
                      <label htmlFor="c-message" className="label">Message</label>
                      <textarea id="c-message" className="input resize-y" value={form.message} onChange={e => setForm(p=>({...p,message:e.target.value}))} placeholder="Tell us more…" required rows={5} />
                    </div>
                    <button type="submit" className="group btn btn-gradient btn-lg mt-1 w-full sm:w-auto sm:self-start">
                      Send message
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Side */}
          <div className="flex flex-col gap-5">
            {offices.length > 0 && (
              <div className="card p-6">
                <h3 className="font-display text-base font-bold text-fg">🏢 Our offices</h3>
                <div className="mt-4 space-y-4">
                  {offices.map(o => (
                    <div key={o.city} className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl">{o.flag}</span>
                      <div>
                        <div className="text-sm font-semibold text-fg">{o.city}</div>
                        <div className="text-sm leading-relaxed text-muted">{o.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-6">
              <h3 className="font-display text-base font-bold text-fg">⏰ Support hours</h3>
              <div className="mt-4 divide-y divide-[var(--border-soft)]">
                {[
                  ['Monday – Friday', get('info','hours_weekday','9:00 AM – 6:00 PM IST')],
                  ['Saturday',        get('info','hours_saturday','10:00 AM – 2:00 PM IST')],
                  ['Sunday',          'Closed'],
                ].map(([day, hours]) => (
                  <div key={day} className="flex justify-between gap-3 py-2.5 text-sm">
                    <span className="font-medium text-fg">{day}</span>
                    <span className={hours === 'Closed' ? 'text-subtle' : 'text-muted'}>{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[var(--radius-lg)] p-6 text-white shadow-[var(--shadow-glow)]" style={{ background: 'var(--grad-brand)' }}>
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
              <div className="relative">
                <div className="text-2xl">📚</div>
                <h3 className="mt-3 font-display text-base font-bold">Check our docs first</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/80">Most questions are answered in our documentation.</p>
                <Link href="/docs" className="btn btn-sm mt-4 border border-white/30 bg-white/15 text-white hover:bg-white/25">Browse Docs →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
