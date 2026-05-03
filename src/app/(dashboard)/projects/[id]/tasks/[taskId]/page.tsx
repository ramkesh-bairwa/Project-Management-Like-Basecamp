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
const priorityColors: Record<string, string> = { low: '#94a3b8', medium: '#457b9d', high: '#f4a261', critical: '#e63946' };
const actionLabel: Record<string, { icon: string; color: string; text: string }> = {
  created:             { icon: '✦', color: '#2a9d8f', text: 'created this task' },
  status_changed:      { icon: '⇄', color: '#457b9d', text: 'changed status' },
  closed:              { icon: '✓', color: '#0f766e', text: 'closed the task' },
  reopened:            { icon: '↺', color: '#c2410c', text: 'reopened the task' },
  assigned:            { icon: '→', color: '#6d6875', text: 'assigned task' },
  unassigned:          { icon: '←', color: '#94a3b8', text: 'unassigned task' },
  priority_changed:    { icon: '!', color: '#f4a261', text: 'changed priority' },
  title_changed:       { icon: '✎', color: '#457b9d', text: 'changed title' },
  moved_group:         { icon: '⇢', color: '#e9c46a', text: 'moved to group' },
  subtask_added:       { icon: '+', color: '#2a9d8f', text: 'added subtask' },
};

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
  const [activeTab, setActiveTab] = useState<'subtasks' | 'activity'>('activity');

  // edit state
  const [editStatus, setEditStatus] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editAssignee, setEditAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // subtask form
  const [newSubtask, setNewSubtask] = useState('');

  // comment form
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const t = getToken();
    const uid = getTokenUserId();
    setToken(t);
    setMyId(uid);
    if (!id || !taskId) return;
    const auth = { Authorization: `Bearer ${t}` };

    fetch(`/api/projects/members?project_id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => {
        if (!Array.isArray(d)) return;
        setMembers(d);
        const me = d.find((m: Member) => m.id === uid);
        if (me) setMyRole(me.role);
      });

    loadTask(t);
    loadSubtasks(t);
    loadComments(t);
    loadHistory(t);
  }, [id, taskId]);

  function loadTask(t = token) {
    fetch(`/api/tasks?project_id=${id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => {
        if (!Array.isArray(d)) return;
        const found = d.find((tk: Task) => tk.id === Number(taskId));
        if (found) {
          setTask(found);
          setEditStatus(found.status);
          setEditPriority(found.priority);
          setEditAssignee(found.assignee_id ? String(found.assignee_id) : '');
        }
      });
  }

  function loadSubtasks(t = token) {
    fetch(`/api/tasks?parent_task_id=${taskId}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setSubtasks(d));
  }

  function loadComments(t = token) {
    fetch(`/api/comments?entity_type=task&entity_id=${taskId}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }

  function loadHistory(t = token) {
    fetch(`/api/tasks/history?task_id=${taskId}`, { headers: { Authorization: `Bearer ${t}` } })
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
    if (!newSubtask.trim()) return;
    const res = await fetch('/api/tasks', { method: 'POST', headers: h, body: JSON.stringify({ project_id: Number(id), parent_task_id: Number(taskId), title: newSubtask, priority: 'medium' }) });
    if (res.ok) { setNewSubtask(''); loadSubtasks(); loadHistory(); }
  }

  async function toggleSubtask(sub: Subtask) {
    await fetch('/api/tasks', { method: 'PUT', headers: h, body: JSON.stringify({ id: sub.id, title: sub.title, status: sub.status === 'done' ? 'todo' : 'done' }) });
    loadSubtasks();
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'task', entity_id: Number(taskId), content: newComment }) });
    setNewComment(''); loadComments(); loadHistory();
  }

  async function replyComment(parentId: number, content: string) {
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'task', entity_id: Number(taskId), content, parent_id: parentId }) });
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

  // Build activity feed: history (non-comment) + top-level comments, sorted by time
  const commentTree = buildCommentTree(comments);
  const historyEvents = history.filter(e => e.action !== 'comment_added');
  type FeedItem = { kind: 'history'; entry: HistoryEntry; time: number } | { kind: 'comment'; comment: CommentNode; time: number };
  const feed: FeedItem[] = [
    ...historyEvents.map(e => ({ kind: 'history' as const, entry: e, time: new Date(e.created_at).getTime() })),
    ...commentTree.map(c => ({ kind: 'comment' as const, comment: c, time: new Date(c.created_at).getTime() })),
  ].sort((a, b) => a.time - b.time);

  const canReopen = ['owner', 'manager', 'designer'].includes(myRole);

  if (!task) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="text-4xl mb-3">⏳</div>
        <div className="text-sm" style={{ color: '#6b7a8d' }}>Loading task...</div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5 flex-wrap" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557]">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[#1d3557]">Overview</Link>
        <span>/</span>
        <Link href={`/projects/${id}/tasks`} className="hover:text-[#1d3557]">Tasks</Link>
        <span>/</span>
        <span className="font-bold truncate max-w-48" style={{ color: '#1d3557' }}>{task.title}</span>
      </div>

      {/* Task header card */}
      <div className="rounded-2xl p-6 mb-5" style={{ background: '#fff', border: '1px solid #d0dce8' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {task.group_name && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: task.group_color || '#457b9d' }}>
                  {task.group_name}
                </span>
              )}
              <span className="text-xs" style={{ color: '#94a3b8' }}>Task #{task.id}</span>
            </div>
            <h1 className="text-2xl font-black mb-1" style={{ color: '#1d3557' }}>{task.title}</h1>
            {task.description && <p className="text-sm" style={{ color: '#6b7a8d' }}>{task.description}</p>}
          </div>
          <button onClick={() => router.back()}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition"
            style={{ color: '#6b7a8d', border: '1px solid #d0dce8' }}>
            ← Back
          </button>
        </div>

        {/* Meta controls */}
        <div className="flex items-center gap-4 flex-wrap pt-4" style={{ borderTop: '1px solid #f1f5f9' }}>
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Status</span>
            <select value={editStatus}
              onChange={e => {
                const s = e.target.value;
                if (task.status === 'done' && s !== 'done' && !canReopen) { setSaveError('Only manager or owner can reopen'); return; }
                setEditStatus(s);
                updateTask({ status: s, priority: editPriority });
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none"
              style={{ background: statusColors[editStatus] + '20', color: statusColors[editStatus], border: `1.5px solid ${statusColors[editStatus]}` }}>
              {statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Priority</span>
            <select value={editPriority}
              onChange={e => { setEditPriority(e.target.value); updateTask({ priority: e.target.value, status: editStatus }); }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none"
              style={{ background: priorityColors[editPriority] + '20', color: priorityColors[editPriority], border: `1.5px solid ${priorityColors[editPriority]}` }}>
              {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Assignee</span>
            <select value={editAssignee}
              onChange={e => { setEditAssignee(e.target.value); updateTask({ assignee_id: e.target.value ? Number(e.target.value) : null, status: editStatus, priority: editPriority }); }}
              className="text-xs px-3 py-1.5 rounded-lg focus:outline-none"
              style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
              <option value="">{task.assignee_name || 'Unassigned'}</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
          </div>

          {task.due_date && (
            <span className="text-xs flex items-center gap-1" style={{ color: '#6b7a8d' }}>
              📅 {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}

          {saving && <span className="text-xs" style={{ color: '#457b9d' }}>Saving...</span>}
          {saveError && <span className="text-xs font-bold" style={{ color: '#e63946' }}>⚠ {saveError}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: '#e8f0f7' }}>
        {[
          { key: 'activity' as const, label: `Activity (${feed.length})` },
          { key: 'subtasks' as const, label: `Subtasks (${subtasks.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-5 py-2 rounded-lg text-sm font-bold transition"
            style={{ background: activeTab === tab.key ? '#1d3557' : 'transparent', color: activeTab === tab.key ? '#fff' : '#6b7a8d' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBTASKS tab */}
      {activeTab === 'subtasks' && (
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #d0dce8' }}>
          <form onSubmit={addSubtask} className="flex gap-2 mb-5">
            <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Add a subtask..."
              className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition" style={{ background: '#2a9d8f' }}>
              + Add
            </button>
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

      {/* ACTIVITY tab — comments + history interleaved */}
      {activeTab === 'activity' && (
        <div>
          {/* New comment box */}
          <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid #d0dce8' }}>
            <form onSubmit={postComment} className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                style={{ background: '#457b9d' }}>
                {myId % 6 === 0 ? '👤' : String.fromCharCode(65 + (myId % 26))}
              </div>
              <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition" style={{ background: '#457b9d' }}>
                Post
              </button>
            </form>
          </div>

          {feed.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ border: '2px dashed #d0dce8' }}>
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm" style={{ color: '#6b7a8d' }}>No activity yet</div>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-0.5" style={{ background: '#e2e8f0' }} />
              <div className="space-y-4">
                {feed.map((item, i) => {
                  if (item.kind === 'history') {
                    const cfg = actionLabel[item.entry.action] || { icon: '•', color: '#94a3b8', text: item.entry.action };
                    return (
                      <div key={`h-${item.entry.id}`} className="flex gap-4 relative">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 z-10"
                          style={{ background: cfg.color }}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 pt-0.5 pb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: '#1d3557' }}>{item.entry.changed_by_name}</span>
                            <span className="text-sm" style={{ color: '#6b7a8d' }}>{cfg.text}</span>
                            {item.entry.old_value && item.entry.new_value && (
                              <span className="text-xs">
                                <span className="px-1.5 py-0.5 rounded line-through" style={{ background: '#fef2f2', color: '#b91c1c' }}>{item.entry.old_value}</span>
                                <span className="mx-1" style={{ color: '#94a3b8' }}>→</span>
                                <span className="px-1.5 py-0.5 rounded" style={{ background: '#f0fdf9', color: '#0f766e' }}>{item.entry.new_value}</span>
                              </span>
                            )}
                            {!item.entry.old_value && item.entry.new_value && item.entry.action !== 'created' && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#f0fdf9', color: '#0f766e' }}>{item.entry.new_value}</span>
                            )}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{new Date(item.entry.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  }

                  // comment
                  return (
                    <div key={`c-${item.comment.id}`} className="flex gap-4 relative">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 z-10"
                        style={{ background: '#457b9d' }}>
                        {item.comment.user_name[0]}
                      </div>
                      <div className="flex-1">
                        <CommentThread
                          comment={item.comment}
                          currentUserId={myId}
                          userRole={myRole}
                          onReply={replyComment}
                          onResolve={resolveComment}
                          onDelete={deleteComment}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
