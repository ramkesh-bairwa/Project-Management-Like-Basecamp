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
  file_name?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [messageMenuOpen, setMessageMenuOpen] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const isWebSocketEnabled = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true';

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

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const sendCodeMessage = async () => {
    if (!codeContent.trim() || !selectedConv || sending) return;

    setSending(true);
    const messageToSend = `\`\`\`\n${codeContent}\n\`\`\``;
    setCodeContent('');
    setShowCodeModal(false);

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
      }
    } catch (error) {
      console.error('Error sending code:', error);
      alert('Failed to send code');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', selectedConv.id.toString());

    try {
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const newMsg = {
          id: data.message.id,
          conversation_id: selectedConv.id,
          sender_id: data.message.sender_id,
          sender_name: data.message.sender_name,
          sender_avatar: data.message.sender_avatar,
          content: data.message.content,
          message_type: data.message.message_type,
          file_url: data.message.file_url,
          file_name: data.message.file_name,
          created_at: data.message.created_at,
        };
        
        setMessages(prev => [...prev, newMsg]);
        
        if (isWebSocketEnabled) {
          sendWS({
            type: 'chat_message',
            chat_id: selectedConv.id,
            ...newMsg,
          });
        }
        
        fetchConversations();
      } else {
        alert('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const commonEmojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '✨', '💯', '👏', '🙌', '😍', '🤔', '😎', '💪', '🚀', '⭐', '✅', '❌', '👀', '💡'];

  const getFileIcon = (fileName: string, messageType: string) => {
    if (messageType === 'image') return '🖼️';
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    if (['ppt', 'pptx'].includes(ext || '')) return '📽️';
    if (['zip', 'rar', '7z'].includes(ext || '')) return '🗜️';
    return '📎';
  };

  const deleteMessage = async (messageId: number) => {
    setMessageMenuOpen(null);
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
      });
      
      console.log('Delete response:', res.status);
      
      if (res.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content: 'This message was deleted', deleted_at: new Date().toISOString() } : m
        ));
        setDeleteConfirmId(null);
        fetchConversations();
      } else {
        const error = await res.json();
        console.error('Delete error:', error);
        alert('Failed to delete message: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const startEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    setMessageMenuOpen(null);
  };

  const saveEdit = async (messageId: number) => {
    if (!editingContent.trim()) return;
    try {
      const res = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent }),
      });
      if (res.ok) {
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content: editingContent, updated_at: new Date().toISOString() } : m
        ));
        setEditingMessageId(null);
        setEditingContent('');
      } else {
        alert('Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Failed to edit message');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
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
            <div style={{ position: 'relative' }} ref={settingsMenuRef}>
              <button 
                className="ws-settings"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                title="Settings"
              >
                ⚙️
              </button>
              {showSettingsMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: '#fff',
                  border: '1px solid #e2deff',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  minWidth: '200px',
                  overflow: 'hidden',
                  zIndex: 1000,
                }}>
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#1e1a3a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f4f2ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    🏠 Dashboard
                  </button>
                  <div style={{ height: '1px', background: '#e2deff', margin: '4px 0' }} />
                  <button
                    onClick={() => window.location.href = '/logout'}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
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
                        {editingMessageId === msg.id ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && saveEdit(msg.id)}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                border: '1px solid #c4baff',
                                borderRadius: '8px',
                                fontSize: '13px',
                              }}
                              autoFocus
                            />
                            <button onClick={() => saveEdit(msg.id)} style={{ padding: '4px 8px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                            <button onClick={() => { setEditingMessageId(null); setEditingContent(''); }} style={{ padding: '4px 8px', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ position: 'relative' }}>
                            <div className={`bbl ${isMe ? 'me' : ''}`} style={{ opacity: (msg as any).deleted_at ? 0.5 : 1, fontStyle: (msg as any).deleted_at ? 'italic' : 'normal' }}>
                              {(msg as any).deleted_at ? (
                                <span style={{ color: '#94a3b8' }}>🚫 This message was deleted</span>
                              ) : editingMessageId === msg.id ? null : (
                                /^```[\s\S]*```$/.test(msg.content) ? (
                                  <pre style={{ 
                                    background: isMe ? 'rgba(0,0,0,0.2)' : '#f8f9fa', 
                                    padding: '12px', 
                                    borderRadius: '8px', 
                                    overflow: 'auto',
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                  }}>
                                    <code style={{ color: isMe ? '#fff' : '#1e1a3a' }}>
                                      {msg.content.replace(/^```\n?|\n?```$/g, '')}
                                    </code>
                                  </pre>
                                ) : msg.message_type === 'image' && msg.file_url ? (
                                  <div>
                                    <img 
                                      src={msg.file_url} 
                                      alt={msg.file_name || 'Image'} 
                                      style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '8px', display: 'block', cursor: 'pointer' }} 
                                      onClick={() => setImagePreview(msg.file_url!)}
                                    />
                                    {msg.content && <div style={{ marginTop: '8px' }}>{msg.content}</div>}
                                    <a href={msg.file_url} download={msg.file_name} style={{ fontSize: '11px', color: isMe ? '#fff' : '#534AB7', marginTop: '4px', display: 'inline-block' }}>Download</a>
                                  </div>
                                ) : msg.message_type === 'file' && msg.file_url ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '24px' }}>{getFileIcon(msg.file_name || '', msg.message_type)}</span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 500 }}>{msg.file_name || msg.content}</div>
                                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: isMe ? '#fff' : '#534AB7', textDecoration: 'underline' }}>Preview</a>
                                        <a href={msg.file_url} download={msg.file_name} style={{ fontSize: '11px', color: isMe ? '#fff' : '#534AB7', textDecoration: 'underline' }}>Download</a>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span>
                                    {msg.content}
                                    {(msg as any).updated_at && new Date(msg.created_at).getTime() !== new Date((msg as any).updated_at).getTime() && (
                                      <span style={{ fontSize: '10px', marginLeft: '6px', opacity: 0.7 }}>(edited)</span>
                                    )}
                                  </span>
                                )
                              )}
                            </div>
                            {isMe && !(msg as any).deleted_at && (
                              <div style={{ position: 'absolute', top: '4px', right: '-30px' }}>
                                <button
                                  onClick={() => setMessageMenuOpen(messageMenuOpen === msg.id ? null : msg.id)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                                >
                                  ⋮
                                </button>
                                {messageMenuOpen === msg.id && (
                                  <div style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '100%',
                                    background: '#fff',
                                    border: '1px solid #c4baff',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    zIndex: 10,
                                    minWidth: '100px',
                                  }}>
                                    {msg.message_type === 'text' && (
                                      <button
                                        onClick={() => startEdit(msg)}
                                        style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f4f2ff'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                      >
                                        ✏️ Edit
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setDeleteConfirmId(msg.id);
                                        setMessageMenuOpen(null);
                                      }}
                                      style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: '#ef4444' }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
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
                position: 'relative',
              }}
            >
              {showEmojiPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '28px',
                  background: '#fff',
                  border: '1px solid #c4baff',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: '8px',
                  marginBottom: '8px',
                  zIndex: 10,
                }}>
                  {commonEmojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => insertEmoji(emoji)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f4f2ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: uploadingFile ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                  }}
                  title="Attach file"
                >
                  {uploadingFile ? '⏳' : '📎'}
                </button>
                <button
                  onClick={() => setShowCodeModal(true)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#534AB7',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                  }}
                  title="Send code"
                >
                  {'</>'}
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
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '18px',
                  }}
                  title="Insert emoji"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Delete Message</h3>
              <button className="modal-close" onClick={() => setDeleteConfirmId(null)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: '#64748b' }}>Are you sure you want to delete this message? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #c4baff',
                    background: '#fff',
                    color: '#534AB7',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMessage(deleteConfirmId)}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="image-viewer-overlay" 
          onClick={() => setImagePreview(null)}
        >
          <button 
            className="image-viewer-close"
            onClick={() => setImagePreview(null)}
          >
            ×
          </button>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            />
          </div>
          <div className="image-viewer-actions">
            <a 
              href={imagePreview} 
              download 
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '12px 24px',
                background: '#534AB7',
                color: '#fff',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📥 Download
            </a>
          </div>
        </div>
      )}

      {/* Code Modal */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>📝 Send Code</h3>
              <button className="modal-close" onClick={() => setShowCodeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <textarea
                placeholder="Paste your code here...\n\nTip: Use Ctrl/Cmd+Enter to send"
                value={codeContent}
                onChange={(e) => setCodeContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    sendCodeMessage();
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: '300px',
                  padding: '12px',
                  border: '1px solid #c4baff',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  outline: 'none',
                  background: '#f8f9fa',
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  onClick={() => {
                    setShowCodeModal(false);
                    setCodeContent('');
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #c4baff',
                    background: '#fff',
                    color: '#534AB7',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={sendCodeMessage}
                  disabled={!codeContent.trim() || sending}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: !codeContent.trim() || sending ? '#9d96e0' : '#534AB7',
                    color: '#fff',
                    borderRadius: '8px',
                    cursor: !codeContent.trim() || sending ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {sending ? 'Sending...' : 'Send Code'}
                </button>
              </div>
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
        .ws-settings{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;border:none;background:rgba(255,255,255,0.08);font-size:16px;}
        .ws-settings:hover{background:rgba(255,255,255,0.15);}
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
        .image-viewer-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:2000;animation:fadeIn 0.2s;}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        .image-viewer-close{position:absolute;top:20px;right:20px;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;z-index:2001;}
        .image-viewer-close:hover{background:rgba(255,255,255,0.2);transform:scale(1.1);}
        .image-viewer-content{display:flex;align-items:center;justify-content:center;padding:20px;}
        .image-viewer-actions{position:absolute;bottom:30px;left:50%;transform:translateX(-50%);z-index:2001;}
      `}</style>
    </div>
  );
}
