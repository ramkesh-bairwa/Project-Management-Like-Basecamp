'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {/* Success Line - Top of Page */}
      {successMessage && (
        <div className="fixed top-0 left-0 right-0 z-[9999]" style={{ height: '3px', background: 'transparent' }}>
          <div className="absolute top-0 left-0 h-full bg-[#ef4444]" style={{ animation: 'expandToRight 3s linear forwards', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)' }} />
        </div>
      )}

      {/* Error Line - Top of Page */}
      {errorMessage && (
        <div className="fixed top-0 left-0 right-0 z-[9999]" style={{ height: '3px', background: 'transparent' }}>
          <div className="absolute top-0 left-0 h-full bg-[#ef4444]" style={{ animation: 'expandToRight 3s linear forwards', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)' }} />
        </div>
      )}

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl shadow-2xl overflow-hidden" style={{ width: '400px', background: '#fff', border: '1px solid #e5e7eb' }}>
          <div className="flex items-start gap-3 p-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm mb-0.5" style={{ color: '#6b21a8' }}>Success</div>
              <div className="text-sm" style={{ color: '#6b7280' }}>{successMessage}</div>
            </div>
            <button onClick={() => setSuccessMessage('')} className="flex-shrink-0 text-[#9ca3af] hover:text-[#6b7280] transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl shadow-2xl overflow-hidden" style={{ width: '400px', background: '#fff', border: '1px solid #e5e7eb' }}>
          <div className="flex items-start gap-3 p-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fee2e2' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm mb-0.5" style={{ color: '#991b1b' }}>Error</div>
              <div className="text-sm" style={{ color: '#6b7280' }}>{errorMessage}</div>
            </div>
            <button onClick={() => setErrorMessage('')} className="flex-shrink-0 text-[#9ca3af] hover:text-[#6b7280] transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes expandToRight {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>

      {children}
    </ToastContext.Provider>
  );
}
