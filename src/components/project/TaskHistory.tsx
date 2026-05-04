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
  created:             { icon: '✦', color: '#2a9d8f', label: 'Task created' },
  status_changed:      { icon: '⇄', color: '#457b9d', label: 'Status changed' },
  closed:              { icon: '✓', color: '#0f766e', label: 'Closed' },
  reopened:            { icon: '↺', color: '#c2410c', label: 'Reopened' },
  assigned:            { icon: '→', color: '#6d6875', label: 'Assigned' },
  unassigned:          { icon: '←', color: '#94a3b8', label: 'Unassigned' },
  priority_changed:    { icon: '!', color: '#f4a261', label: 'Priority changed' },
  title_changed:       { icon: '✎', color: '#457b9d', label: 'Title changed' },
  description_changed: { icon: '✎', color: '#457b9d', label: 'Description changed' },
  due_date_changed:    { icon: '📅', color: '#6d6875', label: 'Due date changed' },
  moved_group:         { icon: '⇢', color: '#e9c46a', label: 'Moved to group' },
  subtask_added:       { icon: '+', color: '#2a9d8f', label: 'Subtask added' },
  comment_added:       { icon: '💬', color: '#457b9d', label: 'Comment added' },
  document_attached:   { icon: '📎', color: '#6d6875', label: 'Document attached' },
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
  if (!entries.length) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: '#6b7a8d' }}>
        No history yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-0.5" style={{ background: '#d0dce8' }} />
      <div className="space-y-4">
        {entries.map(entry => {
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
                  <span className="text-sm font-bold" style={{ color: '#1d3557' }}>{entry.changed_by_name}</span>
                  <span className="text-sm" style={{ color: '#6b7a8d' }}>{cfg.label}</span>
                  {entry.old_value && entry.new_value && (
                    <span className="text-xs">
                      <span className="px-1.5 py-0.5 rounded line-through" style={{ background: '#fef2f2', color: '#b91c1c' }}>{entry.old_value}</span>
                      <span className="mx-1" style={{ color: '#94a3b8' }}>→</span>
                      <span className="px-1.5 py-0.5 rounded" style={{ background: '#f0fdf9', color: '#0f766e' }}>{entry.new_value}</span>
                    </span>
                  )}
                  {!entry.old_value && entry.new_value && entry.action !== 'created' && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f0fdf9', color: '#0f766e' }}>{entry.new_value}</span>
                  )}
                </div>
                {entry.note && (
                  <p className="text-xs mt-1 italic" style={{ color: '#6b7a8d' }}>{entry.note}</p>
                )}
                <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
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
