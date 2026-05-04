'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/client-auth';
import { useWebSocket } from '@/lib/ws-client';

interface Notification {
  id: number; type: string; title: string; body: string;
  link: string; is_read: boolean; created_at: string;
}

const typeCfg: Record<string, { icon: string; label: string; color: string; bg: string; border: string; accent: string }> = {
  connection:       { icon: '🔗', label: 'Connection',   color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', accent: '#f97316' },
  project:          { icon: '📋', label: 'Project',      color: '#0f766e', bg: '#f0fdf9', border: '#99f6e4', accent: '#14b8a6' },
  task:             { icon: '✅', label: 'Task',          color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6' },
  message:          { icon: '💬', label: 'Message',      color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', accent: '#0ea5e9' },
  group_invitation: { icon: '✉️', label: 'Invitation',   color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', accent: '#a855f7' },
  organization:     { icon: '🏢', label: 'Organization', color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8', accent: '#ec4899' },
  default:          { icon: '🔔', label: 'General',      color: '#1d3557', bg: '#f1faee', border: '#d0dce8', accent: '#457b9d' },
};

const FILTER_TYPES = ['all', 'task', 'project', 'message', 'connection', 'group_invitation', 'organization'];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return fmtD(dateStr);
}

function groupByDate(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  const map: Record<string, Notification[]> = {};
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  for (const n of notifications) {
    const d = new Date(n.created_at); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = 'Today';
    else if (d.getTime() === yesterday.getTime()) label = 'Yesterday';
    else label = fmtD(d);
    if (!map[label]) { map[label] = []; groups.push({ label, items: map[label] }); }
    map[label].push(n);
  }
  return groups;
}


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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newBanner, setNewBanner] = useState(0);
  const router = useRouter();
  const token = getToken();
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setNotifications(d); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWS = useCallback((msg: Record<string, unknown>) => {
    if (msg.type === 'notification') {
      setNotifications(prev => [{
        id: Date.now(),
        type: msg.notif_type as string,
        title: msg.title as string,
        body: (msg.body as string) || '',
        link: (msg.link as string) || '',
        is_read: false,
        created_at: msg.created_at as string,
      }, ...prev]);
      setNewBanner(b => b + 1);
      setTimeout(() => setNewBanner(b => Math.max(0, b - 1)), 5000);
    }
  }, []);
  useWebSocket(token, handleWS);

  async function markRead(id: number) {
    await fetch('/api/notifications', { method: 'PUT', headers: h, body: JSON.stringify({ id }) });
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAll() {
    await fetch('/api/notifications', { method: 'PUT', headers: h, body: JSON.stringify({}) });
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
  }

  async function deleteNotif(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setNotifications(ns => ns.filter(n => n.id !== id));
  }

  async function handleClick(n: Notification) {
    if (!n.is_read) await markRead(n.id);
    if (n.link) router.push(n.link);
  }

  const unread = notifications.filter(n => !n.is_read).length;
  const read = notifications.length - unread;

  let filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  if (showUnreadOnly) filtered = filtered.filter(n => !n.is_read);
  const grouped = groupByDate(filtered);

  return (
    <div style={{ minHeight: 'calc(100vh - 10rem)' }}>

      {/* Live banner */}
      {newBanner > 0 && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 rounded-2xl shadow-xl text-white text-sm font-bold animate-bounce"
          style={{ background: '#1d3557', border: '1.5px solid rgba(255,255,255,0.15)' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#2a9d8f' }} />
          {newBanner} new notification{newBanner > 1 ? 's' : ''} arrived
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: notifications.length, icon: '🔔', color: '#1d3557', bg: '#e8f0f7' },
          { label: 'Unread', value: unread, icon: '🔴', color: '#e63946', bg: '#fef2f2' },
          { label: 'Read', value: read, icon: '✅', color: '#0f766e', bg: '#f0fdf9' },
          { label: 'Types', value: new Set(notifications.map(n => n.type)).size, icon: '🏷️', color: '#7c3aed', bg: '#faf5ff' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: s.bg, border: `1.5px solid ${s.bg === '#e8f0f7' ? '#d0dce8' : s.bg}` }}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs font-bold" style={{ color: '#6b7a8d' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-6 items-start">

        {/* Left sidebar — filters */}
        <div className="w-56 flex-shrink-0 sticky top-24">
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #d0dce8' }}>
            <div className="px-4 py-3" style={{ background: '#1d3557' }}>
              <div className="font-black text-white text-sm">Filters</div>
            </div>

            {/* Unread toggle */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <button onClick={() => setShowUnreadOnly(v => !v)}
                className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition"
                style={{
                  background: showUnreadOnly ? '#fef2f2' : '#f8fafc',
                  color: showUnreadOnly ? '#e63946' : '#6b7a8d',
                  border: `1.5px solid ${showUnreadOnly ? '#fecaca' : '#e2e8f0'}`,
                }}>
                <span className="flex items-center gap-2">
                  <span>🔴</span> Unread only
                </span>
                {unread > 0 && (
                  <span className="text-xs font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: '#e63946' }}>{unread}</span>
                )}
              </button>
            </div>

            {/* Type filters */}
            <div className="p-2">
              {FILTER_TYPES.map(t => {
                const cfg = typeCfg[t] || typeCfg.default;
                const count = t === 'all' ? notifications.length : notifications.filter(n => n.type === t).length;
                const unreadCount = t === 'all' ? unread : notifications.filter(n => n.type === t && !n.is_read).length;
                if (t !== 'all' && count === 0) return null;
                const active = filter === t;
                return (
                  <button key={t} onClick={() => setFilter(t)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition mb-0.5"
                    style={{
                      background: active ? '#1d3557' : 'transparent',
                      color: active ? '#fff' : '#475569',
                    }}>
                    <span className="text-base">{t === 'all' ? '🔔' : cfg.icon}</span>
                    <span className="flex-1 text-left capitalize">{t === 'all' ? 'All' : cfg.label}</span>
                    <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                      style={{
                        background: active ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                        color: active ? '#fff' : '#94a3b8',
                      }}>{count}</span>
                    {unreadCount > 0 && !active && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#e63946' }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mark all read */}
            {unread > 0 && (
              <div className="p-3 pt-0">
                <button onClick={markAll}
                  className="w-full py-2.5 rounded-xl text-xs font-black transition hover:opacity-90 text-white"
                  style={{ background: '#2a9d8f' }}>
                  ✓ Mark all as read
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm" style={{ color: '#1d3557' }}>
                {filter === 'all' ? 'All Notifications' : (typeCfg[filter]?.label || filter)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#e8f0f7', color: '#6b7a8d' }}>
                {filtered.length}
              </span>
              {showUnreadOnly && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#fef2f2', color: '#e63946', border: '1px solid #fecaca' }}>
                  Unread only
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#2a9d8f' }} />
              Live
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#457b9d] border-t-transparent animate-spin" />
              <span className="text-sm" style={{ color: '#6b7a8d' }}>Loading notifications…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-2xl" style={{ border: '2px dashed #d0dce8' }}>
              <div className="text-6xl mb-4">{showUnreadOnly ? '🎉' : '🔔'}</div>
              <div className="font-black text-xl text-[#1d3557] mb-2">
                {showUnreadOnly ? 'All caught up!' : 'No notifications'}
              </div>
              <div className="text-sm" style={{ color: '#6b7a8d' }}>
                {showUnreadOnly ? 'No unread notifications' : filter === 'all' ? 'Nothing here yet' : `No ${typeCfg[filter]?.label || filter} notifications`}
              </div>
              {showUnreadOnly && (
                <button onClick={() => setShowUnreadOnly(false)} className="mt-4 text-sm font-bold hover:underline" style={{ color: '#457b9d' }}>
                  Show all notifications
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(({ label, items }) => (
                <div key={label}>
                  {/* Date divider */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                    <span className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider"
                      style={{ background: label === 'Today' ? '#1d3557' : '#f1f5f9', color: label === 'Today' ? '#fff' : '#94a3b8' }}>
                      {label}
                    </span>
                    <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                  </div>

                  <div className="space-y-2">
                    {items.map(n => {
                      const cfg = typeCfg[n.type] || typeCfg.default;
                      return (
                        <div key={n.id}
                          onClick={() => handleClick(n)}
                          className="group relative flex items-start gap-4 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-px"
                          style={{
                            background: n.is_read ? '#fff' : cfg.bg,
                            border: `1.5px solid ${n.is_read ? '#e2e8f0' : cfg.border}`,
                            borderLeft: `4px solid ${n.is_read ? '#e2e8f0' : cfg.accent}`,
                          }}>

                          {/* Icon */}
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
                            style={{ background: n.is_read ? '#f8fafc' : cfg.bg, border: `1.5px solid ${n.is_read ? '#e2e8f0' : cfg.border}` }}>
                            {cfg.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                                  style={{ background: n.is_read ? '#f1f5f9' : cfg.bg, color: n.is_read ? '#94a3b8' : cfg.color, border: `1px solid ${n.is_read ? '#e2e8f0' : cfg.border}` }}>
                                  {cfg.label}
                                </span>
                                {!n.is_read && (
                                  <span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{ background: '#e63946' }}>
                                    New
                                  </span>
                                )}
                              </div>
                              <span className="text-xs flex-shrink-0 font-medium" style={{ color: '#94a3b8' }}>
                                {timeAgo(n.created_at)}
                              </span>
                            </div>

                            <div className="font-bold text-sm mb-0.5" style={{ color: n.is_read ? '#475569' : '#1d3557' }}>
                              {n.title}
                            </div>
                            {n.body && (
                              <div className="text-xs leading-relaxed" style={{ color: '#6b7a8d' }}>{n.body}</div>
                            )}

                            {n.link && (
                              <div className="flex items-center gap-1 mt-2 text-xs font-bold" style={{ color: cfg.color }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                                View details →
                              </div>
                            )}
                          </div>

                          {/* Actions — visible on hover */}
                          <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                            {!n.is_read && (
                              <button onClick={e => { e.stopPropagation(); markRead(n.id); }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition hover:opacity-90"
                                title="Mark as read"
                                style={{ background: '#f0fdf9', color: '#0f766e', border: '1px solid #99f6e4' }}>
                                ✓
                              </button>
                            )}
                            <button onClick={e => deleteNotif(e, n.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition hover:bg-red-50"
                              title="Delete"
                              style={{ color: '#e63946', border: '1px solid #fecaca' }}>
                              🗑
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
