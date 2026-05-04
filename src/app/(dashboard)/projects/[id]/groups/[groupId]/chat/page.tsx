'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';
import { useWebSocket, sendWS } from '@/lib/ws-client';

interface Message { id: number; content: string; sender_name: string; sender_id?: number; created_at: string }
interface Group { id: number; name: string; project_id: number; chat_id?: number }

const avatarBgs = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#6d6875', '#e9c46a'];
function getAvatarBg(name: string) { return avatarBgs[name.charCodeAt(0) % avatarBgs.length]; }

export default function GroupChatPage() {
  const { id, groupId } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [myName, setMyName] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatIdRef = useRef<number | null>(null);
  const token = getToken();
  const myId = getTokenUserId();

  useEffect(() => {
    if (!token || !myId) { router.replace('/login'); return; }

    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d?.name) setMyName(d.name); });

    fetch(`/api/project-groups?id=${groupId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async grp => {
        if (!grp?.id) { setAccessDenied(true); setLoading(false); return; }
        setGroup(grp);

        const grpMembersRes = await fetch(`/api/project-groups/members?group_id=${grp.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const grpMembers = await grpMembersRes.json();
        if (!Array.isArray(grpMembers) || !grpMembers.find((m: { id: number }) => m.id === myId)) {
          setAccessDenied(true); setLoading(false); return;
        }

        fetch(`/api/project-groups/chat?group_id=${grp.id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => {
            if (d.messages) setMessages(d.messages);
            if (d.chat_id) {
              chatIdRef.current = d.chat_id;
              sendWS({ type: 'join_chat', chat_id: d.chat_id });
            }
          })
          .finally(() => setLoading(false));
      })
      .catch(() => { setAccessDenied(true); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket handler
  const handleWS = useCallback((msg: Record<string, unknown>) => {
    if (msg.type === 'chat_message' && chatIdRef.current && Number(msg.chat_id) === chatIdRef.current) {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, {
          id: msg.id as number,
          content: msg.content as string,
          sender_id: msg.sender_id as number,
          sender_name: msg.sender_name as string,
          created_at: msg.created_at as string,
        }];
      });
      setTypingUsers([]);
    }
    if (msg.type === 'typing' && chatIdRef.current && Number(msg.chat_id) === chatIdRef.current) {
      const name = msg.sender_name as string;
      setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name]);
      setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== name)), 3000);
    }
  }, []);

  useWebSocket(token, handleWS);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !group || sending) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');

    const res = await fetch('/api/project-groups/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: group.id, content }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok && chatIdRef.current) {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, { id: data.id || Date.now(), content, sender_id: myId, sender_name: myName || 'You', created_at: new Date().toISOString() }];
      });
      sendWS({ type: 'chat_message', chat_id: chatIdRef.current, id: data.id, content, sender_name: myName || 'You' });
    }
  }

  function handleTyping() {
    if (!chatIdRef.current) return;
    sendWS({ type: 'typing', chat_id: chatIdRef.current, sender_name: myName || 'Someone' });
  }

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <div className="font-black text-xl text-[#1d3557] mb-2">Access Denied</div>
      <div className="text-sm text-[#6b7a8d] mb-6">You are not a member of this group.</div>
      <button onClick={() => router.push('/projects')}
        className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90"
        style={{ background: '#1d3557' }}>← Back to Projects</button>
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 10rem)', display: 'flex', flexDirection: 'column' }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-4 flex-shrink-0" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557]">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[#1d3557]">Overview</Link>
        <span>/</span>
        <Link href={`/projects/${id}/groups`} className="hover:text-[#1d3557]">Groups</Link>
        <span>/</span>
        <Link href={`/projects/${id}/groups/${groupId}`} className="hover:text-[#1d3557]">{group?.name || '...'}</Link>
        <span>/</span>
        <span className="font-bold" style={{ color: '#1d3557' }}>Chat</span>
      </div>

      {/* Chat box */}
      <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ border: '1px solid #d0dce8', minHeight: 0 }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0 bg-white" style={{ borderBottom: '1px solid #d0dce8' }}>
          <button onClick={() => router.push(`/projects/${id}/groups/${groupId}`)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#6b7a8d] hover:bg-[#f1f5f9] transition">←</button>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black"
            style={{ background: '#457b9d' }}>💬</div>
          <div className="flex-1">
            <div className="font-black text-[#1d3557] text-sm">{group?.name || 'Group Chat'}</div>
            <div className="text-xs" style={{ color: '#6b7a8d' }}>
              {typingUsers.length > 0
                ? <span className="text-[#2a9d8f] font-semibold animate-pulse">{typingUsers.join(', ')} typing…</span>
                : `${messages.length} messages`}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#2a9d8f' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#2a9d8f' }} />
            Live
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: '#f8fafc' }}>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-[#457b9d] border-t-transparent animate-spin" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4" style={{ background: '#eff6ff' }}>💬</div>
              <div className="font-black text-[#1d3557] mb-1">No messages yet</div>
              <div className="text-sm text-[#6b7a8d]">Be the first to say something!</div>
            </div>
          )}
          {messages.map((m) => {
            const isMe = m.sender_id === myId || m.sender_name === 'You';
            const isMeeting = m.content.startsWith('📅 MEETING SCHEDULED');
            const meetingLinkMatch = m.content.match(/https?:\/\/\S+\/meeting\/\S+/);

            if (isMeeting) return (
              <div key={m.id} className="mx-auto w-full max-w-sm">
                <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: '1.5px solid #fed7aa' }}>
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#c2410c' }}>
                    <span className="text-white text-xs font-black">📹 MEETING SCHEDULED</span>
                  </div>
                  <div className="p-4 bg-white space-y-2">
                    {m.content.split('\n').slice(1).filter(l => l && !l.startsWith('━') && !l.startsWith('🔗')).map((line, li) => (
                      <div key={li} className="text-xs text-[#1d3557]">{line}</div>
                    ))}
                    {meetingLinkMatch && (
                      <a href={meetingLinkMatch[0]} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
                        style={{ background: '#2a9d8f' }}>🚀 Join Meeting</a>
                    )}
                    <div className="text-xs text-[#6b7a8d] text-right">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            );

            return (
              <div key={m.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{ background: getAvatarBg(m.sender_name) }}>
                  {m.sender_name[0]?.toUpperCase()}
                </div>
                <div className={`flex flex-col max-w-sm ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-[#1d3557]">{isMe ? 'You' : m.sender_name}</span>
                    <span className="text-xs text-[#6b7a8d]">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

        {/* Input */}
        <form onSubmit={sendMessage} className="flex gap-3 p-3 flex-shrink-0 bg-white" style={{ borderTop: '1px solid #d0dce8' }}>
          <input
            value={newMsg}
            onChange={e => { setNewMsg(e.target.value); handleTyping(); }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
            placeholder={`Message ${group?.name || 'group'}…`}
            className="flex-1 rounded-xl px-4 py-2.5 text-[#1d3557] text-sm focus:outline-none"
            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
          />
          <button type="submit" disabled={sending || !newMsg.trim()}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 disabled:opacity-40 transition"
            style={{ background: '#1d3557' }}>
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
