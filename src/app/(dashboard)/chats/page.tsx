'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWebSocket, sendWS } from '@/lib/ws-client';

interface Chat {
  id: number;
  type: string;
  name: string;
  other_user_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  created_at: string;
}

interface Connection {
  user_id: number;
  name: string;
  email: string;
  status: string;
}

const avatarBgs = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#6d6875', '#e9c46a'];
function avatarBg(name: string) {
  return avatarBgs[(name?.charCodeAt(0) || 0) % avatarBgs.length];
}

function timeAgo(dateStr: string) {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ChatsPage() {
  const router = useRouter();

  // Auth — read from localStorage inside effects only (avoid SSR issues)
  const tokenRef = useRef('');
  const myIdRef = useRef(0);
  const myNameRef = useRef('');

  const [token, setToken] = useState('');
  const [myId, setMyId] = useState(0);
  const [myName, setMyName] = useState('');

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [activeName, setActiveName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // New chat modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connSearch, setConnSearch] = useState('');
  const [startingChat, setStartingChat] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const activeChatRef = useRef<number | null>(null);

  // Step 1: Read token + user info from localStorage (client only)
  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    if (!t) { router.push('/login'); return; }

    // Decode JWT for user id
    try {
      const payload = JSON.parse(atob(t.split('.')[1]));
      const id = payload.id || 0;
      myIdRef.current = id;
      setMyId(id);
    } catch { /* ignore */ }

    tokenRef.current = t;
    setToken(t);

    // Fetch user name
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (d?.name) {
          myNameRef.current = d.name;
          setMyName(d.name);
        }
      });
  }, [router]);

  // Step 2: Load chats once token is ready
  useEffect(() => {
    if (!token) return;
    fetchChats(token);
  }, [token]);

  function fetchChats(t: string, autoOpenId?: number) {
    setLoadingChats(true);
    fetch('/api/chats', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) return;
        const direct = d.filter((c: Chat) => c.type === 'direct');
        setChats(direct);

        // Auto-open from sessionStorage or passed id
        const openId = autoOpenId ?? Number(sessionStorage.getItem('openChatId') || 0);
        if (openId) {
          sessionStorage.removeItem('openChatId');
          const chat = direct.find((c: Chat) => c.id === openId);
          if (chat) selectChat(chat, t);
        }
      })
      .finally(() => setLoadingChats(false));
  }

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket
  const handleWS = useCallback((msg: Record<string, unknown>) => {
    const chatId = Number(msg.chat_id);

    if (msg.type === 'chat_message') {
      // Append to active chat
      if (chatId === activeChatRef.current) {
        setMessages(prev => {
          if (prev.some(m => m.id === (msg.id as number))) return prev;
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

      // Update sidebar
      setChats(prev => {
        const exists = prev.some(c => c.id === chatId);
        if (!exists) return prev;
        const updated = prev.map(c => c.id === chatId ? {
          ...c,
          last_message: msg.content as string,
          last_message_at: msg.created_at as string,
          unread_count: chatId === activeChatRef.current ? 0 : c.unread_count + 1,
        } : c);
        const idx = updated.findIndex(c => c.id === chatId);
        if (idx > 0) { const [item] = updated.splice(idx, 1); updated.unshift(item); }
        return updated;
      });
    }

    if (msg.type === 'typing' && chatId === activeChatRef.current) {
      const name = msg.sender_name as string;
      setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name]);
      setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== name)), 3000);
    }
  }, []);

  useWebSocket(token, handleWS);

  function selectChat(chat: Chat, t?: string) {
    const authToken = t || tokenRef.current;
    if (!authToken) return;

    if (activeChatRef.current) sendWS({ type: 'leave_chat', chat_id: activeChatRef.current });

    const displayName = chat.other_user_name || chat.name || 'User';
    setActiveChat(chat.id);
    activeChatRef.current = chat.id;
    setActiveName(displayName);
    setMessages([]);
    setTypingUsers([]);
    setLoadingMessages(true);

    sendWS({ type: 'join_chat', chat_id: chat.id });

    fetch(`/api/chats/messages?chat_id=${chat.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .finally(() => setLoadingMessages(false));

    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c));
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const t = tokenRef.current;
    if (!newMsg.trim() || !activeChat || sending || !t) return;

    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');

    const res = await fetch('/api/chats/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: activeChat, content }),
    });

    const data = await res.json();
    setSending(false);

    if (res.ok) {
      const me = myIdRef.current;
      const name = myNameRef.current || 'You';
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, { id: data.id, content, sender_id: me, sender_name: name, created_at: new Date().toISOString() }];
      });
      sendWS({ type: 'chat_message', chat_id: activeChat, id: data.id, content, sender_id: me, sender_name: name });
    }
  }

  function handleTyping() {
    if (!activeChat) return;
    sendWS({ type: 'typing', chat_id: activeChat, sender_name: myNameRef.current || 'Someone' });
  }

  function openNewChatModal() {
    setShowNewModal(true);
    setConnSearch('');
    if (connections.length > 0) return;
    const t = tokenRef.current;
    if (!t) return;
    fetch('/api/connections', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setConnections(d.filter((c: Connection) => c.status === 'accepted'));
      });
  }

  async function startNewChat(userId: number) {
    const t = tokenRef.current;
    if (!t) return;
    setStartingChat(userId);

    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'direct', participant_ids: [userId] }),
    });

    const data = await res.json();
    setStartingChat(null);

    if (res.ok) {
      setShowNewModal(false);
      fetchChats(t, data.id);
    }
  }

  const filteredConns = connections.filter(c =>
    c.name.toLowerCase().includes(connSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(connSearch.toLowerCase())
  );

  return (
    <div className="flex rounded-2xl overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 10rem)', border: '1px solid #d0dce8' }}>

      {/* Sidebar */}
      <div className="w-72 flex flex-col flex-shrink-0" style={{ background: '#1d3557', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div className="font-black text-white">Direct Messages</div>
            <div className="text-xs text-white/40">{chats.length} conversation{chats.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={openNewChatModal}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold hover:bg-white/10 transition"
            style={{ background: '#e63946' }}>+</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="text-3xl mb-3">💬</div>
              <div className="text-sm text-white/40 mb-2">No conversations yet</div>
              <button onClick={openNewChatModal} className="text-xs font-bold hover:underline" style={{ color: '#a8dadc' }}>
                Start a conversation
              </button>
            </div>
          ) : (
            chats.map(chat => {
              const displayName = chat.other_user_name || chat.name || 'User';
              return (
                <button key={chat.id} onClick={() => selectChat(chat)}
                  className="w-full text-left px-4 py-3.5 flex items-center gap-3 transition hover:bg-white/5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: activeChat === chat.id ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                    style={{ background: avatarBg(displayName) }}>
                    {displayName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-bold text-white truncate">{displayName}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {chat.last_message_at && (
                          <span className="text-xs text-white/30">{timeAgo(chat.last_message_at)}</span>
                        )}
                        {chat.unread_count > 0 && (
                          <span className="text-xs font-black text-white rounded-full w-5 h-5 flex items-center justify-center"
                            style={{ background: '#2a9d8f', fontSize: '9px' }}>
                            {chat.unread_count > 9 ? '9+' : chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    {chat.last_message && (
                      <div className="text-xs text-white/30 truncate mt-0.5">{chat.last_message}</div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col" style={{ background: '#f1faee' }}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 flex items-center gap-3 bg-white" style={{ borderBottom: '1px solid #d0dce8' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black"
                style={{ background: avatarBg(activeName) }}>
                {activeName[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-black text-[#1d3557] text-sm">{activeName}</div>
                <div className="text-xs" style={{ color: '#6b7a8d' }}>
                  {typingUsers.length > 0
                    ? <span className="font-semibold animate-pulse" style={{ color: '#2a9d8f' }}>{typingUsers.join(', ')} typing…</span>
                    : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#2a9d8f' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#2a9d8f' }} />
                Live
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 rounded-full border-2 border-[#457b9d] border-t-transparent animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: '#6b7a8d' }}>No messages yet. Say hello! 👋</div>
              ) : (
                messages.map(m => {
                  const isMe = m.sender_id === myId;
                  return (
                    <div key={m.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: avatarBg(m.sender_name) }}>
                        {m.sender_name?.[0]?.toUpperCase()}
                      </div>
                      <div className={`flex flex-col max-w-xs ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#1d3557]">{isMe ? 'You' : m.sender_name}</span>
                          <span className="text-xs text-[#6b7a8d]">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                          style={isMe
                            ? { background: '#1d3557', color: '#fff', borderBottomRightRadius: 4 }
                            : { background: '#fff', color: '#1d3557', border: '1px solid #d0dce8', borderBottomLeftRadius: 4 }}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 flex gap-3 bg-white" style={{ borderTop: '1px solid #d0dce8' }}>
              <input
                value={newMsg}
                onChange={e => { setNewMsg(e.target.value); handleTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                placeholder={`Message ${activeName}…`}
                className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}
              />
              <button type="submit" disabled={sending || !newMsg.trim()}
                className="px-5 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 disabled:opacity-40 transition"
                style={{ background: '#1d3557' }}>
                {sending ? '…' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <div className="font-black text-[#1d3557] mb-2">Your Messages</div>
              <div className="text-sm mb-4" style={{ color: '#6b7a8d' }}>Select a conversation or start a new one</div>
              <button onClick={openNewChatModal}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
                style={{ background: '#e63946' }}>
                + New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(15,23,42,0.6)' }}
          onClick={() => setShowNewModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}
            onClick={e => e.stopPropagation()}>

            <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#1d3557' }}>
              <div>
                <div className="font-black text-white">New Conversation</div>
                <div className="text-xs text-white/50">Select a connection to chat with</div>
              </div>
              <button onClick={() => setShowNewModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition">✕</button>
            </div>

            <div className="px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input autoFocus value={connSearch} onChange={e => setConnSearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1d3557' }} />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {connections.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">🔗</div>
                  <div className="font-bold text-sm text-[#1d3557] mb-1">No connections yet</div>
                  <div className="text-xs mb-3" style={{ color: '#6b7a8d' }}>Connect with people first</div>
                  <button onClick={() => { setShowNewModal(false); router.push('/connections'); }}
                    className="text-xs font-bold hover:underline" style={{ color: '#457b9d' }}>
                    Go to Connections →
                  </button>
                </div>
              ) : filteredConns.length === 0 ? (
                <div className="py-10 text-center text-sm" style={{ color: '#94a3b8' }}>No results for &ldquo;{connSearch}&rdquo;</div>
              ) : (
                filteredConns.map(conn => (
                  <button key={conn.user_id} onClick={() => startNewChat(conn.user_id)}
                    disabled={startingChat === conn.user_id}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#f8fafc] transition disabled:opacity-50 text-left"
                    style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black flex-shrink-0"
                      style={{ background: avatarBg(conn.name) }}>
                      {conn.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-[#1d3557] truncate">{conn.name}</div>
                      <div className="text-xs truncate" style={{ color: '#94a3b8' }}>{conn.email}</div>
                    </div>
                    {startingChat === conn.user_id ? (
                      <div className="w-5 h-5 rounded-full border-2 border-[#457b9d] border-t-transparent animate-spin flex-shrink-0" />
                    ) : (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                        style={{ background: '#1d3557' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Chat
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
