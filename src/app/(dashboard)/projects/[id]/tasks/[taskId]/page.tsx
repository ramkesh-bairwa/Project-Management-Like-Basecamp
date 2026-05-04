'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';
import CommentThread, { CommentNode, buildCommentTree } from '@/components/project/CommentThread';

interface Task {
  id: number; title: string; description: string; status: string; priority: string;
  assignee_id: number | null; assignee_name: string; due_date: string;
  group_name: string; group_color: string; project_id: number; created_at: string;
}
interface Subtask { id: number; title: string; status: string; priority: string }
interface Member { id: number; name: string; role: string }
interface HistoryEntry {
  id: number; action: string; old_value: string | null; new_value: string | null;
  changed_by_name: string; created_at: string;
}

const statusOptions = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const priorityOptions = ['low', 'medium', 'high', 'critical'];
const statusColors: Record<string, string> = { todo: '#94a3b8', in_progress: '#457b9d', in_review: '#f4a261', done: '#2a9d8f', cancelled: '#e63946' };
const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled' };
const priorityColors: Record<string, string> = { low: '#94a3b8', medium: '#457b9d', high: '#f4a261', critical: '#e63946' };
const actionCfg: Record<string, { icon: string; color: string; label: string }> = {
  created:          { icon: '✦', color: '#2a9d8f', label: 'created task' },
  status_changed:   { icon: '⇄', color: '#457b9d', label: 'changed status' },
  closed:           { icon: '✓', color: '#0f766e', label: 'closed task' },
  reopened:         { icon: '↺', color: '#c2410c', label: 'reopened task' },
  assigned:         { icon: '→', color: '#6d6875', label: 'assigned' },
  unassigned:       { icon: '←', color: '#94a3b8', label: 'unassigned' },
  priority_changed: { icon: '!', color: '#f4a261', label: 'changed priority' },
  title_changed:    { icon: '✎', color: '#457b9d', label: 'changed title' },
  moved_group:      { icon: '⇢', color: '#e9c46a', label: 'moved group' },
  subtask_added:    { icon: '+', color: '#2a9d8f', label: 'added subtask' },
  comment_added:    { icon: '💬', color: '#457b9d', label: 'commented' },
};

type FeedItem =
  | { kind: 'history'; entry: HistoryEntry; time: number }
  | { kind: 'comment'; comment: CommentNode; time: number };

export default function TaskDetailPage() {
  const { id, taskId } = useParams();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState('');
  const [myId, setMyId] = useState(0);
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<'activity' | 'subtasks'>('activity');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const t = getToken();
    const uid = getTokenUserId();
    setToken(t); setMyId(uid);
    if (!id || !taskId) return;
    const auth = { Authorization: `Bearer ${t}` };
    fetch(`/api/projects/members?project_id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => {
        if (!Array.isArray(d)) return;
        setMembers(d);
        const me = d.find((m: Member) => m.id === uid);
        if (me) setMyRole(me.role);
      });
    // Load task first, then load related data using resolved numeric id
    fetch(`/api/tasks?task_id=${taskId}`, { headers: auth })
      .then(r => r.json()).then(d => {
        if (d && d.id) {
          setTask(d);
          setEditStatus(d.status);
          setEditPriority(d.priority);
          setEditAssignee(d.assignee_id ? String(d.assignee_id) : '');
          // Now load related data with the real numeric id
          fetch(`/api/tasks?parent_task_id=${d.id}`, { headers: auth }).then(r => r.json()).then(r => Array.isArray(r) && setSubtasks(r));
          fetch(`/api/comments?entity_type=task&entity_id=${d.id}`, { headers: auth }).then(r => r.json()).then(r => Array.isArray(r) && setComments(buildCommentTree(r)));
          fetch(`/api/tasks/history?task_id=${d.id}`, { headers: auth }).then(r => r.json()).then(r => Array.isArray(r) && setHistory(r));
        }
      });
  }, [id, taskId]);

  function loadTask(t = token) {
    fetch(`/api/tasks?task_id=${taskId}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => {
        if (d && d.id) {
          setTask(d);
          setEditStatus(d.status);
          setEditPriority(d.priority);
          setEditAssignee(d.assignee_id ? String(d.assignee_id) : '');
        }
      });
  }
  function loadSubtasks(t = token) {
    if (!task) return;
    fetch(`/api/tasks?parent_task_id=${task.id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setSubtasks(d));
  }
  function loadComments(t = token) {
    if (!task) return;
    fetch(`/api/comments?entity_type=task&entity_id=${task.id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }
  function loadHistory(t = token) {
    if (!task) return;
    fetch(`/api/tasks/history?task_id=${task.id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setHistory(d));
  }

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function updateTask(fields: Record<string, unknown>) {
    if (!task) return;
    setSaving(true); setSaveError('');
    const res = await fetch('/api/tasks', { method: 'PUT', headers: h, body: JSON.stringify({ id: task.id, title: task.title, ...fields }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(data.error || 'Failed'); return; }
    loadTask(); loadHistory();
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim() || !task) return;
    await fetch('/api/tasks', { method: 'POST', headers: h, body: JSON.stringify({ project_id: Number(id), parent_task_id: task.id, title: newSubtask, priority: 'medium' }) });
    setNewSubtask(''); loadSubtasks(); loadHistory();
  }

  async function toggleSubtask(sub: Subtask) {
    await fetch('/api/tasks', { method: 'PUT', headers: h, body: JSON.stringify({ id: sub.id, title: sub.title, status: sub.status === 'done' ? 'todo' : 'done' }) });
    loadSubtasks();
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !task) return;
    setPosting(true);
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'task', entity_id: task.id, content: newComment }) });
    setNewComment(''); setPosting(false); loadComments(); loadHistory();
  }

  async function replyComment(parentId: number, content: string) {
    if (!task) return;
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'task', entity_id: task.id, content, parent_id: parentId }) });
    loadComments();
  }
  async function resolveComment(cid: number, resolved: boolean) {
    await fetch('/api/comments', { method: 'PUT', headers: h, body: JSON.stringify({ id: cid, resolve: resolved, unresolve: !resolved }) });
    loadComments();
  }
  async function deleteComment(cid: number) {
    await fetch(`/api/comments?id=${cid}`, { method: 'DELETE', headers: h });
    loadComments();
  }

  function toggleItem(key: string) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const commentTree = buildCommentTree(comments);
  const canReopen = ['owner', 'manager'].includes(myRole);

  // Build feed: newest first
  const feed: FeedItem[] = [
    ...history.filter(e => e.action !== 'comment_added').map(e => ({ kind: 'history' as const, entry: e, time: new Date(e.created_at).getTime() })),
    ...commentTree.map(c => ({ kind: 'comment' as const, comment: c, time: new Date(c.created_at).getTime() })),
  ].sort((a, b) => b.time - a.time);

  if (!task) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-4xl mb-3 text-center">⏳<br /><span className="text-sm" style={{ color: '#6b7a8d' }}>Loading...</span></div>
    </div>
  );

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5 flex-wrap" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557]">Projects</Link><span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[#1d3557]">Overview</Link><span>/</span>
        <Link href={`/projects/${id}/tasks`} className="hover:text-[#1d3557]">Tasks</Link><span>/</span>
        <span className="font-bold truncate max-w-48" style={{ color: '#1d3557' }}>{task.title}</span>
      </div>

      {/* Task header */}
      <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: '1px solid #d0dce8' }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {task.group_name && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: task.group_color || '#457b9d' }}>{task.group_name}</span>
              )}
              <span className="text-xs" style={{ color: '#94a3b8' }}>#{task.id}</span>
            </div>
            <h1 className="text-xl font-black" style={{ color: '#1d3557' }}>{task.title}</h1>
            {task.description && <p className="text-sm mt-1" style={{ color: '#6b7a8d' }}>{task.description}</p>}
          </div>
          <button onClick={() => router.back()} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-gray-100 transition" style={{ color: '#6b7a8d', border: '1px solid #d0dce8' }}>← Back</button>
        </div>

        {/* Inline controls */}
        <div className="flex items-center gap-3 flex-wrap pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Status</span>
            <select value={editStatus}
              onChange={e => {
                const s = e.target.value;
                if (task.status === 'done' && s !== 'done' && !canReopen) { setSaveError('Only manager/owner can reopen'); return; }
                setEditStatus(s); updateTask({ status: s });
              }}
              className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
              style={{ background: statusColors[editStatus] + '20', color: statusColors[editStatus], border: `1.5px solid ${statusColors[editStatus]}50` }}>
              {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Priority</span>
            <select value={editPriority}
              onChange={e => { setEditPriority(e.target.value); updateTask({ priority: e.target.value }); }}
              className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
              style={{ background: priorityColors[editPriority] + '20', color: priorityColors[editPriority], border: `1.5px solid ${priorityColors[editPriority]}50` }}>
              {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Assignee</span>
            <select value={editAssignee}
              onChange={e => { setEditAssignee(e.target.value); updateTask({ assignee_id: e.target.value ? Number(e.target.value) : null }); }}
              className="text-xs px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
              style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
              <option value="">{task.assignee_name || 'Unassigned'}</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
          </div>
          {task.due_date && <span className="text-xs" style={{ color: '#6b7a8d' }}>📅 {new Date(task.due_date).toLocaleDateString()}</span>}
          {saving && <span className="text-xs" style={{ color: '#457b9d' }}>Saving...</span>}
          {saveError && <span className="text-xs font-bold" style={{ color: '#e63946' }}>⚠ {saveError}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: '#e8f0f7' }}>
        {[
          { key: 'activity' as const, label: `📋 Activity (${feed.length})` },
          { key: 'subtasks' as const, label: `✅ Subtasks (${subtasks.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition"
            style={{ background: activeTab === tab.key ? '#1d3557' : 'transparent', color: activeTab === tab.key ? '#fff' : '#6b7a8d' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ACTIVITY TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-2">
          {/* Comment input */}
          <div className="bg-white rounded-2xl p-4 mb-2" style={{ border: '1px solid #d0dce8' }}>
            <form onSubmit={postComment} className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: `hsl(${(myId * 37) % 360}, 55%, 50%)` }}>
                {String.fromCharCode(65 + (myId % 26))}
              </div>
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <button type="submit" disabled={posting || !newComment.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition"
                style={{ background: '#457b9d' }}>
                {posting ? '...' : 'Post'}
              </button>
            </form>
          </div>

          {feed.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '2px dashed #d0dce8' }}>
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm" style={{ color: '#6b7a8d' }}>No activity yet</div>
            </div>
          ) : (
            feed.map((item) => {
              if (item.kind === 'history') {
                const cfg = actionCfg[item.entry.action] || { icon: '•', color: '#94a3b8', label: item.entry.action };
                const key = `h-${item.entry.id}`;
                const isOpen = expandedItems.has(key);
                const hasDetail = !!(item.entry.old_value || item.entry.new_value);
                return (
                  <div key={key} className="bg-white rounded-xl overflow-hidden transition-all"
                    style={{ border: '1px solid #e2e8f0' }}>
                    {/* Compact row */}
                    <div
                      className={`flex items-center gap-3 px-4 py-2.5 ${hasDetail ? 'cursor-pointer hover:bg-[#f8fafc]' : ''} transition`}
                      onClick={() => hasDetail && toggleItem(key)}>
                      {/* Icon */}
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: cfg.color }}>
                        {cfg.icon}
                      </div>
                      {/* Summary */}
                      <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-bold" style={{ color: '#1d3557' }}>{item.entry.changed_by_name}</span>
                        <span className="text-xs" style={{ color: '#6b7a8d' }}>{cfg.label}</span>
                        {/* Inline pill preview */}
                        {item.entry.new_value && !isOpen && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold truncate max-w-32"
                            style={{ background: cfg.color + '15', color: cfg.color }}>
                            {item.entry.new_value.length > 24 ? item.entry.new_value.substring(0, 24) + '…' : item.entry.new_value}
                          </span>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>
                        {new Date(item.entry.created_at).toLocaleString()}
                      </span>
                      {hasDetail && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
                          className="flex-shrink-0 transition-transform duration-200"
                          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      )}
                    </div>
                    {/* Expanded detail */}
                    {isOpen && hasDetail && (
                      <div className="px-4 pb-3 pt-1" style={{ borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.entry.old_value && (
                            <>
                              <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>From</span>
                              <span className="text-xs px-2 py-1 rounded-lg line-through" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                                {item.entry.old_value}
                              </span>
                            </>
                          )}
                          {item.entry.old_value && item.entry.new_value && (
                            <span className="text-xs" style={{ color: '#94a3b8' }}>→</span>
                          )}
                          {item.entry.new_value && (
                            <>
                              <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>{item.entry.old_value ? 'To' : 'Value'}</span>
                              <span className="text-xs px-2 py-1 rounded-lg font-bold" style={{ background: '#f0fdf9', color: '#0f766e' }}>
                                {item.entry.new_value}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Comment item
              const key = `c-${item.comment.id}`;
              const isOpen = expandedItems.has(key);
              return (
                <div key={key} className="bg-white rounded-xl overflow-hidden"
                  style={{ border: '1px solid #e2e8f0' }}>
                  {/* Compact comment row */}
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#f8fafc] transition"
                    onClick={() => toggleItem(key)}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: `hsl(${(item.comment.user_name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                      {item.comment.user_name[0]}
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: '#1d3557' }}>{item.comment.user_name}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: '#6b7a8d' }}>commented</span>
                      {!isOpen && (
                        <span className="text-xs truncate" style={{ color: '#94a3b8' }}>
                          — {item.comment.content.length > 50 ? item.comment.content.substring(0, 50) + '…' : item.comment.content}
                        </span>
                      )}
                      {item.comment.is_resolved && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#f0fdf9', color: '#0f766e' }}>✓</span>
                      )}
                      {(item.comment.children?.length ?? 0) > 0 && !isOpen && (
                        <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>
                          💬 {item.comment.children!.length}
                        </span>
                      )}
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>
                      {new Date(item.comment.created_at).toLocaleString()}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
                      className="flex-shrink-0 transition-transform duration-200"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  {/* Expanded comment thread */}
                  {isOpen && (
                    <div className="px-4 pb-3 pt-1" style={{ borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
                      <CommentThread
                        comment={item.comment}
                        currentUserId={myId}
                        userRole={myRole}
                        onReply={replyComment}
                        onResolve={resolveComment}
                        onDelete={deleteComment}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUBTASKS TAB */}
      {activeTab === 'subtasks' && (
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #d0dce8' }}>
          <form onSubmit={addSubtask} className="flex gap-2 mb-4">
            <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Add a subtask..."
              className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: '#2a9d8f' }}>+ Add</button>
          </form>
          {subtasks.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ border: '2px dashed #e2e8f0' }}>
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm" style={{ color: '#6b7a8d' }}>No subtasks yet</div>
            </div>
          ) : (
            <div className="space-y-2">
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <input type="checkbox" checked={sub.status === 'done'} onChange={() => toggleSubtask(sub)}
                    className="w-4 h-4 rounded accent-teal-600 flex-shrink-0 cursor-pointer" />
                  <span className={`flex-1 text-sm font-medium ${sub.status === 'done' ? 'line-through' : ''}`}
                    style={{ color: sub.status === 'done' ? '#94a3b8' : '#1d3557' }}>
                    {sub.title}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: statusColors[sub.status] + '20', color: statusColors[sub.status] }}>
                    {sub.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold" style={{ color: priorityColors[sub.priority] }}>{sub.priority}</span>
                </div>
              ))}
              <div className="text-xs pt-1" style={{ color: '#6b7a8d' }}>
                {subtasks.filter(s => s.status === 'done').length}/{subtasks.length} completed
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
