'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Notification { id: number; type: string; title: string; body: string; link: string; is_read: boolean; created_at: string }

const typeCfg: Record<string, { icon: string; bg: string; border: string; iconBg: string }> = {
  connection:        { icon: '🔗', bg: '#fff7ed', border: '#fed7aa', iconBg: '#ffedd5' },
  project:           { icon: '📋', bg: '#f0fdf9', border: '#99f6e4', iconBg: '#ccfbf1' },
  task:              { icon: '✅', bg: '#eff6ff', border: '#bfdbfe', iconBg: '#dbeafe' },
  message:           { icon: '💬', bg: '#f0f9ff', border: '#bae6fd', iconBg: '#e0f2fe' },
  group_invitation:  { icon: '✉️', bg: '#faf5ff', border: '#e9d5ff', iconBg: '#f3e8ff' },
  organization:      { icon: '🏢', bg: '#faf5ff', border: '#e9d5ff', iconBg: '#f3e8ff' },
  default:           { icon: '🔔', bg: '#f1faee', border: '#d0dce8', iconBg: '#e8f4f8' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) && setNotifications(d));
  }, []);

  async function markAll() {
    await fetch('/api/notifications', { method: 'PUT', headers, body: JSON.stringify({}) });
    setNotifications(n => n.map(notif => ({ ...notif, is_read: true })));
  }

  async function handleClick(n: Notification) {
    if (!n.is_read) {
      await fetch('/api/notifications', { method: 'PUT', headers, body: JSON.stringify({ id: n.id }) });
      setNotifications(ns => ns.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.link) router.push(n.link);
  }

  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[#6b7a8d] text-sm">{unread > 0 ? `${unread} unread` : 'All caught up!'}</p>
        {unread > 0 && (
          <button onClick={markAll} className="px-4 py-2 text-sm font-bold rounded-xl transition hover:opacity-90"
            style={{ background: '#f1faee', color: '#2a9d8f', border: '1.5px solid #99f6e4' }}>
            Mark all read ✓
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map(n => {
          const cfg = typeCfg[n.type] || typeCfg.default;
          return (
            <div key={n.id} onClick={() => handleClick(n)}
              className="rounded-2xl p-5 cursor-pointer transition hover:shadow-sm"
              style={{ background: n.is_read ? '#fff' : cfg.bg, border: `1.5px solid ${n.is_read ? '#d0dce8' : cfg.border}`, opacity: n.is_read ? 0.65 : 1 }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: n.is_read ? '#f1faee' : cfg.iconBg }}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold text-[#1d3557] text-sm">{n.title}</div>
                    {!n.is_read && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ background: '#e63946' }} />}
                  </div>
                  {n.body && <div className="text-sm text-[#6b7a8d] mt-1 leading-relaxed">{n.body}</div>}
                  <div className="text-xs text-[#94a3b8] mt-2">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && (
          <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '2px dashed #d0dce8' }}>
            <div className="text-5xl mb-4">🔔</div>
            <div className="font-black text-[#1d3557] mb-2">All caught up!</div>
            <div className="text-[#6b7a8d] text-sm">No notifications at the moment</div>
          </div>
        )}
      </div>
    </div>
  );
}
