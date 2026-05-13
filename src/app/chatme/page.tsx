'use client';

import { useState, useEffect, useRef } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  org_role?: string;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  message_type: string;
  file_url?: string;
  created_at: string;
  reactions?: Array<{ emoji: string; user_id: number; user_name: string }>;
}

interface Conversation {
  id: number;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  other_user?: User;
  unread_count: number;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
  member_count: number;
  updated_at: string;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [canCreateGroup, setCanCreateGroup] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [groupName, setGroupName] = useState('');
  const [sending, setSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchConversations();
    
    // Poll for new messages every 3 seconds
    pollInterval.current = setInterval(() => {
      fetchConversations();
      if (selectedConv) {
        fetchMessages(selectedConv.id);
      }
    }, 3000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      setIsSidebarOpen(false);
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        
        // Check if user can create groups
        if (data.user.is_org) {
          setCanCreateGroup(true);
        } else {
          // Check if user is admin in any org
          const orgRes = await fetch('/api/chat/check-admin');
          if (orgRes.ok) {
            const orgData = await orgRes.json();
            setCanCreateGroup(orgData.canCreateGroup);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/chat/users?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const startDirectChat = async (userId: number) => {
    try {
      const res = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'direct', userIds: [userId] }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowUserSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        await fetchConversations();
        const conv = conversations.find((c) => c.id === data.conversationId);
        if (conv) setSelectedConv(conv);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    try {
      const res = await fetch('/api/chat/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, userIds: selectedUsers }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Failed to create group');
        return;
      }
      
      setShowGroupModal(false);
      setGroupName('');
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      await fetchConversations();
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: number) => {
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv || sending) return;

    setSending(true);
    const messageToSend = newMessage;
    setNewMessage('');

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          content: messageToSend,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        fetchConversations();
      } else {
        setNewMessage(messageToSend);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const toggleReaction = async (messageId: number, emoji: string) => {
    try {
      await fetch('/api/chat/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      });
      if (selectedConv) {
        fetchMessages(selectedConv.id);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const groupReactions = (reactions?: Array<{ emoji: string; user_id: number; user_name: string }>) => {
    if (!reactions) return [];
    const grouped: { [key: string]: number } = {};
    reactions.forEach((r) => {
      grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
    });
    return Object.entries(grouped).map(([emoji, count]) => ({ emoji, count }));
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="root">
      <button className="mobile-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        {isSidebarOpen ? '✕' : '☰'}
        {totalUnreadCount > 0 && <span className="mobile-badge">{totalUnreadCount}</span>}
      </button>
      <div className={`sb ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sb-head">
          <div className="workspace">
            <div className="ws-logo">PM</div>
            <div style={{ flex: 1 }}>
              <div className="ws-name">Project Manager</div>
              <div className="ws-plan">Pro Plan</div>
            </div>
            <i className="ws-chevron">▾</i>
          </div>
          <div className="search-pill">
            <i>🔍</i>
            <span>Search</span>
            <span className="sk">⌘K</span>
          </div>
        </div>

        <div className="sb-nav">
          <div className="ni on">
            <i>💬</i>
            <span className="ni-label">Messages</span>
            {totalUnreadCount > 0 && (
              <span className="badge">{totalUnreadCount}</span>
            )}
          </div>
        </div>

        <div className="divider-line"></div>

        <div className="sec-title">
          <span>Direct Messages</span>
          <i onClick={() => setShowUserSearch(true)} style={{ cursor: 'pointer' }}>+</i>
        </div>
        <div className="dm-list">
          {conversations
            .filter((c) => c.type === 'direct')
            .map((conv) => {
              const otherUser = conv.other_user;
              return (
                <div
                  key={conv.id}
                  className={`row ${selectedConv?.id === conv.id ? 'on' : ''}`}
                  onClick={() => setSelectedConv(conv)}
                >
                  <div className="avw">
                    <div
                      className="av"
                      style={{
                        background: '#818CF8',
                        color: '#fff',
                      }}
                    >
                      {otherUser ? getInitials(otherUser.name) : '?'}
                    </div>
                    <div className="st st-on"></div>
                  </div>
                  <div className="ri">
                    <div className="rn">{otherUser?.name || 'Unknown'}</div>
                    <div className="rp">
                      {conv.last_message?.content || 'No messages yet'}
                    </div>
                  </div>
                  <div className="rm">
                    {conv.last_message && (
                      <div className="rt">{formatTime(conv.last_message.created_at)}</div>
                    )}
                    {conv.unread_count > 0 && <div className="unr">{conv.unread_count}</div>}
                  </div>
                </div>
              );
            })}
        </div>

        <div className="divider-line"></div>

        <div className="sec-title">
          <span>Groups</span>
          {canCreateGroup && (
            <i onClick={() => setShowGroupModal(true)} style={{ cursor: 'pointer' }}>+</i>
          )}
        </div>
        <div className="grp-list">
          {conversations
            .filter((c) => c.type === 'group')
            .map((conv) => (
              <div
                key={conv.id}
                className={`row ${selectedConv?.id === conv.id ? 'on' : ''}`}
                onClick={() => setSelectedConv(conv)}
              >
                <div className="gi" style={{ background: '#534AB7', color: '#fff' }}>
                  #
                </div>
                <div className="ri">
                  <div className="rn">{conv.name || 'Group Chat'}</div>
                  <div className="rp">{conv.member_count} members</div>
                </div>
                <div className="rm">
                  {conv.last_message && (
                    <div className="rt">{formatTime(conv.last_message.created_at)}</div>
                  )}
                  {conv.unread_count > 0 && <div className="unr">{conv.unread_count}</div>}
                </div>
              </div>
            ))}
        </div>

        <div className="sb-foot">
          <div className="me-av">
            {currentUser ? getInitials(currentUser.name) : 'U'}
            <div className="me-st"></div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="me-name">{currentUser?.name || 'User'}</div>
            <div className="me-tag">@{currentUser?.email?.split('@')[0] || 'user'}</div>
          </div>
          <div className="foot-icons">
            <button className="fi">⚙️</button>
          </div>
        </div>
      </div>

      <div className="chat">
        {selectedConv ? (
          <>
            <div className="ch">
              <div className="ch-left">
                <div className="ch-av">
                  {selectedConv.type === 'direct' && selectedConv.other_user
                    ? getInitials(selectedConv.other_user.name)
                    : '#'}
                  <div className="ch-dot st-on"></div>
                </div>
              </div>
              <div className="ch-center">
                <div className="ch-name">
                  {selectedConv.type === 'direct'
                    ? selectedConv.other_user?.name
                    : selectedConv.name}
                </div>
                <div className="ch-sub">
                  {selectedConv.type === 'group'
                    ? `${selectedConv.member_count} members`
                    : 'Active now'}
                </div>
              </div>
              <div className="ch-acts">
                <button className="hb" title="Voice Call">📞</button>
                <button className="hb" title="Video Call">📹</button>
                <button className="hb" title="Info">ℹ️</button>
              </div>
            </div>

            <div className="msgs">
              <div className="chat-bg-pattern"></div>
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === currentUser?.id;
                const showDate =
                  idx === 0 ||
                  new Date(messages[idx - 1].created_at).toDateString() !==
                    new Date(msg.created_at).toDateString();

                return (
                  <div key={msg.id}>
                    {showDate && msg.created_at && (
                      <div className="dd">
                        <span>
                          {(() => {
                            const date = new Date(msg.created_at);
                            return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
                          })()}
                        </span>
                      </div>
                    )}
                    <div className={`mr ${isMe ? 'me' : ''}`}>
                      <div
                        className="mav"
                        style={{
                          background: isMe ? '#534AB7' : '#818CF8',
                          color: '#fff',
                        }}
                      >
                        {getInitials(msg.sender_name)}
                      </div>
                      <div className="mb">
                        {!isMe && <div className="msender">{msg.sender_name}</div>}
                        <div className={`bbl ${isMe ? 'me' : ''}`}>{msg.content}</div>
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="rxns">
                            {groupReactions(msg.reactions).map((r) => (
                              <span
                                key={r.emoji}
                                className="rxn"
                                onClick={() => toggleReaction(msg.id, r.emoji)}
                              >
                                {r.emoji} {r.count}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mtime">{formatMessageTime(msg.created_at)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div
              style={{
                padding: '16px 28px',
                borderTop: '0.5px solid #e2deff',
                background: '#fff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#f4f2ff',
                  border: '1px solid #c4baff',
                  borderRadius: '12px',
                  padding: '12px 16px',
                }}
              >
                <button
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '18px',
                  }}
                >
                  📎
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '18px',
                  }}
                  onClick={() => toggleReaction(messages[messages.length - 1]?.id, '👍')}
                >
                  😊
                </button>
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  style={{
                    border: 'none',
                    background: sending ? '#9d96e0' : '#534AB7',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: sending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-bg-pattern"></div>
            <div className="empty-content">
              <div className="empty-icon">💬</div>
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="modal-overlay" onClick={() => setShowUserSearch(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Start a Conversation</h3>
              <button className="modal-close" onClick={() => setShowUserSearch(false)}>×</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="search-input"
                autoFocus
              />
              <div className="user-list">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="user-item"
                    onClick={() => startDirectChat(user.id)}
                  >
                    <div className="user-avatar" style={{ background: '#818CF8', color: '#fff' }}>
                      {getInitials(user.name)}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <div className="no-results">No users found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Group</h3>
              <button className="modal-close" onClick={() => setShowGroupModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="search-input"
                style={{ marginBottom: '16px' }}
              />
              <input
                type="text"
                placeholder="Search members to add..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="search-input"
              />
              {selectedUsers.length > 0 && (
                <div className="selected-users">
                  {searchResults
                    .filter((u) => selectedUsers.includes(u.id))
                    .map((user) => (
                      <span key={user.id} className="selected-tag">
                        {user.name}
                        <button onClick={() => setSelectedUsers(selectedUsers.filter((id) => id !== user.id))}>×</button>
                      </span>
                    ))}
                </div>
              )}
              <div className="user-list">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={`user-item ${selectedUsers.includes(user.id) ? 'selected' : ''}`}
                    onClick={() => {
                      if (selectedUsers.includes(user.id)) {
                        setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                      } else {
                        setSelectedUsers([...selectedUsers, user.id]);
                      }
                    }}
                  >
                    <div className="user-avatar" style={{ background: '#818CF8', color: '#fff' }}>
                      {getInitials(user.name)}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                    {selectedUsers.includes(user.id) && <span className="check">✓</span>}
                  </div>
                ))}
              </div>
              <button
                className="create-btn"
                onClick={createGroup}
                disabled={!groupName.trim() || selectedUsers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .root{display:flex;height:100vh;font-family:var(--font-sans);position:relative;}
        .mobile-toggle{display:none;position:fixed;top:16px;left:16px;z-index:1001;width:48px;height:48px;border-radius:12px;background:#534AB7;color:#fff;border:none;font-size:20px;cursor:pointer;box-shadow:0 4px 12px rgba(83,74,183,0.3);transition:all .2s;}
        .mobile-toggle:hover{background:#3C3489;transform:scale(1.05);}
        .mobile-toggle:active{transform:scale(0.95);}
        .mobile-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 6px;background:#ef4444;color:#fff;font-size:11px;font-weight:600;border-radius:10px;display:flex;align-items:center;justify-content:center;border:2px solid #534AB7;}
        @media (max-width: 768px) {
          .mobile-toggle{display:flex;align-items:center;justify-content:center;}
        }
        .sb{width:268px;min-width:268px;background:#16122e;display:flex;flex-direction:column;transition:transform .3s ease;}
        @media (max-width: 768px) {
          .sb{position:fixed;top:0;left:0;bottom:0;z-index:1000;transform:translateX(-100%);box-shadow:4px 0 12px rgba(0,0,0,0.3);}
          .sb.open{transform:translateX(0);}
        }
        .sb-head{padding:18px 16px 14px;}
        .workspace{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:11px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.08);margin-bottom:14px;cursor:pointer;transition:background .15s;}
        .workspace:hover{background:rgba(255,255,255,0.08);}
        .ws-logo{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#534AB7,#7F77DD);display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;flex-shrink:0;}
        .ws-name{font-size:13px;font-weight:500;color:#fff;line-height:1.2;}
        .ws-plan{font-size:10px;color:rgba(255,255,255,0.35);}
        .ws-chevron{margin-left:auto;font-size:14px;color:rgba(255,255,255,0.25);}
        .search-pill{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:9px 12px;cursor:text;transition:all .2s;}
        .search-pill:hover{background:rgba(255,255,255,0.09);border-color:rgba(255,255,255,0.16);}
        .search-pill i{font-size:14px;color:rgba(255,255,255,0.35);}
        .search-pill span{font-size:12px;color:rgba(255,255,255,0.3);flex:1;}
        .sk{font-size:10px;color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.07);border:0.5px solid rgba(255,255,255,0.12);border-radius:5px;padding:2px 6px;}
        .sb-nav{padding:10px 10px 6px;display:flex;flex-direction:column;gap:1px;}
        .ni{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:9px;cursor:pointer;transition:background .15s;position:relative;}
        .ni:hover{background:rgba(255,255,255,0.06);}
        .ni.on{background:rgba(83,74,183,0.45);}
        .ni i{font-size:18px;}
        .ni.on i{filter:brightness(1.2);}
        .ni-label{font-size:13px;color:rgba(255,255,255,0.45);flex:1;}
        .ni.on .ni-label{color:#fff;font-weight:500;}
        .badge{min-width:20px;height:20px;padding:0 6px;background:#ef4444;color:#fff;font-size:11px;font-weight:600;border-radius:10px;display:flex;align-items:center;justify-content:center;}
        .divider-line{height:0.5px;background:rgba(255,255,255,0.06);margin:6px 16px;}
        .sec-title{font-size:10px;font-weight:500;color:rgba(255,255,255,0.22);letter-spacing:.08em;text-transform:uppercase;padding:10px 21px 5px;display:flex;align-items:center;justify-content:space-between;}
        .sec-title i{font-size:14px;color:rgba(255,255,255,0.2);cursor:pointer;}
        .dm-list,.grp-list{display:flex;flex-direction:column;padding:0 8px;}
        .row{display:flex;align-items:center;gap:9px;padding:6px 11px;border-radius:9px;cursor:pointer;transition:background .15s;}
        .row:hover{background:rgba(255,255,255,0.055);}
        .row.on{background:rgba(83,74,183,0.38);}
        .avw{position:relative;flex-shrink:0;}
        .av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;}
        .st{position:absolute;bottom:-1px;right:-1px;width:9px;height:9px;border-radius:50%;border:2px solid #16122e;}
        .st-on{background:#22c55e;}
        .st-off{background:#52525b;}
        .st-busy{background:#f59e0b;}
        .st-dnd{background:#ef4444;}
        .ri{flex:1;min-width:0;}
        .rn{font-size:12px;font-weight:500;color:#ddd8ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .rp{font-size:11px;color:rgba(255,255,255,0.28);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .rm{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;}
        .rt{font-size:10px;color:rgba(255,255,255,0.22);}
        .unr{min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#ef4444;color:#fff;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;}
        .gi{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}

        .sb-foot{margin-top:auto;padding:10px 12px;border-top:0.5px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px;}
        .me-av{width:32px;height:32px;border-radius:50%;background:#534AB7;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:#C4BFFF;flex-shrink:0;position:relative;}
        .me-st{position:absolute;bottom:-1px;right:-1px;width:9px;height:9px;border-radius:50%;background:#22c55e;border:2px solid #16122e;}
        .me-name{font-size:12px;font-weight:500;color:#ddd8ff;}
        .me-tag{font-size:10px;color:rgba(255,255,255,0.3);}
        .foot-icons{display:flex;gap:2px;margin-left:auto;}
        .fi{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;border:none;background:transparent;}
        .fi:hover{background:rgba(255,255,255,0.08);}
        .fi i{font-size:15px;color:rgba(255,255,255,0.3);}
        .chat{flex:1;display:flex;flex-direction:column;min-width:0;background:#f4f2ff;position:relative;}
        .ch{height:64px;padding:0 20px;display:flex;align-items:center;gap:12px;border-bottom:0.5px solid #e2deff;background:#fff;flex-shrink:0;}
        @media (max-width: 768px) {
          .ch{padding:0 16px 0 72px;}
        }
        .ch-left{display:flex;align-items:center;}
        .ch-av{width:40px;height:40px;border-radius:50%;background:#EEEDFE;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;color:#3C3489;flex-shrink:0;position:relative;}
        .ch-dot{position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;border:2px solid #fff;}
        .ch-center{flex:1;text-align:center;min-width:0;}
        .ch-name{font-size:15px;font-weight:600;color:#1e1a3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .ch-sub{font-size:12px;color:#9d96e0;margin-top:2px;}
        .ch-acts{display:flex;gap:4px;}
        .hb{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;border:none;background:transparent;transition:all .15s;font-size:18px;}
        .hb:hover{background:#f0eeff;transform:scale(1.05);}
        .hb:active{transform:scale(0.95);}
        .msgs{flex:1;overflow-y:auto;padding:22px 28px;display:flex;flex-direction:column;gap:18px;position:relative;}
        @media (max-width: 768px) {
          .msgs{padding:16px;}
        }
        .msgs::-webkit-scrollbar{width:4px;}
        .msgs::-webkit-scrollbar-thumb{background:#d4d0f5;border-radius:4px;}
        .chat-bg-pattern{position:absolute;top:0;left:0;right:0;bottom:0;opacity:0.03;pointer-events:none;background-image:radial-gradient(circle at 20px 20px, #534AB7 2px, transparent 0),radial-gradient(circle at 60px 60px, #818CF8 1.5px, transparent 0);background-size:80px 80px;background-position:0 0, 40px 40px;}
        .dd{display:flex;align-items:center;gap:12px;margin:4px 0;}
        .dd::before,.dd::after{content:'';flex:1;height:0.5px;background:#e2deff;}
        .dd span{font-size:10px;color:#b0aadc;white-space:nowrap;background:#f4f2ff;padding:0 4px;}
        .mr{display:flex;gap:10px;align-items:flex-end;}
        .mr.me{flex-direction:row-reverse;}
        .mav{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;flex-shrink:0;align-self:flex-end;}
        .mb{display:flex;flex-direction:column;gap:4px;max-width:62%;}
        @media (max-width: 768px) {
          .mb{max-width:85%;}
        }
        .mr.me .mb{align-items:flex-end;}
        .msender{font-size:10px;color:#b0aadc;padding:0 13px;font-weight:500;}
        .bbl{padding:11px 15px;border-radius:18px;font-size:13px;line-height:1.6;color:#1e1a3a;background:#fff;border:0.5px solid #e2deff;position:relative;}
        .bbl.me{background:#534AB7;color:#fff;border-color:#534AB7;border-bottom-right-radius:5px;}
        .bbl:not(.me){border-bottom-left-radius:5px;}
        .mtime{font-size:10px;color:#b0aadc;padding:0 13px;}
        .mr.me .mtime{text-align:right;}
        .rxns{display:flex;gap:4px;padding:4px 13px 0;}
        .rxn{font-size:11px;background:#EEEDFE;color:#3C3489;border:0.5px solid #c4baff;border-radius:20px;padding:3px 8px;cursor:pointer;transition:background .15s;}
        .rxn:hover{background:#dddaff;}
        .empty-state{flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
        .empty-bg-pattern{position:absolute;top:0;left:0;right:0;bottom:0;opacity:0.04;background:linear-gradient(135deg, #534AB7 0%, #818CF8 50%, #C4BFFF 100%);background-size:400% 400%;animation:gradientShift 15s ease infinite;}
        .empty-bg-pattern::before{content:'';position:absolute;top:50%;left:50%;width:600px;height:600px;background:radial-gradient(circle, rgba(83,74,183,0.1) 0%, transparent 70%);transform:translate(-50%, -50%);animation:pulse 8s ease-in-out infinite;}
        .empty-bg-pattern::after{content:'';position:absolute;top:20%;right:10%;width:300px;height:300px;background:radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%);animation:float 10s ease-in-out infinite;}
        @keyframes gradientShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes pulse{0%,100%{transform:translate(-50%, -50%) scale(1);opacity:0.3;}50%{transform:translate(-50%, -50%) scale(1.2);opacity:0.5;}}
        @keyframes float{0%,100%{transform:translateY(0px) rotate(0deg);}50%{transform:translateY(-30px) rotate(5deg);}}
        .empty-content{position:relative;z-index:1;text-align:center;padding:40px;}
        .empty-icon{font-size:80px;margin-bottom:20px;animation:bounce 2s ease-in-out infinite;}
        @keyframes bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
        .empty-content h3{font-size:24px;font-weight:600;color:#534AB7;margin-bottom:8px;}
        .empty-content p{font-size:14px;color:#9d96e0;}
        .modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;}
        .modal{background:#fff;border-radius:16px;width:90%;max-width:500px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
        @media (max-width: 768px) {
          .modal{width:95%;max-height:90vh;}
        }
        .modal-header{padding:20px 24px;border-bottom:1px solid #e2deff;display:flex;align-items:center;justify-content:space-between;}
        .modal-header h3{font-size:18px;font-weight:600;color:#1e1a3a;margin:0;}
        .modal-close{border:none;background:transparent;font-size:28px;color:#9d96e0;cursor:pointer;padding:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:background .15s;}
        .modal-close:hover{background:#f0eeff;}
        .modal-body{padding:20px 24px;overflow-y:auto;flex:1;}
        .search-input{width:100%;padding:12px 16px;border:1px solid #c4baff;border-radius:10px;font-size:14px;outline:none;transition:border .15s;}
        .search-input:focus{border-color:#534AB7;}
        .user-list{margin-top:16px;display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;}
        .user-item{display:flex;align-items:center;gap:12px;padding:12px;border-radius:10px;cursor:pointer;transition:background .15s;border:1px solid transparent;}
        .user-item:hover{background:#f4f2ff;}
        .user-item.selected{background:#EEEDFE;border-color:#c4baff;}
        .user-avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;flex-shrink:0;}
        .user-info{flex:1;min-width:0;}
        .user-name{font-size:14px;font-weight:500;color:#1e1a3a;}
        .user-email{font-size:12px;color:#9d96e0;}
        .check{color:#534AB7;font-size:18px;font-weight:bold;}
        .no-results{text-align:center;padding:40px 20px;color:#9d96e0;font-size:14px;}
        .selected-users{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
        .selected-tag{display:inline-flex;align-items:center;gap:6px;background:#EEEDFE;color:#534AB7;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:500;}
        .selected-tag button{border:none;background:transparent;color:#534AB7;cursor:pointer;font-size:16px;padding:0;width:16px;height:16px;display:flex;align-items:center;justify-content:center;}
        .create-btn{width:100%;margin-top:16px;padding:12px;background:#534AB7;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;transition:background .15s;}
        .create-btn:hover:not(:disabled){background:#3C3489;}
        .create-btn:disabled{opacity:0.5;cursor:not-allowed;}
      `}</style>
    </div>
  );
}
