'use client';
import { createContext, useContext, useCallback, ReactNode } from 'react';
import { showToast } from '@/components/Toast';

interface ToastContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

/** Thin adapter over the app-wide toast stack so every toast looks the same. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const showSuccess = useCallback((message: string) => showToast('success', 'Success', message, 3500), []);
  const showError = useCallback((message: string) => showToast('error', 'Something went wrong', message, 4500), []);

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
    </ToastContext.Provider>
  );
}
