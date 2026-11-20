'use client';
import { useEffect, useRef, useState } from 'react';
import CommentThread, { CommentNode, buildCommentTree } from './CommentThread';

interface Props {
  taskId: number;
  token: string;
  myId: number;
  myRole: string;
  commentCount: number;
  open: boolean;
  onToggle: () => void;
  onCommentPosted?: () => void;
}

const avatarColors = ['#f43f5e', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#eab308'];

export default function TaskCommentAccordion({ taskId, token, myId, myRole, commentCount, open, onToggle, onCommentPosted }: Props) {
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  function loadComments() {
    fetch(`/api/comments?entity_type=task&entity_id=${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) { setComments(d); setLoaded(true); } });
  }

  useEffect(() => {
    if (open && !loaded) loadComments();
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'task', entity_id: taskId, content: newComment }) });
    setNewComment('');
    setPosting(false);
    loadComments();
    onCommentPosted?.();
  }

  async function replyComment(parentId: number, content: string) {
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'task', entity_id: taskId, content, parent_id: parentId }) });
    loadComments();
  }

  async function resolveComment(cid: number, resolved: boolean) {
    await fetch('/api/comments', { method: 'PUT', headers: h, body: JSON.stringify({ id: cid, resolve: resolved, unresolve: !resolved }) });
    loadComments();
  }

  async function editComment(cid: number, content: string) {
    await fetch('/api/comments', { method: 'PUT', headers: h, body: JSON.stringify({ id: cid, content }) });
    loadComments();
    onCommentPosted?.();
  }

  async function deleteComment(cid: number) {
    await fetch(`/api/comments?id=${cid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadComments();
    onCommentPosted?.();
  }

  const tree = buildCommentTree(comments);
  const count = loaded ? comments.length : commentCount;

  return (
    <div className="overflow-hidden" style={{ borderTop: open ? '1px solid var(--border-soft)' : 'none' }}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition hover:bg-[var(--surface-2)]"
        style={{ color: open ? 'var(--link)' : 'var(--text-subtle)', background: open ? '#f0f7ff' : 'transparent' }}
      >
        <span className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {count > 0 ? `${count} Comment${count !== 1 ? 's' : ''}` : 'Add Comment'}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className="ml-auto transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Accordion body */}
      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: open ? '600px' : '0px', opacity: open ? 1 : 0 }}
      >
        <div className="px-4 pb-4 pt-3" style={{ background: 'var(--surface-2)' }}>

          {/* Comment input */}
          <form onSubmit={postComment} className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
              style={{ background: avatarColors[myId % avatarColors.length] }}>
              {String.fromCharCode(65 + (myId % 26))}
            </div>
            <input
              ref={inputRef}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none transition"
              style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text)' }}
            />
            <button
              type="submit"
              disabled={posting || !newComment.trim()}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40 flex-shrink-0"
              style={{ background: 'var(--link)' }}
            >
              {posting ? '...' : 'Post'}
            </button>
          </form>

          {/* Comments list */}
          {!loaded ? (
            <div className="text-xs text-center py-4" style={{ color: 'var(--text-subtle)' }}>Loading comments...</div>
          ) : tree.length === 0 ? (
            <div className="text-xs text-center py-4 rounded-xl" style={{ color: 'var(--text-subtle)', border: '1.5px dashed var(--border)' }}>
              No comments yet — be the first!
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {tree.map(c => (
                <CommentThread
                  key={c.id}
                  comment={c}
                  currentUserId={myId}
                  userRole={myRole}
                  onReply={replyComment}
                  onResolve={resolveComment}
                  onEdit={editComment}
                  onDelete={deleteComment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
