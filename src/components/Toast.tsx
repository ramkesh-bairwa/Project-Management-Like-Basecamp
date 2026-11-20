'use client';

import { useEffect, useState } from 'react';
import './toast.css';

interface Toast {
  id: number;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

let toastId = 0;
const listeners: ((toast: Toast) => void)[] = [];

export function showToast(
  type: Toast['type'],
  title: string,
  message?: string,
  duration = 4000
) {
  const toast: Toast = { id: ++toastId, type, title, message, duration };
  listeners.forEach((listener) => listener(toast));
}

const ICONS: Record<Toast['type'], React.ReactNode> = {
  success: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  error: <path d="M18 6 6 18M6 6l12 12" />,
  warning: <><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  info: <><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
};

const TONE: Record<Toast['type'], string> = {
  success: 'var(--success)',
  error: 'var(--danger)',
  warning: 'var(--warning)',
  info: 'var(--primary)',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<(Toast & { leaving?: boolean })[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev.slice(-4), toast]);
      setTimeout(() => dismiss(toast.id), toast.duration);
    };
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 220);
  }

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const tone = TONE[toast.type];
        return (
          <div key={toast.id} className={`toast-item ${toast.leaving ? 'toast-leave' : ''}`} role="status">
            <div className="toast-icon" style={{ background: tone }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                {ICONS[toast.type]}
              </svg>
            </div>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button onClick={() => dismiss(toast.id)} className="toast-close" aria-label="Dismiss">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <div className="toast-progress" style={{ background: tone, animationDuration: `${toast.duration}ms` }} />
          </div>
        );
      })}
    </div>
  );
}
