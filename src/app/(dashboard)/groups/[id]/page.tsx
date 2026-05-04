'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';

interface Member { id: number; name: string; email: string; role: string }
interface Group { id: number; name: string; description: string; is_private: boolean; owner_id: number; members: Member[] }
interface Message { id: number; content: string; sender_name: string; created_at: string }

const avatarBgs = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#6d6875', '#e9c46a'];


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
        <div className="w-10 h-10 rounded-full border-4 border-[#457b9d] border-t-transparent animate-spin mx-auto mb-3" />
        <div className="text-sm text-[#6b7a8d]">Loading group…</div>
      </div>
    </div>
  );

  if (!group) return (
    <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 12rem)' }}>
      <div className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <div className="font-black text-[#1d3557] mb-3">Group not found</div>
        <button onClick={() => router.push('/groups')} className="text-sm font-bold text-[#457b9d] hover:underline">← Back to Groups</button>
      </div>
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 10rem)', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── TOP HEADER BAR ── */}
      <div className="rounded-2xl overflow-hidden flex-shrink-0 mb-4" style={{ background: '#1d3557' }}>
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">

          {/* Left: back + group info */}
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/groups')}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition flex-shrink-0">
              ←
            </button>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
              style={{ background: '#457b9d' }}>
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
                ? { background: '#457b9d', color: '#fff' }
                : { background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              💬 Group Chat
            </button>
            <button onClick={() => setShowMeeting(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition"
              style={{ background: '#2a9d8f', color: '#fff' }}>
              📅 Create Meeting
            </button>
            {group.owner_id === myId && (
              <button onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition"
                style={{ background: 'rgba(230,57,70,0.15)', color: '#fca5a5', border: '1px solid rgba(230,57,70,0.3)' }}>
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
                borderBottom: tab === t.key ? '2px solid #457b9d' : '2px solid transparent',
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
            <div className="md:col-span-2 bg-white rounded-2xl p-6" style={{ border: '1px solid #d0dce8' }}>
              <div className="font-black text-[#1d3557] mb-3">About this group</div>
              <p className="text-sm text-[#6b7a8d] leading-relaxed">
                {group.description || 'No description provided.'}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => setTab('chat')}
                  className="flex items-center gap-3 p-4 rounded-xl hover:opacity-90 transition text-left"
                  style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: '#457b9d' }}>💬</div>
                  <div>
                    <div className="font-bold text-sm text-[#1d4ed8]">Open Chat</div>
                    <div className="text-xs text-[#6b7a8d]">Message the group</div>
                  </div>
                </button>
                <button onClick={() => setShowMeeting(true)}
                  className="flex items-center gap-3 p-4 rounded-xl hover:opacity-90 transition text-left"
                  style={{ background: '#f0fdf9', border: '1.5px solid #99f6e4' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: '#2a9d8f' }}>📅</div>
                  <div>
                    <div className="font-bold text-sm text-[#0f766e]">Create Meeting</div>
                    <div className="text-xs text-[#6b7a8d]">Schedule & notify</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Members */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #d0dce8' }}>
              <div className="font-black text-[#1d3557] mb-4">👥 Members ({group.members.length})</div>
              <div className="space-y-3">
                {group.members.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                      style={{ background: avatarBgs[i % avatarBgs.length] }}>
                      {m.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#1d3557] truncate">{m.name}</div>
                      <div className="text-xs text-[#6b7a8d] truncate">{m.email}</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg capitalize flex-shrink-0"
                      style={{
                        background: m.role === 'owner' ? '#fef2f2' : '#f1faee',
                        color: m.role === 'owner' ? '#e63946' : '#2a9d8f',
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
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ border: '1px solid #d0dce8', minHeight: 0 }}>

          {/* Chat top bar */}
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 bg-white" style={{ borderBottom: '1px solid #d0dce8' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
                style={{ background: '#457b9d' }}>
                {group.name[0].toUpperCase()}
              </div>
              <div>
                <div className="font-black text-[#1d3557] text-sm">{group.name}</div>
                <div className="text-xs text-[#6b7a8d]">{group.members.length} members · Group Chat</div>
              </div>
            </div>
            <button onClick={() => setShowMeeting(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
              style={{ background: '#2a9d8f' }}>
              📅 Schedule Meeting
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#f8fafc' }}>
            {chatLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 rounded-full border-2 border-[#457b9d] border-t-transparent animate-spin" />
              </div>
            )}
            {!chatLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                  style={{ background: '#eff6ff' }}>💬</div>
                <div className="font-black text-[#1d3557] mb-1">No messages yet</div>
                <div className="text-sm text-[#6b7a8d]">Be the first to say something!</div>
              </div>
            )}
            {messages.map((m, i) => {
              const isMe = m.sender_name === 'You';
              const isMeeting = m.content.startsWith('📅 MEETING SCHEDULED');

              if (isMeeting) return (
                <div key={m.id} className="mx-auto max-w-md">
                  <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1.5px solid #99f6e4' }}>
                    <div className="px-4 py-2 flex items-center gap-2" style={{ background: '#2a9d8f' }}>
                      <span className="text-white text-xs font-black">📅 MEETING SCHEDULED</span>
                    </div>
                    <div className="p-4 bg-white">
                      <pre className="whitespace-pre-wrap font-sans text-[#1d3557] text-xs leading-relaxed">
                        {m.content.split('\n').slice(2).join('\n')}
                      </pre>
                      <div className="text-xs text-[#6b7a8d] mt-2 text-right">
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
                      <span className="text-xs font-bold text-[#1d3557]">{m.sender_name}</span>
                      <span className="text-xs text-[#6b7a8d]">
                        {fmtT(m.created_at)}
                      </span>
                    </div>
                    <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={isMe
                        ? { background: '#1d3557', color: '#fff', borderBottomRightRadius: 4 }
                        : { background: '#fff', color: '#1d3557', border: '1px solid #e2e8f0', borderBottomLeftRadius: 4 }}>
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <form onSubmit={sendMessage} className="flex gap-3 p-3 flex-shrink-0 bg-white" style={{ borderTop: '1px solid #d0dce8' }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
              placeholder={`Message ${group.name}…`} required
              className="flex-1 rounded-xl px-4 py-2.5 text-[#1d3557] text-sm focus:outline-none"
              style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }} />
            <button type="submit"
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
              style={{ background: '#1d3557' }}>
              Send
            </button>
          </form>
        </div>
      )}

      {/* ── MEETINGS TAB ── */}
      {tab === 'meetings' && (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl"
          style={{ border: '1px solid #d0dce8', background: '#fff' }}>
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-5"
            style={{ background: '#f0fdf9', border: '2px solid #99f6e4' }}>📅</div>
          <div className="font-black text-[#1d3557] text-lg mb-2">Schedule a Meeting</div>
          <div className="text-sm text-[#6b7a8d] mb-6 text-center max-w-xs">
            Create a meeting for <span className="font-bold text-[#1d3557]">{group.name}</span>. The link will be automatically posted in the group chat.
          </div>
          <button onClick={() => setShowMeeting(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
            style={{ background: '#2a9d8f' }}>
            📅 Create Meeting
          </button>
        </div>
      )}

      {/* ── CREATE MEETING MODAL ── */}
      {showMeeting && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>

            {/* Modal header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: '#1d3557' }}>
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
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Meeting Purpose *</label>
                <textarea placeholder="e.g. Weekly sync, Sprint planning, Design review…"
                  value={meetingForm.purpose}
                  onChange={e => setMeetingForm(f => ({ ...f, purpose: e.target.value }))}
                  rows={3} required
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none resize-none"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }} />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-2">When?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setMeetingForm(f => ({ ...f, is_instant: true }))}
                    className="py-3 rounded-xl font-bold text-sm transition"
                    style={meetingForm.is_instant
                      ? { background: '#1d3557', color: '#fff', border: '1.5px solid #1d3557' }
                      : { background: '#f8fafc', color: '#1d3557', border: '1.5px solid #e2e8f0' }}>
                    ⚡ Start Now
                  </button>
                  <button type="button" onClick={() => setMeetingForm(f => ({ ...f, is_instant: false }))}
                    className="py-3 rounded-xl font-bold text-sm transition"
                    style={!meetingForm.is_instant
                      ? { background: '#1d3557', color: '#fff', border: '1.5px solid #1d3557' }
                      : { background: '#f8fafc', color: '#1d3557', border: '1.5px solid #e2e8f0' }}>
                    🗓 Schedule Later
                  </button>
                </div>
              </div>

              {!meetingForm.is_instant && (
                <div>
                  <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Date & Time *</label>
                  <input type="datetime-local" value={meetingForm.scheduled_at}
                    onChange={e => setMeetingForm(f => ({ ...f, scheduled_at: e.target.value }))}
                    required
                    className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }} />
                </div>
              )}

              <div className="flex items-center gap-2 rounded-xl p-3 text-xs text-[#0f766e] font-medium"
                style={{ background: '#f0fdf9', border: '1px solid #99f6e4' }}>
                📨 Meeting link will be auto-posted in the group chat.
              </div>

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={meetingLoading}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 disabled:opacity-50 transition"
                  style={{ background: '#2a9d8f' }}>
                  {meetingLoading ? 'Creating…' : '📅 Create Meeting'}
                </button>
                <button type="button" onClick={() => setShowMeeting(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1d3557] hover:bg-[#f8fafc] transition"
                  style={{ border: '1.5px solid #e2e8f0' }}>
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
