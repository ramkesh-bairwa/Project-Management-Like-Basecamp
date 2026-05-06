'use client';
import { useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

export interface CommentNode {
  id: number;
  user_id: number;
  content: string;
  user_name: string;
  is_resolved: boolean;
  resolved_by_name: string | null;
  resolved_at: string | null;
  parent_id: number | null;
  created_at: string;
  children?: CommentNode[];
}

const avatarColors = ['#e63946','#457b9d','#2a9d8f','#f4a261','#6d6875','#e9c46a'];

interface Props {
  comment: CommentNode;
  currentUserId: number;
  userRole: string;
  depth?: number;
  onReply: (parentId: number, content: string) => Promise<void>;
  onResolve: (id: number, resolved: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
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
function fmtT(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const h = dt.getHours()%12||12, m = String(dt.getMinutes()).padStart(2,'0'), ap = dt.getHours()>=12?'PM':'AM';
  return `${h}:${m} ${ap}`;
}

export default function CommentThread({ comment, currentUserId, userRole, depth = 0, onReply, onResolve, onDelete }: Props) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isAuthor = comment.user_id === currentUserId;
  const canManage = isAuthor || ['owner','manager'].includes(userRole);
  const colorIdx = comment.user_id % avatarColors.length;

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onReply(comment.id, replyText);
    setReplyText('');
    setReplying(false);
    setSubmitting(false);
  }

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3' : 'mt-4'}`}>
      <div
        className="rounded-2xl p-4"
        style={{
          background: comment.is_resolved ? '#f8fafc' : depth === 0 ? '#fff' : '#f1faee',
          border: `1.5px solid ${comment.is_resolved ? '#e2e8f0' : depth === 0 ? '#d0dce8' : '#a8dadc'}`,
          opacity: comment.is_resolved ? 0.75 : 1,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
              style={{ background: avatarColors[colorIdx] }}
            >
              {comment.user_name[0]}
            </div>
            <div>
              <span className="text-sm font-bold" style={{ color: '#1d3557' }}>{comment.user_name}</span>
              <span className="text-xs ml-2" style={{ color: '#6b7a8d' }}>
                {fmtDT(comment.created_at)}
              </span>
              {depth > 0 && (
                <span className="text-xs ml-2 px-1.5 py-0.5 rounded" style={{ background: '#e8f4f8', color: '#457b9d' }}>
                  reply
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {comment.is_resolved && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0fdf9', color: '#0f766e' }}>
                ✓ Resolved by {comment.resolved_by_name}
              </span>
            )}
            {canManage && !comment.is_resolved && (
              <button
                onClick={() => onResolve(comment.id, true)}
                className="text-xs font-bold px-2 py-1 rounded-lg transition hover:opacity-80"
                style={{ background: '#f0fdf9', color: '#0f766e', border: '1px solid #99f6e4' }}
                title="Mark as resolved"
              >
                ✓ Resolve
              </button>
            )}
            {canManage && comment.is_resolved && (
              <button
                onClick={() => onResolve(comment.id, false)}
                className="text-xs font-bold px-2 py-1 rounded-lg transition hover:opacity-80"
                style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
              >
                Reopen
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-400 hover:text-red-600 transition font-bold"
                title="Delete"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="text-sm leading-relaxed pl-9" style={{ color: '#1d3557' }}>
          {comment.content.split('\n').map((line, i) => {
            const imgMatch = line.match(/^!\[.*?\]\((.+?)\)$/);
            const videoMatch = line.match(/^🎥 \[video\]\((.+?)\)$/);
            const linkMatch = line.match(/^🔗 (.+)$/);
            if (imgMatch) return <img key={i} src={imgMatch[1]} alt="attachment" className="mt-2 rounded-xl max-w-full max-h-64 object-contain" style={{ border: '1px solid #e2e8f0' }} />;
            if (videoMatch) return (
              <div key={i} className="mt-2">
                {/youtube|youtu\.be|vimeo/i.test(videoMatch[1])
                  ? <a href={videoMatch[1]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold hover:opacity-80" style={{ background: '#fff7ed', color: '#c2410c', border: '1.5px solid #fed7aa' }}>🎥 Watch Video</a>
                  : <video src={videoMatch[1]} controls className="mt-1 rounded-xl max-w-full max-h-48" style={{ border: '1px solid #e2e8f0' }} />}
              </div>
            );
            if (linkMatch) return <a key={i} href={linkMatch[1]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 mt-1 text-xs hover:underline" style={{ color: '#457b9d' }}>🔗 {linkMatch[1].length > 50 ? linkMatch[1].substring(0,50)+'...' : linkMatch[1]}</a>;
            return line ? <p key={i}>{line}</p> : <br key={i} />;
          })}
        </div>

        {/* Reply button */}
        {!comment.is_resolved && (
          <div className="pl-9 mt-2">
            <button
              onClick={() => setReplying(r => !r)}
              className="text-xs font-bold transition hover:opacity-80"
              style={{ color: '#457b9d' }}
            >
              {replying ? 'Cancel' : '↩ Reply'}
            </button>
          </div>
        )}

        {/* Reply form */}
        {replying && (
          <form onSubmit={submitReply} className="flex gap-2 mt-3 pl-9">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={`Reply to ${comment.user_name}...`}
              required
              className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ background: '#f1faee', border: '1.5px solid #a8dadc', color: '#1d3557' }}
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-black text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#457b9d' }}
            >
              Post
            </button>
          </form>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title="Delete Comment"
          message="Delete this comment? This cannot be undone."
          onConfirm={async () => { setDeleting(true); await onDelete(comment.id); setDeleting(false); setConfirmDelete(false); }}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}

      {/* Nested children */}
      {comment.children && comment.children.length > 0 && (
        <div className="border-l-2 pl-2" style={{ borderColor: '#a8dadc' }}>
          {comment.children.map(child => (
            <CommentThread
              key={child.id}
              comment={child}
              currentUserId={currentUserId}
              userRole={userRole}
              depth={depth + 1}
              onReply={onReply}
              onResolve={onResolve}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function buildCommentTree(flat: CommentNode[]): CommentNode[] {
  const map = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];
  flat.forEach(c => map.set(c.id, { ...c, children: [] }));
  map.forEach(c => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children!.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}
