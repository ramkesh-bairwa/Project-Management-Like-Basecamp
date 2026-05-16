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
  const toast: Toast = {
    id: ++toastId,
    type,
    title,
    message,
    duration,
  };
  listeners.forEach((listener) => listener(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration);
    };
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const config = {
    success: {
      icon: '✓',
      bg: '#f0fdf9',
      border: '#99f6e4',
      iconBg: '#2a9d8f',
      text: '#0f766e',
    },
    warning: {
      icon: '⚠',
      bg: '#fef9c3',
      border: '#fef08a',
      iconBg: '#f59e0b',
      text: '#854d0e',
    },
    error: {
      icon: '✕',
      bg: '#fef2f2',
      border: '#fecaca',
      iconBg: '#e63946',
      text: '#b91c1c',
    },
    info: {
      icon: 'ℹ',
      bg: '#eff6ff',
      border: '#bfdbfe',
      iconBg: '#457b9d',
      text: '#1d4ed8',
    },
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const cfg = config[toast.type];
        return (
          <div
            key={toast.id}
            className="toast-item"
            style={{
              background: cfg.bg,
              border: `2px solid ${cfg.border}`,
            }}
          >
            {/* Progress bar */}
            <div
              className="toast-progress"
              style={{
                background: cfg.iconBg,
                animation: `shrink ${toast.duration}ms linear`,
              }}
            />

            {/* Icon */}
            <div
              className="toast-icon"
              style={{
                background: cfg.iconBg,
              }}
            >
              {cfg.icon}
            </div>

            {/* Content */}
            <div className="toast-content">
              <div
                className="toast-title"
                style={{
                  color: cfg.text,
                }}
              >
                {toast.title}
              </div>
              {toast.message && (
                <div
                  className="toast-message"
                  style={{
                    color: cfg.text,
                  }}
                >
                  {toast.message}
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="toast-close"
              style={{
                color: cfg.text,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
