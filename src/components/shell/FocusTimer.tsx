'use client';
import { useCallback, useEffect, useState } from 'react';
import { IconPause, IconPlay, IconReset, IconTimer, IconX } from './Icons';

const MODES = {
  focus: { label: 'Focus', minutes: 25, color: '#7065ff' },
  short: { label: 'Short break', minutes: 5, color: '#10b981' },
  long: { label: 'Long break', minutes: 15, color: '#f59e0b' },
} as const;
type Mode = keyof typeof MODES;

type Saved = { mode: Mode; endsAt: number | null; remaining: number; open: boolean };
const KEY = 'focus-timer';
const STATS_KEY = 'focus-stats';

function todayKey() { return new Date().toISOString().slice(0, 10); }

/** Focus sessions completed today (read by the dashboard). */
export function readFocusStats(): { date: string; sessions: number; minutes: number } {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    if (s.date === todayKey()) return s;
  } catch { /* ignore */ }
  return { date: todayKey(), sessions: 0, minutes: 0 };
}

function bumpStats(minutes: number) {
  const s = readFocusStats();
  const next = { date: todayKey(), sessions: s.sessions + 1, minutes: s.minutes + minutes };
  try { localStorage.setItem(STATS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('focus-stats'));
}

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch { /* audio unavailable */ }
}

function load(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.mode in MODES) return s;
  } catch { /* ignore */ }
  return { mode: 'focus', endsAt: null, remaining: MODES.focus.minutes * 60, open: false };
}

export default function FocusTimer({ toggleSignal }: { toggleSignal: number }) {
  const [state, setState] = useState<Saved | null>(null);
  const [, tick] = useState(0);

  useEffect(() => { setState(load()); }, []);
  useEffect(() => { if (state) try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);

  const running = !!state?.endsAt;
  const remaining = state ? (state.endsAt ? Math.max(0, Math.round((state.endsAt - Date.now()) / 1000)) : state.remaining) : 0;

  const start = useCallback(() => setState(s => s && ({ ...s, endsAt: Date.now() + s.remaining * 1000, open: true })), []);
  const pause = useCallback(() => setState(s => s && ({ ...s, endsAt: null, remaining: s.endsAt ? Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)) : s.remaining })), []);
  const reset = useCallback((mode?: Mode) => setState(s => s && ({ ...s, mode: mode || s.mode, endsAt: null, remaining: MODES[mode || s.mode].minutes * 60 })), []);

  // External toggle (keyboard "F" or command palette)
  useEffect(() => {
    if (!toggleSignal) return;
    setState(s => {
      if (!s) return s;
      if (!s.open) return { ...s, open: true };
      if (s.endsAt) return { ...s, endsAt: null, remaining: Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)) };
      return { ...s, endsAt: Date.now() + s.remaining * 1000 };
    });
  }, [toggleSignal]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => tick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  // Completion
  useEffect(() => {
    if (!state || !running || remaining > 0) return;
    chime();
    if (state.mode === 'focus') bumpStats(MODES.focus.minutes);
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(state.mode === 'focus' ? 'Focus session complete 🎉' : 'Break is over — back to it!', { body: 'ProjectHub focus timer' });
      }
    } catch { /* ignore */ }
    const next: Mode = state.mode === 'focus' ? (readFocusStats().sessions % 4 === 0 ? 'long' : 'short') : 'focus';
    setState(s => s && ({ ...s, mode: next, endsAt: null, remaining: MODES[next].minutes * 60 }));
  }, [remaining, running, state]);

  // Reflect timer in the tab title while running
  useEffect(() => {
    if (!running) return;
    const original = document.title.replace(/^⏱ \d+:\d+ · /, '');
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    document.title = `⏱ ${mm}:${ss} · ${original}`;
    return () => { document.title = original; };
  }, [running, remaining]);

  if (!state || !state.open) return null;

  const mode = MODES[state.mode];
  const total = mode.minutes * 60;
  const pct = 1 - remaining / total;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const R = 34; const C = 2 * Math.PI * R;

  return (
    <div className="fixed bottom-5 right-5 z-[90] w-[290px] rounded-2xl p-4 animate-slide-in-right glass"
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ background: mode.color }}><IconTimer size={14} /></span>
          Focus timer
        </div>
        <button onClick={() => { pause(); setState(s => s && ({ ...s, open: false })); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-fg hover:bg-[var(--surface-hover)]" aria-label="Close timer"><IconX size={15} /></button>
      </div>

      <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: 'var(--surface-3)' }}>
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button key={m} onClick={() => reset(m)}
            className="flex-1 h-7 rounded-lg text-[11px] font-semibold transition"
            style={{ background: state.mode === m ? 'var(--surface)' : 'transparent', color: state.mode === m ? 'var(--text)' : 'var(--text-muted)', boxShadow: state.mode === m ? 'var(--shadow-xs)' : 'none' }}>
            {MODES[m].label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-[84px] h-[84px] flex-shrink-0">
          <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
            <circle cx="42" cy="42" r={R} stroke="var(--surface-3)" strokeWidth="7" fill="none" />
            <circle cx="42" cy="42" r={R} stroke={mode.color} strokeWidth="7" fill="none" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold tabular-nums text-fg">{mm}:{ss}</div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-muted mb-2">{running ? (state.mode === 'focus' ? 'Deep work in progress…' : 'Breathe. Stretch. Hydrate.') : 'Ready when you are.'}</div>
          <div className="flex gap-2">
            {running
              ? <button onClick={pause} className="btn btn-sm btn-secondary flex-1"><IconPause size={14} /> Pause</button>
              : <button onClick={() => { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ } start(); }} className="btn btn-sm btn-primary flex-1"><IconPlay size={14} /> Start</button>}
            <button onClick={() => reset()} className="btn btn-sm btn-ghost" aria-label="Reset"><IconReset size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
