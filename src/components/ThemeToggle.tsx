'use client';
import { useTheme } from '@/lib/theme';

/** Animated sun/moon button that flips light ⇄ dark. */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-muted hover:text-fg hover:bg-[var(--surface-hover)] transition overflow-hidden ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="absolute transition-all duration-500"
        style={{ transform: isDark ? 'rotate(90deg) scale(0)' : 'rotate(0) scale(1)', opacity: isDark ? 0 : 1 }}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="absolute transition-all duration-500"
        style={{ transform: isDark ? 'rotate(0) scale(1)' : 'rotate(-90deg) scale(0)', opacity: isDark ? 1 : 0 }}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
