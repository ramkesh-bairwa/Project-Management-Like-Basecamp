'use client';
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

/* ════════════════════════════════════════════════════════════════
   ICONS
   ════════════════════════════════════════════════════════════════ */
type IconProps = { className?: string; size?: number };
const base = (size = 18) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
});

export const Icon = {
  Mail: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7 8.5 6 8.5-6" /></svg>
  ),
  Lock: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><rect x="4" y="10.5" width="16" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
  ),
  User: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 20.5c1.4-3.6 4.4-5.5 8-5.5s6.6 1.9 8 5.5" /></svg>
  ),
  Key: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><circle cx="7.5" cy="15.5" r="4" /><path d="m10.5 12.5 9-9M16 7l2.5 2.5M18.5 4.5 21 7" /></svg>
  ),
  Eye: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  EyeOff: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></svg>
  ),
  ArrowRight: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  ArrowLeft: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
  ),
  Check: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
  ),
  Alert: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5M12 16.5h.01" /></svg>
  ),
  Info: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5M12 7.5h.01" /></svg>
  ),
  CheckCircle: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9.5" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></svg>
  ),
  XCircle: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9.5" /><path d="m9 9 6 6M15 9l-6 6" /></svg>
  ),
  Shield: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="M12 2.5 4 5.5v6c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10v-6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
  ),
  Inbox: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5" /><path d="M5.5 5h13L21 13.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4.5L5.5 5Z" /></svg>
  ),
  Clock: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9.5" /><path d="M12 7v5l3.5 2" /></svg>
  ),
  Refresh: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" /></svg>
  ),
  Sparkles: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" /><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" /></svg>
  ),
  LogOut: ({ className, size }: IconProps) => (
    <svg {...base(size)} className={className}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></svg>
  ),
};

export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function GitHubLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════
   BRAND
   ════════════════════════════════════════════════════════════════ */
export function Logo({ name = 'ProjectHub', href = '/', mark }: { name?: string; href?: string; mark?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 no-underline">
      <span
        className="relative grid place-items-center w-9 h-9 rounded-[11px] text-white font-display font-extrabold text-[15px] transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3"
        style={{ background: 'var(--grad-brand)', boxShadow: '0 6px 18px -6px rgba(139,92,246,.7), inset 0 1px 0 rgba(255,255,255,.25)' }}
      >
        {mark ?? name.charAt(0)}
      </span>
      <span className="font-display font-bold text-[17px] text-fg tracking-tight">{name}</span>
    </Link>
  );
}

const AVATAR_GRADS = [
  'linear-gradient(135deg,#6d5efc,#8b5cf6)',
  'linear-gradient(135deg,#ec4899,#f43f5e)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
];

function Avatar({ initials, i = 0, size = 24 }: { initials: string; i?: number; size?: number }) {
  return (
    <span
      className="inline-grid place-items-center rounded-full text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: AVATAR_GRADS[i % AVATAR_GRADS.length], boxShadow: '0 0 0 2px var(--surface)' }}
    >
      {initials}
    </span>
  );
}

function Bar({ w, className = '' }: { w: string; className?: string }) {
  return <span className={`block h-1.5 rounded-full bg-[var(--surface-3)] ${className}`} style={{ width: w }} />;
}

/* ── Product preview mocks ──────────────────────────────────── */
function BoardPreview() {
  const cols = [
    { title: 'To do', count: 4, cards: [{ tag: 'Design', tone: 'var(--info)', t: 'Pricing page hero', a: 'AK' }, { tag: 'Research', tone: 'var(--warning)', t: 'Interview 5 customers', a: 'JL' }] },
    { title: 'In progress', count: 3, cards: [{ tag: 'Eng', tone: 'var(--primary)', t: 'Realtime chat sync', a: 'RB', progress: 64 }, { tag: 'Docs', tone: 'var(--accent)', t: 'Onboarding guide', a: 'SM' }] },
    { title: 'Done', count: 9, cards: [{ tag: 'Launch', tone: 'var(--success)', t: 'Beta invite emails', a: 'TN', done: true }] },
  ];
  return (
    <div className="glass rounded-2xl border border-line p-4" style={{ boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="ml-2 text-[12px] font-semibold text-fg">Website relaunch</span>
          <span className="badge bg-primary-soft text-primary-text">Sprint 14</span>
        </div>
        <div className="flex -space-x-1.5">
          {['RB', 'AK', 'JL', 'SM'].map((x, i) => <Avatar key={x} initials={x} i={i} size={22} />)}
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: '68%', background: 'var(--grad-brand)' }} />
        </div>
        <span className="text-[11px] font-semibold text-muted tabular-nums">68%</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {cols.map(c => (
          <div key={c.title} className="rounded-xl bg-[var(--surface-2)] border border-line-soft p-2">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[10.5px] font-semibold text-muted uppercase tracking-wide">{c.title}</span>
              <span className="text-[10px] font-semibold text-subtle">{c.count}</span>
            </div>
            <div className="flex flex-col gap-2">
              {c.cards.map(card => (
                <div key={card.t} className="rounded-lg bg-surface border border-line p-2" style={{ boxShadow: 'var(--shadow-xs)' }}>
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold" style={{ color: card.tone }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: card.tone }} />{card.tag}
                  </span>
                  <p className={`mt-1 text-[11px] leading-snug font-medium ${'done' in card && card.done ? 'text-subtle line-through' : 'text-fg'}`}>{card.t}</p>
                  {'progress' in card && card.progress ? (
                    <div className="mt-1.5 h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${card.progress}%` }} />
                    </div>
                  ) : null}
                  <div className="mt-1.5 flex items-center justify-between">
                    <Avatar initials={card.a} i={card.a.charCodeAt(0)} size={16} />
                    <Bar w="38%" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="glass rounded-2xl border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-primary-soft text-primary-text font-bold text-sm">#</span>
          <div>
            <p className="text-[12px] font-semibold text-fg leading-none">launch-team</p>
            <p className="text-[10px] text-subtle mt-1 leading-none">8 members · 3 online</p>
          </div>
        </div>
        <div className="flex -space-x-1.5">
          {['RB', 'AK', 'JL'].map((x, i) => <Avatar key={x} initials={x} i={i} size={22} />)}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-2.5">
          <Avatar initials="AK" i={1} size={26} />
          <div>
            <p className="text-[10.5px] text-subtle mb-1"><span className="font-semibold text-fg">Aisha</span> · 10:42</p>
            <div className="rounded-2xl rounded-tl-md bg-[var(--surface-2)] border border-line-soft px-3 py-2 text-[12px] text-fg">Staging build is green. Ready for review?</div>
          </div>
        </div>
        <div className="flex gap-2.5 flex-row-reverse">
          <Avatar initials="RB" i={0} size={26} />
          <div className="flex flex-col items-end">
            <p className="text-[10.5px] text-subtle mb-1">10:43</p>
            <div className="rounded-2xl rounded-tr-md px-3 py-2 text-[12px] text-white" style={{ background: 'var(--grad-brand)' }}>Shipping it now. Great work everyone!</div>
          </div>
        </div>
        <div className="flex gap-2.5 items-center">
          <Avatar initials="JL" i={2} size={26} />
          <div className="rounded-2xl rounded-tl-md bg-[var(--surface-2)] border border-line-soft px-3 py-2.5 flex gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)] animate-pulse" style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityPreview() {
  const rows = ['Encrypted end to end in transit', 'Reset links expire in 1 hour', 'Email confirmation on every change'];
  return (
    <div className="glass rounded-2xl border border-line p-5" style={{ boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center gap-3.5 mb-4">
        <span className="relative grid place-items-center w-12 h-12 rounded-2xl text-white" style={{ background: 'var(--grad-brand)', boxShadow: 'var(--shadow-glow)' }}>
          <Icon.Shield size={22} />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-fg">Account protection</p>
          <p className="text-[11px] text-muted">Your workspace stays locked down</p>
        </div>
        <span className="ml-auto badge" style={{ background: 'var(--success-soft)', color: 'var(--success-text)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-success" />Active
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(r => (
          <div key={r} className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] border border-line-soft px-3 py-2.5">
            <span className="grid place-items-center w-5 h-5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
              <Icon.Check size={12} />
            </span>
            <span className="text-[12px] font-medium text-fg">{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type BrandContent = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  features?: string[];
  preview?: 'board' | 'chat' | 'security';
  testimonial?: { quote: string; name: string; role: string; initials: string };
  stats?: { value: string; label: string }[];
};

function FloatingChip({ className, style, children }: { className?: string; style?: React.CSSProperties; children: ReactNode }) {
  return (
    <div className={`absolute glass rounded-xl border border-line px-3 py-2 flex items-center gap-2 animate-float ${className ?? ''}`} style={{ boxShadow: 'var(--shadow-md)', ...style }}>
      {children}
    </div>
  );
}

function BrandPanel({ brand }: { brand: BrandContent }) {
  const preview = brand.preview ?? 'board';
  return (
    <div
      className="relative h-full rounded-[28px] overflow-hidden border border-line flex flex-col p-10 xl:p-14"
      style={{
        background:
          'linear-gradient(160deg, color-mix(in srgb, var(--primary) 14%, var(--bg)) 0%, var(--bg) 52%, color-mix(in srgb, var(--accent) 10%, var(--bg)) 100%)',
      }}
    >
      {/* Ambient layers */}
      <div className="absolute inset-0 aurora pointer-events-none" />
      <div
        className="absolute inset-0 dot-grid opacity-70 pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, #000 20%, transparent 75%)' }}
      />
      <div className="absolute -top-28 -right-24 w-[26rem] h-[26rem] rounded-full blur-3xl opacity-40 animate-float pointer-events-none" style={{ background: 'var(--primary)' }} />
      <div className="absolute -bottom-32 -left-24 w-[22rem] h-[22rem] rounded-full blur-3xl opacity-25 animate-float pointer-events-none" style={{ background: 'var(--accent)', animationDelay: '-3s' }} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Headline */}
        <div className="max-w-[30rem] animate-fade-up">
          {brand.eyebrow && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line glass px-3 py-1 text-[11.5px] font-semibold text-primary-text mb-5">
              <Icon.Sparkles size={13} />{brand.eyebrow}
            </span>
          )}
          <h2 className="font-display text-[2.4rem] xl:text-[2.75rem] leading-[1.08] font-extrabold text-fg">{brand.title}</h2>
          {brand.subtitle && <p className="mt-4 text-[15px] leading-relaxed text-muted max-w-[26rem]">{brand.subtitle}</p>}
        </div>

        {/* Preview */}
        <div className="relative my-auto py-10 [@media(max-height:780px)]:hidden" style={{ animation: 'fade-up .7s cubic-bezier(.22,1,.36,1) .15s both' }}>
          <div className="relative max-w-[34rem] mx-auto" style={{ transform: 'perspective(1400px) rotateX(4deg) rotateY(-6deg)' }}>
            {preview === 'board' && <BoardPreview />}
            {preview === 'chat' && <ChatPreview />}
            {preview === 'security' && <SecurityPreview />}
          </div>

          {preview === 'board' && (
            <>
              <FloatingChip className="-left-2 xl:-left-4 top-4">
                <span className="grid place-items-center w-6 h-6 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}><Icon.Check size={13} /></span>
                <span className="text-[11.5px] font-semibold text-fg">Task completed</span>
              </FloatingChip>
              <FloatingChip className="-right-1 xl:-right-3 bottom-4" style={{ animationDelay: '-2.5s' }}>
                <div className="flex -space-x-1.5">{['MK', 'DP', 'LS'].map((x, i) => <Avatar key={x} initials={x} i={i + 2} size={20} />)}</div>
                <span className="text-[11.5px] font-semibold text-fg">3 teammates joined</span>
              </FloatingChip>
            </>
          )}
          {preview === 'chat' && (
            <FloatingChip className="-right-1 xl:-right-3 top-3" style={{ animationDelay: '-2s' }}>
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-[11.5px] font-semibold text-fg">Realtime · 24ms</span>
            </FloatingChip>
          )}
          {preview === 'security' && (
            <FloatingChip className="-left-1 xl:-left-3 bottom-4" style={{ animationDelay: '-2s' }}>
              <Icon.Lock size={14} className="text-primary-text" />
              <span className="text-[11.5px] font-semibold text-fg">256-bit TLS</span>
            </FloatingChip>
          )}
        </div>

        {/* Bottom */}
        <div className="mt-auto flex flex-col gap-6 animate-fade-up" style={{ animationDelay: '.25s' }}>
          {brand.features && brand.features.length > 0 && (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
              {brand.features.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-[13px] text-fg">
                  <span className="mt-0.5 grid place-items-center w-[18px] h-[18px] rounded-full shrink-0 bg-primary-soft text-primary-text"><Icon.Check size={11} /></span>
                  <span className="leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          )}

          {brand.testimonial && (
            <figure className="glass rounded-2xl border border-line p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex gap-0.5 mb-2.5 text-[var(--warning)]">
                {[0, 1, 2, 3, 4].map(i => (
                  <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8L12 2.5Z" /></svg>
                ))}
              </div>
              <blockquote className="text-[13.5px] leading-relaxed text-fg">{brand.testimonial.quote}</blockquote>
              <figcaption className="mt-3.5 flex items-center gap-2.5">
                <Avatar initials={brand.testimonial.initials} i={1} size={30} />
                <div>
                  <p className="text-[12.5px] font-semibold text-fg leading-none">{brand.testimonial.name}</p>
                  <p className="text-[11px] text-muted mt-1 leading-none">{brand.testimonial.role}</p>
                </div>
              </figcaption>
            </figure>
          )}

          {brand.stats && brand.stats.length > 0 && (
            <div className="flex gap-8 pt-5 border-t border-line">
              {brand.stats.map(s => (
                <div key={s.label}>
                  <p className="font-display text-xl font-extrabold text-fg tracking-tight">{s.value}</p>
                  <p className="text-[11.5px] text-muted mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SHELLS
   ════════════════════════════════════════════════════════════════ */

/** Split-screen auth layout: form on the left, brand panel on the right (desktop only). */
export default function AuthShell({
  children, brand, productName = 'ProjectHub', logoMark,
}: {
  children: ReactNode;
  brand: BrandContent;
  productName?: string;
  logoMark?: string;
}) {
  return (
    <div className="relative min-h-screen bg-bg lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <section className="relative flex flex-col min-h-screen px-5 sm:px-10 py-5 sm:py-6 overflow-hidden">
        {/* Mobile ambience */}
        <div className="absolute inset-x-0 top-0 h-[22rem] aurora pointer-events-none lg:hidden" />
        <header className="relative z-10 flex items-center justify-between">
          <Logo name={productName} mark={logoMark} />
          <ThemeToggle />
        </header>
        <main className="relative z-10 flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[400px] stagger">{children}</div>
        </main>
        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-[12px] text-subtle">
          <span>© {new Date().getFullYear()} {productName}</span>
          <span className="inline-flex items-center gap-1.5"><Icon.Lock size={12} />Secured with SSL encryption</span>
        </footer>
      </section>
      <aside className="hidden lg:block lg:sticky lg:top-0 lg:h-screen p-3">
        <BrandPanel brand={brand} />
      </aside>
    </div>
  );
}

/** Centered single-card layout over an aurora backdrop (status / admin screens). */
export function AuthCenter({
  children, productName = 'ProjectHub', logoMark, logoHref = '/', maxWidth = 440, footer,
}: {
  children: ReactNode;
  productName?: string;
  logoMark?: string;
  logoHref?: string;
  maxWidth?: number;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-bg flex flex-col overflow-hidden">
      <div className="absolute inset-0 aurora pointer-events-none" />
      <div
        className="absolute inset-0 dot-grid opacity-60 pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse 60% 55% at 50% 40%, #000 15%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 60% 55% at 50% 40%, #000 15%, transparent 75%)' }}
      />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-20 pointer-events-none animate-float" style={{ background: 'var(--primary)' }} />

      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-5">
        <Logo name={productName} mark={logoMark} href={logoHref} />
        <ThemeToggle />
      </header>
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full animate-fade-up" style={{ maxWidth }}>
          {children}
          {footer && <div className="mt-5">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

/** Elevated card used inside AuthCenter. */
export function AuthCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ring-gradient rounded-[22px] ${className}`}>
      <div className="relative rounded-[22px] bg-surface border border-line p-7 sm:p-9" style={{ boxShadow: 'var(--shadow-lg)' }}>
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FORM PRIMITIVES
   ════════════════════════════════════════════════════════════════ */
export function AuthHeading({ title, subtitle, className = '' }: { title: ReactNode; subtitle?: ReactNode; className?: string }) {
  return (
    <div className={`mb-7 ${className}`}>
      <h1 className="font-display text-[1.75rem] sm:text-[1.9rem] leading-tight font-extrabold text-fg">{title}</h1>
      {subtitle && <p className="mt-2 text-[14.5px] text-muted leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/** Icon badge used above status headings. */
export function StatusIcon({ tone = 'primary', children }: { tone?: 'primary' | 'success' | 'danger' | 'warning'; children: ReactNode }) {
  const map = {
    primary: { bg: 'var(--primary-soft)', fg: 'var(--primary-text)', ring: 'var(--primary-ring)' },
    success: { bg: 'var(--success-soft)', fg: 'var(--success)', ring: 'color-mix(in srgb, var(--success) 30%, transparent)' },
    danger: { bg: 'var(--danger-soft)', fg: 'var(--danger)', ring: 'color-mix(in srgb, var(--danger) 30%, transparent)' },
    warning: { bg: 'var(--warning-soft)', fg: 'var(--warning)', ring: 'color-mix(in srgb, var(--warning) 30%, transparent)' },
  }[tone];
  return (
    <div className="relative mx-auto mb-6 w-16 h-16 animate-scale-in">
      <span className="absolute inset-0 rounded-[20px] blur-xl opacity-70" style={{ background: map.ring }} />
      <span className="relative grid place-items-center w-16 h-16 rounded-[20px] border border-line" style={{ background: map.bg, color: map.fg }}>
        {children}
      </span>
    </div>
  );
}

type Tone = 'danger' | 'success' | 'warning' | 'info';
const TONES: Record<Tone, { bg: string; fg: string; border: string; icon: ReactNode }> = {
  danger: { bg: 'var(--danger-soft)', fg: 'var(--danger-text)', border: 'color-mix(in srgb, var(--danger) 28%, transparent)', icon: <Icon.Alert size={17} /> },
  success: { bg: 'var(--success-soft)', fg: 'var(--success-text)', border: 'color-mix(in srgb, var(--success) 28%, transparent)', icon: <Icon.CheckCircle size={17} /> },
  warning: { bg: 'var(--warning-soft)', fg: 'var(--warning-text)', border: 'color-mix(in srgb, var(--warning) 30%, transparent)', icon: <Icon.Alert size={17} /> },
  info: { bg: 'var(--info-soft)', fg: 'var(--info-text)', border: 'color-mix(in srgb, var(--info) 28%, transparent)', icon: <Icon.Info size={17} /> },
};

export function Alert({ tone = 'danger', title, children, className = '' }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed animate-scale-in ${className}`}
      style={{ background: t.bg, color: t.fg, borderColor: t.border }}
    >
      <span className="mt-[1px] shrink-0">{t.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : 'font-medium'}>{children}</div>}
      </div>
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <span className="flex-1 h-px bg-[var(--border)]" />
      <span className="text-[11.5px] font-medium text-subtle uppercase tracking-[0.08em] whitespace-nowrap">{label}</span>
      <span className="flex-1 h-px bg-[var(--border)]" />
    </div>
  );
}

const socialClass =
  'btn btn-secondary btn-lg w-full text-[14px] hover:-translate-y-px no-underline';

export function SocialLink({ provider, href, children }: { provider: 'google' | 'github'; href: string; children: ReactNode }) {
  return (
    <a href={href} className={socialClass}>
      {provider === 'google' ? <GoogleLogo /> : <GitHubLogo />}
      {children}
    </a>
  );
}

export function SocialButton({ provider, onClick, children }: { provider: 'google' | 'github'; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={socialClass}>
      {provider === 'google' ? <GoogleLogo /> : <GitHubLogo />}
      {children}
    </button>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block rounded-full border-2 border-current border-r-transparent"
      style={{ width: size, height: size, animation: 'spin .7s linear infinite' }}
    />
  );
}

export function SubmitButton({
  loading, loadingText, children, disabled, type = 'submit', onClick, variant = 'gradient', className = '',
}: {
  loading?: boolean;
  loadingText?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
  variant?: 'gradient' | 'secondary' | 'primary';
  className?: string;
}) {
  const v = variant === 'gradient' ? 'btn-gradient' : variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`btn ${v} btn-lg w-full group ${className}`}>
      {loading ? (
        <><Spinner />{loadingText ?? children}</>
      ) : (
        <>
          {children}
          {variant === 'gradient' && <Icon.ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />}
        </>
      )}
    </button>
  );
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: ReactNode;
  icon?: ReactNode;
  labelRight?: ReactNode;
  hint?: ReactNode;
  trailing?: ReactNode;
};

export function Field({ label, icon, labelRight, hint, trailing, id, className = '', ...rest }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={inputId} className="text-[13px] font-semibold text-fg">{label}</label>
        {labelRight}
      </div>
      <div className="relative group">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-primary-text">
            {icon}
          </span>
        )}
        <input id={inputId} className={`input h-11 ${icon ? 'pl-10' : ''} ${trailing ? 'pr-11' : ''} ${className}`} {...rest} />
        {trailing && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
      {hint && <div className="mt-1.5 text-[12px] text-subtle">{hint}</div>}
    </div>
  );
}

/** Password input with a show/hide toggle. Pass `show`/`onToggleShow` to control it from outside. */
export function PasswordField({
  show, onToggleShow, icon, ...rest
}: Omit<FieldProps, 'type' | 'trailing'> & { show?: boolean; onToggleShow?: () => void }) {
  const [internal, setInternal] = useState(false);
  const visible = show ?? internal;
  const toggle = onToggleShow ?? (() => setInternal(v => !v));
  return (
    <Field
      {...rest}
      icon={icon ?? <Icon.Lock size={17} />}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={toggle}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="grid place-items-center w-8 h-8 rounded-lg text-subtle hover:text-fg hover:bg-[var(--surface-hover)] transition"
        >
          {visible ? <Icon.EyeOff size={17} /> : <Icon.Eye size={17} />}
        </button>
      }
    />
  );
}

export function passwordScore(p: string) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (p.length >= 12) s++;
  return Math.max(1, Math.min(4, s));
}

export function StrengthMeter({ password }: { password: string }) {
  const score = passwordScore(password);
  const levels = [
    { label: 'Too weak', color: 'var(--danger)' },
    { label: 'Weak', color: 'var(--danger)' },
    { label: 'Fair', color: 'var(--warning)' },
    { label: 'Good', color: 'var(--info)' },
    { label: 'Strong', color: 'var(--success)' },
  ];
  const lvl = levels[score];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map(i => (
          <span key={i} className="h-1 flex-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <span
              className="block h-full rounded-full transition-all duration-300"
              style={{ width: password && score >= i ? '100%' : '0%', background: lvl.color }}
            />
          </span>
        ))}
      </div>
      {password && (
        <p className="mt-1.5 text-[11.5px] text-subtle">
          Strength: <span className="font-semibold" style={{ color: lvl.color }}>{lvl.label}</span>
          {score < 3 && <span> · add uppercase, numbers or symbols</span>}
        </p>
      )}
    </div>
  );
}

/** Footer line like "Don't have an account? Sign up". */
export function AuthFooterLink({ text, href, cta }: { text: ReactNode; href: string; cta: ReactNode }) {
  return (
    <p className="mt-7 text-center text-[14px] text-muted">
      {text}{' '}
      <Link href={href} className="font-semibold text-primary-text hover:underline underline-offset-4">{cta}</Link>
    </p>
  );
}

export function TextLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`text-[12.5px] font-semibold text-primary-text hover:underline underline-offset-4 ${className}`}>
      {children}
    </Link>
  );
}
