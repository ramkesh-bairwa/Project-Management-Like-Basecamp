'use client';
import { useEffect } from 'react';
import { IconKeyboard, IconX } from './Icons';

const GROUPS: { title: string; items: [string[], string][] }[] = [
  { title: 'General', items: [[['⌘', 'K'], 'Open command palette'], [['/'], 'Search'], [['?'], 'Show shortcuts'], [['F'], 'Start / pause focus timer'], [['T'], 'Toggle light / dark theme'], [['['], 'Collapse sidebar']] },
  { title: 'Go to', items: [[['G', 'H'], 'Home'], [['G', 'P'], 'Projects'], [['G', 'R'], 'Daily reports'], [['G', 'M'], 'Messages'], [['G', 'O'], 'Organizations'], [['G', 'N'], 'Notifications']] },
  { title: 'Create', items: [[['C'], 'New project'], [['D'], 'New daily report']] },
];

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 animate-fade-in" style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }} />
      <div className="relative w-full max-w-2xl rounded-2xl animate-scale-in overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
        onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary-soft text-primary-text"><IconKeyboard /></span>
            <div>
              <div className="font-display font-bold text-fg">Keyboard shortcuts</div>
              <div className="text-xs text-subtle">Move at the speed of thought</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-subtle hover:text-fg hover:bg-[var(--surface-hover)]" aria-label="Close"><IconX size={16} /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6 p-6">
          {GROUPS.map(g => (
            <div key={g.title}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-2">{g.title}</div>
              <div className="space-y-1">
                {g.items.map(([keys, label]) => (
                  <div key={label} className="flex items-center justify-between h-9 px-2 -mx-2 rounded-lg hover:bg-[var(--surface-hover)]">
                    <span className="text-sm text-fg">{label}</span>
                    <span className="flex items-center gap-1">
                      {keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && keys[0] === 'G' && <span className="text-[10px] text-subtle">then</span>}
                          <span className="kbd">{k}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
