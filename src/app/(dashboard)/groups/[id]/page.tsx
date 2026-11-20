'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';

interface Member { id: number; name: string; email: string; role: string }
interface Group { id: number; name: string; description: string; is_private: boolean; owner_id: number; members: Member[] }
interface Message { id: number; content: string; sender_name: string; created_at: string }

const avatarBgs = ['#f43f5e', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#eab308'];


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

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'chat' | 'meetings'>('overview');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [myId, setMyId] = useState(0);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatLoaded, setChatLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showMeeting, setShowMeeting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ purpose: '', is_instant: true, scheduled_at: '' });
  const [meetingLoading, setMeetingLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch(`/api/groups/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.id) setGroup(d); })
      .finally(() => setLoading(false));
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => d?.id && setMyId(d.id));
  }, [id]);

  useEffect(() => {
    if (tab === 'chat' && !chatLoaded) loadChat();
  }, [tab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChat() {
    setChatLoading(true);
    const res = await fetch(`/api/groups/${id}/chat`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) { setMessages(data.messages || []); setChatLoaded(true); }
    setChatLoading(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const res = await fetch(`/api/groups/${id}/chat`, { method: 'POST', headers: auth, body: JSON.stringify({ content: newMsg }) });
    const data = await res.json();
    if (res.ok) {
      setMessages(m => [...m, { id: data.id, content: newMsg, sender_name: 'You', created_at: new Date().toISOString() }]);
      setNewMsg('');
    }
  }

  async function deleteGroup() {
    setDeleting(true);
    await fetch(`/api/groups?id=${id}`, { method: 'DELETE', headers: auth });
    setDeleting(false);
    router.push('/groups');
  }

  async function scheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    setMeetingLoading(true);
    const res = await fetch(`/api/groups/${id}/meetings`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ purpose: meetingForm.purpose, is_instant: meetingForm.is_instant, scheduled_at: meetingForm.scheduled_at }),
    });
    if (res.ok) {
      setShowMeeting(false);
      setMeetingForm({ purpose: '', is_instant: true, scheduled_at: '' });
      setChatLoaded(false);
      const r2 = await fetch(`/api/groups/${id}/chat`, { headers: { Authorization: `Bearer ${token}` } });
      const d2 = await r2.json();
      if (r2.ok) { setMessages(d2.messages || []); setChatLoaded(true); }
      setTab('chat');
    }
    setMeetingLoading(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 12rem)' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--link)] border-t-transparent animate-spin mx-auto mb-3" />
        <div className="text-sm text-[var(--text-muted)]">Loading group…</div>
      </div>
    </div>
  );

  if (!group) return (
    <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 12rem)' }}>
      <div className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <div className="font-black text-[var(--text)] mb-3">Group not found</div>
        <button onClick={() => router.push('/groups')} className="text-sm font-bold text-[var(--link)] hover:underline">← Back to Groups</button>
      </div>
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 10rem)', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── TOP HEADER BAR ── */}
      <div className="rounded-2xl overflow-hidden flex-shrink-0 mb-4" style={{ background: 'var(--primary)' }}>
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">

          {/* Left: back + group info */}
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/groups')}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition flex-shrink-0">
              ←
            </button>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
              style={{ background: 'var(--link)' }}>
              {group.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-tight">{group.name}</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-white/50">{group.is_private ? '🔒 Private' : '🌐 Public'}</span>
                <span className="text-xs text-white/50">👥 {group.members.length} members</span>
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('chat')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition"
              style={tab === 'chat'
                ? { background: 'var(--link)', color: '#fff' }
                : { background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              💬 Group Chat
            </button>
            <button onClick={() => setShowMeeting(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition"
              style={{ background: 'var(--success)', color: '#fff' }}>
              📅 Create Meeting
            </button>
            {group.owner_id === myId && (
              <button onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition"
                style={{ background: 'rgba(244,63,94,0.15)', color: '#fca5a5', border: '1px solid rgba(244,63,94,0.3)' }}>
                🗑 Delete
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {([
            { key: 'overview', label: '🏠 Overview' },
            { key: 'chat', label: '💬 Group Chat' },
            { key: 'meetings', label: '📅 Meetings' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-5 py-3 text-sm font-bold transition"
              style={{
                color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: tab === t.key ? '2px solid var(--link)' : '2px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Description */}
            <div className="md:col-span-2 bg-surface rounded-2xl p-6" style={{ border: '1px solid var(--border)' }}>
              <div className="font-black text-[var(--text)] mb-3">About this group</div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {group.description || 'No description provided.'}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => setTab('chat')}
                  className="flex items-center gap-3 p-4 rounded-xl hover:opacity-90 transition text-left"
                  style={{ background: 'var(--info-soft)', border: '1.5px solid var(--info-soft)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'var(--link)' }}>💬</div>
                  <div>
                    <div className="font-bold text-sm text-[var(--info-text)]">Open Chat</div>
                    <div className="text-xs text-[var(--text-muted)]">Message the group</div>
                  </div>
                </button>
                <button onClick={() => setShowMeeting(true)}
                  className="flex items-center gap-3 p-4 rounded-xl hover:opacity-90 transition text-left"
                  style={{ background: 'var(--success-soft)', border: '1.5px solid var(--success-soft)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'var(--success)' }}>📅</div>
                  <div>
                    <div className="font-bold text-sm text-[var(--success-text)]">Create Meeting</div>
                    <div className="text-xs text-[var(--text-muted)]">Schedule & notify</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Members */}
            <div className="bg-surface rounded-2xl p-6" style={{ border: '1px solid var(--border)' }}>
              <div className="font-black text-[var(--text)] mb-4">👥 Members ({group.members.length})</div>
              <div className="space-y-3">
                {group.members.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                      style={{ background: avatarBgs[i % avatarBgs.length] }}>
                      {m.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[var(--text)] truncate">{m.name}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate">{m.email}</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg capitalize flex-shrink-0"
                      style={{
                        background: m.role === 'owner' ? 'var(--danger-soft)' : 'var(--bg)',
                        color: m.role === 'owner' ? 'var(--accent)' : 'var(--success)',
                      }}>
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CHAT TAB ── */}
      {tab === 'chat' && (
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', minHeight: 0 }}>

          {/* Chat top bar */}
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-surface" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
                style={{ background: 'var(--link)' }}>
                {group.name[0].toUpperCase()}
              </div>
              <div>
                <div className="font-black text-[var(--text)] text-sm">{group.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{group.members.length} members · Group Chat</div>
              </div>
            </div>
            <button onClick={() => setShowMeeting(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
              style={{ background: 'var(--success)' }}>
              📅 Schedule Meeting
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--surface-2)' }}>
            {chatLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 rounded-full border-2 border-[var(--link)] border-t-transparent animate-spin" />
              </div>
            )}
            {!chatLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                  style={{ background: 'var(--info-soft)' }}>💬</div>
                <div className="font-black text-[var(--text)] mb-1">No messages yet</div>
                <div className="text-sm text-[var(--text-muted)]">Be the first to say something!</div>
              </div>
            )}
            {messages.map((m, i) => {
              const isMe = m.sender_name === 'You';
              const isMeeting = m.content.startsWith('📅 MEETING SCHEDULED');

              if (isMeeting) return (
                <div key={m.id} className="mx-auto max-w-md">
                  <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1.5px solid var(--success-soft)' }}>
                    <div className="px-4 py-2 flex items-center gap-2" style={{ background: 'var(--success)' }}>
                      <span className="text-white text-xs font-black">📅 MEETING SCHEDULED</span>
                    </div>
                    <div className="p-4 bg-surface">
                      <pre className="whitespace-pre-wrap font-sans text-[var(--text)] text-xs leading-relaxed">
                        {m.content.split('\n').slice(2).join('\n')}
                      </pre>
                      <div className="text-xs text-[var(--text-muted)] mt-2 text-right">
                        {fmtT(m.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              );

              return (
                <div key={m.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: avatarBgs[i % avatarBgs.length] }}>
                    {m.sender_name[0]}
                  </div>
                  <div className={`flex flex-col max-w-sm ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-[var(--text)]">{m.sender_name}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {fmtT(m.created_at)}
                      </span>
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={isMe
                        ? { background: 'var(--primary)', color: '#fff', borderBottomRightRadius: 4 }
                        : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderBottomLeftRadius: 4 }}>
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <form onSubmit={sendMessage} className="flex gap-3 p-3 flex-shrink-0 bg-surface" style={{ borderTop: '1px solid var(--border)' }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
              placeholder={`Message ${group.name}…`} required
              className="flex-1 rounded-xl px-4 py-2.5 text-[var(--text)] text-sm focus:outline-none"
              style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }} />
            <button type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
              style={{ background: 'var(--primary)' }}>
              Send
            </button>
          </form>
        </div>
      )}

      {/* ── MEETINGS TAB ── */}
      {tab === 'meetings' && (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5"
            style={{ background: 'var(--success-soft)', border: '2px solid var(--success-soft)' }}>📅</div>
          <div className="font-black text-[var(--text)] text-lg mb-2">Schedule a Meeting</div>
          <div className="text-sm text-[var(--text-muted)] mb-6 text-center max-w-xs">
            Create a meeting for <span className="font-bold text-[var(--text)]">{group.name}</span>. The link will be automatically posted in the group chat.
          </div>
          <button onClick={() => setShowMeeting(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
            style={{ background: 'var(--success)' }}>
            📅 Create Meeting
          </button>
        </div>
      )}

      {/* ── CREATE MEETING MODAL ── */}
      {showMeeting && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>

            {/* Modal header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'var(--primary)' }}>
              <div>
                <div className="font-black text-white">Create Meeting</div>
                <div className="text-xs text-white/50 mt-0.5">for {group.name}</div>
              </div>
              <button onClick={() => setShowMeeting(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition">
                ✕
              </button>
            </div>

            <form onSubmit={scheduleMeeting} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text)] mb-1.5">Meeting Purpose *</label>
                <textarea placeholder="e.g. Weekly sync, Sprint planning, Design review…"
                  value={meetingForm.purpose}
                  onChange={e => setMeetingForm(f => ({ ...f, purpose: e.target.value }))}
                  rows={3} required
                  className="w-full rounded-xl px-4 py-3 text-[var(--text)] text-sm focus:outline-none resize-none"
                  style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }} />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--text)] mb-2">When?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setMeetingForm(f => ({ ...f, is_instant: true }))}
                    className="py-3 rounded-xl font-bold text-sm transition"
                    style={meetingForm.is_instant
                      ? { background: 'var(--primary)', color: '#fff', border: '1.5px solid var(--primary)' }
                      : { background: 'var(--surface-2)', color: 'var(--text)', border: '1.5px solid var(--border)' }}>
                    ⚡ Start Now
                  </button>
                  <button type="button" onClick={() => setMeetingForm(f => ({ ...f, is_instant: false }))}
                    className="py-3 rounded-xl font-bold text-sm transition"
                    style={!meetingForm.is_instant
                      ? { background: 'var(--primary)', color: '#fff', border: '1.5px solid var(--primary)' }
                      : { background: 'var(--surface-2)', color: 'var(--text)', border: '1.5px solid var(--border)' }}>
                    🗓 Schedule Later
                  </button>
                </div>
              </div>

              {!meetingForm.is_instant && (
                <div>
                  <label className="block text-sm font-bold text-[var(--text)] mb-1.5">Date & Time *</label>
                  <input type="datetime-local" value={meetingForm.scheduled_at}
                    onChange={e => setMeetingForm(f => ({ ...f, scheduled_at: e.target.value }))}
                    required
                    className="w-full rounded-xl px-4 py-3 text-[var(--text)] text-sm focus:outline-none"
                    style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }} />
                </div>
              )}

              <div className="flex items-center gap-2 rounded-xl p-3 text-xs text-[var(--success-text)] font-medium"
                style={{ background: 'var(--success-soft)', border: '1px solid var(--success-soft)' }}>
                📨 Meeting link will be auto-posted in the group chat.
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={meetingLoading}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 disabled:opacity-50 transition"
                  style={{ background: 'var(--success)' }}>
                  {meetingLoading ? 'Creating…' : '📅 Create Meeting'}
                </button>
                <button type="button" onClick={() => setShowMeeting(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition"
                  style={{ border: '1.5px solid var(--border)' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Delete Group"
          message={`Delete "${group?.name}"? This will remove all members and cannot be undone.`}
          onConfirm={deleteGroup}
          onCancel={() => setDeleteConfirm(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
