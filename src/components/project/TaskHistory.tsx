'use client';
import { useState } from 'react';

export interface HistoryEntry {
  id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  changed_by_name: string;
  created_at: string;
}

const actionConfig: Record<string, { icon: string; color: string; label: string }> = {
  created:             { icon: '✦', color: '#10b981', label: 'Task created' },
  status_changed:      { icon: '⇄', color: '#6366f1', label: 'Status changed' },
  closed:              { icon: '✓', color: '#0f766e', label: 'Closed' },
  reopened:            { icon: '↺', color: '#c2410c', label: 'Reopened' },
  assigned:            { icon: '→', color: '#8b5cf6', label: 'Assigned' },
  unassigned:          { icon: '←', color: '#94a3b8', label: 'Unassigned' },
  priority_changed:    { icon: '!', color: '#f59e0b', label: 'Priority changed' },
  title_changed:       { icon: '✎', color: '#6366f1', label: 'Title changed' },
  description_changed: { icon: '✎', color: '#6366f1', label: 'Description changed' },
  due_date_changed:    { icon: '📅', color: '#8b5cf6', label: 'Due date changed' },
  moved_group:         { icon: '⇢', color: '#eab308', label: 'Moved to group' },
  subtask_added:       { icon: '+', color: '#10b981', label: 'Subtask added' },
  comment_added:       { icon: '💬', color: '#6366f1', label: 'Comment added' },
  comment_deleted:     { icon: '🗑', color: '#dc2626', label: 'Comment deleted' },
  comment_updated:     { icon: '✎', color: '#9333ea', label: 'Comment edited' },
  document_attached:   { icon: '📎', color: '#8b5cf6', label: 'Document attached' },
};


function fmtDT(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = dt.getDate();
  const s = day%10===1&&day!==11?'st':day%10===2&&day!==12?'nd':day%10===3&&day!==13?'rd':'th';
  const mon = dt.toLocaleString('en',{month:'short'});
  const h = dt.getHours()%12||12, m = String(dt.getMinutes()).padStart(2,'0'), ap = dt.getHours()>=12?'PM':'AM';
  return `${day}${s} ${mon} ${dt.getFullYear()} ${h}:${m} ${ap}`;
}
function fmtD(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = dt.getDate();
  const s = day%10===1&&day!==11?'st':day%10===2&&day!==12?'nd':day%10===3&&day!==13?'rd':'th';
  return `${day}${s} ${dt.toLocaleString('en',{month:'short'})} ${dt.getFullYear()}`;
}
function fmtT(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const h = dt.getHours()%12||12, m = String(dt.getMinutes()).padStart(2,'0'), ap = dt.getHours()>=12?'PM':'AM';
  return `${h}:${m} ${ap}`;
}

export default function TaskHistory({ entries }: { entries: HistoryEntry[] }) {
  const visibleEntries = entries.filter(entry => entry.action !== 'comment_added');

  if (!visibleEntries.length) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        No history yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-0.5" style={{ background: '#d0dce8' }} />
      <div className="space-y-4">
        {visibleEntries.map(entry => {
          const cfg = actionConfig[entry.action] || { icon: '•', color: '#94a3b8', label: entry.action };
          return (
            <div key={entry.id} className="flex gap-4 relative">
              {/* Dot */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 z-10"
                style={{ background: cfg.color }}
              >
                {cfg.icon}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{entry.changed_by_name}</span>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{cfg.label}</span>
                  {entry.old_value && entry.new_value && (
                    <span className="text-xs">
                      <span className="px-1.5 py-0.5 rounded line-through" style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)' }}>{entry.old_value}</span>
                      <span className="mx-1" style={{ color: 'var(--text-subtle)' }}>→</span>
                      <span className="px-1.5 py-0.5 rounded" style={{ background: 'var(--success-soft)', color: 'var(--success-text)' }}>{entry.new_value}</span>
                    </span>
                  )}
                  {!entry.old_value && entry.new_value && entry.action !== 'created' && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--success-soft)', color: 'var(--success-text)' }}>{entry.new_value}</span>
                  )}
                  {entry.old_value && !entry.new_value && (
                    <span className="text-xs px-1.5 py-0.5 rounded line-through" style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)' }}>{entry.old_value}</span>
                  )}
                </div>
                {entry.note && (
                  <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>{entry.note}</p>
                )}
                {(entry.action === 'comment_deleted' || entry.action === 'comment_updated') && (
                  <div className="mt-2 space-y-1">
                    {entry.old_value && (
                      <div className="text-xs px-2 py-1.5 rounded-lg" style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)', border: '1px solid var(--danger-soft)' }}>
                        <span className="font-bold mr-1">Before:</span>{entry.old_value}
                      </div>
                    )}
                    {entry.new_value && (
                      <div className="text-xs px-2 py-1.5 rounded-lg" style={{ background: 'var(--success-soft)', color: 'var(--success-text)', border: '1px solid var(--success-soft)' }}>
                        <span className="font-bold mr-1">After:</span>{entry.new_value}
                      </div>
                    )}
                  </div>
                )}
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                  {fmtDT(entry.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
