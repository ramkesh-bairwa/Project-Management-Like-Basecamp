'use client';
import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  const dark = pref === 'dark' || (pref === 'system' && systemDark());
  root.classList.toggle('dark', dark);
  root.dataset.theme = pref;
  try { localStorage.setItem('theme', pref); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent('themechange', { detail: pref }));
}

function readPref(): ThemePref {
  if (typeof document === 'undefined') return 'system';
  const t = document.documentElement.dataset.theme;
  return t === 'light' || t === 'dark' ? t : 'system';
}

/** Shared theme state; every component using it stays in sync. */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => {
      setPref(readPref());
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    sync();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => { if (readPref() === 'system') applyTheme('system'); };
    window.addEventListener('themechange', sync);
    mq.addEventListener('change', onSystem);
    return () => {
      window.removeEventListener('themechange', sync);
      mq.removeEventListener('change', onSystem);
    };
  }, []);

  const setTheme = useCallback((p: ThemePref) => applyTheme(p), []);
  const toggle = useCallback(() => {
    applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
  }, []);

  return { pref, isDark, setTheme, toggle };
}
