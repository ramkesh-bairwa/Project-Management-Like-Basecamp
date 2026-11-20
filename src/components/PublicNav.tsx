'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import NavAuth from '@/components/NavAuth';
import ThemeToggle from '@/components/ThemeToggle';
import { OWNER } from '@/lib/owner';

const navLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/* ─────────────────────────── Logo ─────────────────────────── */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5 shrink-0" aria-label="ProjectHub home">
      <span
        className="relative grid place-items-center rounded-[11px] text-white shadow-[var(--shadow-glow)] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105"
        style={{ width: size, height: size, background: 'var(--grad-brand)' }}
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h10M4 12h16M4 18h7" />
          <circle cx="19" cy="6" r="2" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span className="font-display text-[1.05rem] font-extrabold tracking-tight text-fg">ProjectHub</span>
    </Link>
  );
}

/* ─────────────────────────── Nav ─────────────────────────── */
export default function PublicNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 border-b ${
        scrolled || open ? 'glass border-line shadow-[var(--shadow-xs)]' : 'border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <div className="hidden lg:flex items-center gap-1 rounded-full border border-line bg-[color-mix(in_srgb,var(--surface)_60%,transparent)] p-1 shadow-[var(--shadow-xs)]">
          {navLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              data-active={isActive(l.href)}
              className="relative rounded-full px-3.5 py-1.5 text-[0.84rem] font-medium text-muted transition-colors hover:text-fg data-[active=true]:bg-primary-soft data-[active=true]:text-primary-text"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-1.5">
            <NavAuth />
          </div>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="lg:hidden grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-[var(--surface-hover)] hover:text-fg transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-line animate-fade-in">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 stagger">
            {navLinks.map(l => (
              <Link
                key={l.href}
                href={l.href}
                data-active={isActive(l.href)}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-3 text-[0.95rem] font-medium text-fg hover:bg-[var(--surface-hover)] data-[active=true]:text-primary-text"
              >
                {l.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-subtle"><path d="M9 6l6 6-6 6" /></svg>
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4 sm:hidden [&>*]:w-full">
              <NavAuth stacked />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─────────────────────────── Page hero ─────────────────────────── */
export function PageHero({
  eyebrow, title, subtitle, children,
}: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 aurora" />
      <div aria-hidden className="pointer-events-none absolute inset-0 dot-grid opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_40%,transparent_100%)]" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-16 pb-14 sm:pt-24 sm:pb-20 text-center animate-fade-up">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1 text-xs font-semibold text-primary-text shadow-[var(--shadow-xs)] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--grad-brand)' }} />
            {eyebrow}
          </span>
        )}
        <h1 className="mt-5 font-display text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight text-fg text-balance">
          {title}
        </h1>
        {subtitle && <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-muted text-pretty">{subtitle}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

/* ─────────────────────────── CTA band ─────────────────────────── */
export function CtaBand({
  title, subtitle, children,
}: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <section className="px-4 sm:px-6 py-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] px-6 py-14 sm:px-12 sm:py-20 text-center text-white shadow-[var(--shadow-lg)]" style={{ background: 'var(--grad-brand)' }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_75%)]" />
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
        <div className="relative">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-balance">{title}</h2>
          {subtitle && <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-white/80">{subtitle}</p>}
          {children && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{children}</div>}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Footer ─────────────────────────── */
const footerCols = [
  { title: 'Product', links: [['Features', '/features'], ['Pricing', '/pricing'], ['Docs', '/docs'], ['Changelog', '/blog']] },
  { title: 'Company', links: [['About', '/about'], ['Blog', '/blog'], ['Careers', '/contact'], ['Contact', '/contact']] },
  { title: 'Legal', links: [['Privacy', '#'], ['Terms', '#'], ['Security', '#'], ['Cookies', '#']] },
] as const;

export function PublicFooter() {
  return (
    <footer className="relative border-t border-line bg-surface">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'var(--grad-brand)', opacity: 0.5 }} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The all-in-one project management tool for modern teams.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>
                <a href={`mailto:${OWNER.email}`} className="inline-flex items-center gap-2 text-muted hover:text-fg transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                  {OWNER.email}
                </a>
              </li>
              <li>
                <a href={`tel:${OWNER.phone}`} className="inline-flex items-center gap-2 text-muted hover:text-fg transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg>
                  {OWNER.phone}
                </a>
              </li>
              <li className="inline-flex items-start gap-2 text-subtle">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
                {OWNER.address}
              </li>
            </ul>
          </div>
          {footerCols.map(col => (
            <div key={col.title}>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-muted hover:text-fg transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col-reverse items-start justify-between gap-4 border-t border-line pt-6 sm:flex-row sm:items-center">
          <span className="text-sm text-subtle">© {new Date().getFullYear()} ProjectHub. All rights reserved.</span>
          <div className="flex items-center gap-1">
            {[
              { label: 'Twitter', d: 'M4 4l16 16M20 4L4 20' },
              { label: 'GitHub', d: 'M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21' },
              { label: 'LinkedIn', d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z' },
            ].map(s => (
              <a key={s.label} href="#" aria-label={s.label} className="grid h-9 w-9 place-items-center rounded-xl text-subtle hover:bg-[var(--surface-hover)] hover:text-fg transition">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={s.d} /></svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
