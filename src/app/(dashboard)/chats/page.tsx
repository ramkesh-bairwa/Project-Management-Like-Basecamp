'use client';
import { useEffect, useState } from 'react';

interface Chat { id: number; type: string; name: string; last_message: string; unread_count: number }
interface Message { id: number; content: string; sender_name: string; created_at: string }

const avatarBgs = ['#e63946','#457b9d','#2a9d8f','#f4a261','#6d6875','#e9c46a'];

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [activeName, setActiveName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newUserId, setNewUserId] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/chats', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) && setChats(d));
  }, []);

  async function openChat(chat: Chat) {
    setActiveChat(chat.id);
    setActiveName(chat.name || `Chat #${chat.id}`);
    const res = await fetch(`/api/chats/messages?chat_id=${chat.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
    setChats(c => c.map(ch => ch.id === chat.id ? { ...ch, unread_count: 0 } : ch));
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeChat) return;
    const res = await fetch('/api/chats/messages', { method: 'POST', headers, body: JSON.stringify({ chat_id: activeChat, content: newMsg }) });
    const data = await res.json();
    if (res.ok) { setMessages(m => [...m, { id: data.id, content: newMsg, sender_name: 'You', created_at: new Date().toISOString() }]); setNewMsg(''); }
  }

  async function startChat(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/chats', { method: 'POST', headers, body: JSON.stringify({ type: 'direct', participant_ids: [Number(newUserId)] }) });
    const data = await res.json();
    if (res.ok) {
      setShowNew(false); setNewUserId('');
      fetch('/api/chats', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => {
        if (Array.isArray(d)) { setChats(d); const c = d.find((ch: Chat) => ch.id === data.id); if (c) openChat(c); }
      });
    }
  }

  return (
    <div className="flex rounded-2xl overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 10rem)', border: '1px solid #d0dce8' }}>
      {/* Sidebar */}
      <div className="w-72 flex flex-col flex-shrink-0" style={{ background: '#1d3557', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div className="font-black text-white">Messages</div>
            <div className="text-xs text-white/40">{chats.length} conversation{chats.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={() => setShowNew(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-lg font-bold hover:bg-white/10 transition" style={{ background: '#e63946' }}>+</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat, i) => (
            <button key={chat.id} onClick={() => openChat(chat)}
              className="w-full text-left px-4 py-3.5 flex items-center gap-3 transition hover:bg-white/5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: activeChat === chat.id ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                style={{ background: avatarBgs[i % avatarBgs.length] }}>
                {chat.type === 'group' ? '👥' : '#'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white truncate">{chat.name || `Chat #${chat.id}`}</span>
                  {chat.unread_count > 0 && (
                    <span className="text-xs font-black text-white rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-1" style={{ background: '#e63946' }}>{chat.unread_count}</span>
                  )}
                </div>
                {chat.last_message && <div className="text-xs text-white/40 truncate mt-0.5">{chat.last_message}</div>}
              </div>
            </button>
          ))}
          {chats.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="text-3xl mb-3">💬</div>
              <div className="text-sm text-white/40">No conversations yet</div>
              <button onClick={() => setShowNew(true)} className="mt-3 text-xs font-bold hover:underline" style={{ color: '#a8dadc' }}>Start one</button>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col" style={{ background: '#f1faee' }}>
        {activeChat ? (
          <>
            <div className="px-6 py-4 flex items-center gap-3 bg-white" style={{ borderBottom: '1px solid #d0dce8' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black" style={{ background: '#457b9d' }}>#</div>
              <div>
                <div className="font-black text-[#1d3557] text-sm">{activeName}</div>
                <div className="text-xs text-[#6b7a8d]">{messages.length} messages</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => {
                const isMe = m.sender_name === 'You';
                return (
                  <div key={m.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: avatarBgs[i % avatarBgs.length] }}>{m.sender_name[0]}</div>
                    <div className={`flex flex-col max-w-xs ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#1d3557]">{m.sender_name}</span>
                        <span className="text-xs text-[#6b7a8d]">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="px-4 py-2.5 rounded-2xl text-sm"
                        style={isMe ? { background: '#1d3557', color: '#fff', borderBottomRightRadius: 4 } : { background: '#fff', color: '#1d3557', border: '1px solid #d0dce8', borderBottomLeftRadius: 4 }}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && <div className="text-center py-12 text-[#6b7a8d] text-sm">No messages yet. Say hello! 👋</div>}
            </div>
            <form onSubmit={sendMessage} className="p-4 flex gap-3 bg-white" style={{ borderTop: '1px solid #d0dce8' }}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." required
                className="flex-1 rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
              <button type="submit" className="px-5 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: '#1d3557' }}>Send</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <div className="font-black text-[#1d3557] mb-2">Select a conversation</div>
              <div className="text-[#6b7a8d] text-sm">Choose from the left or start a new chat</div>
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-[#1d3557] text-lg">New Conversation</h2>
              <button onClick={() => setShowNew(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b7a8d] hover:bg-[#f1faee] transition">✕</button>
            </div>
            <form onSubmit={startChat} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">User ID</label>
                <input type="number" placeholder="Enter user ID" value={newUserId} onChange={e => setNewUserId(e.target.value)} required
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: '#1d3557' }}>Start Chat</button>
                <button type="button" onClick={() => setShowNew(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1d3557] hover:bg-[#f1faee] transition" style={{ border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
