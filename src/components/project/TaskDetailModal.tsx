'use client';
import { useEffect, useState } from 'react';
import CommentThread, { CommentNode, buildCommentTree } from './CommentThread';
import { HistoryEntry } from './TaskHistory';

interface Task {
  id: number; title: string; description: string; status: string; priority: string;
  assignee_name: string; due_date: string; subtask_count: number; comment_count: number;
  group_name: string; group_color: string; created_at: string;
}

interface Props {
  task: Task;
  projectId: number;
  userRole: string;
  currentUserId: number;
  members: { id: number; name: string; role: string }[];
  onClose: () => void;
  onTaskUpdated: () => void;
}

const statusOptions = ['todo','in_progress','in_review','done','cancelled'];
const priorityOptions = ['low','medium','high','critical'];
const statusColors: Record<string, string> = {
  todo: '#94a3b8', in_progress: '#457b9d', in_review: '#f4a261', done: '#2a9d8f', cancelled: '#e63946'
};
const priorityColors: Record<string, string> = {
  low: '#94a3b8', medium: '#457b9d', high: '#f4a261', critical: '#e63946'
};
const actionConfig: Record<string, { icon: string; color: string; label: string }> = {
  created:             { icon: '✦', color: '#2a9d8f', label: 'created this task' },
  status_changed:      { icon: '⇄', color: '#457b9d', label: 'changed status' },
  closed:              { icon: '✓', color: '#0f766e', label: 'closed the task' },
  reopened:            { icon: '↺', color: '#c2410c', label: 'reopened the task' },
  assigned:            { icon: '→', color: '#6d6875', label: 'assigned task' },
  unassigned:          { icon: '←', color: '#94a3b8', label: 'unassigned task' },
  priority_changed:    { icon: '!', color: '#f4a261', label: 'changed priority' },
  title_changed:       { icon: '✎', color: '#457b9d', label: 'changed title' },
  description_changed: { icon: '✎', color: '#457b9d', label: 'changed description' },
  due_date_changed:    { icon: '📅', color: '#6d6875', label: 'changed due date' },
  moved_group:         { icon: '⇢', color: '#e9c46a', label: 'moved to group' },
  subtask_added:       { icon: '+', color: '#2a9d8f', label: 'added subtask' },
  comment_added:       { icon: '💬', color: '#457b9d', label: 'commented' },
  document_attached:   { icon: '📎', color: '#6d6875', label: 'attached document' },
};

export default function TaskDetailModal({ task, projectId, userRole, currentUserId, members, onClose, onTaskUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'subtasks'|'activity'>('subtasks');
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [editStatus, setEditStatus] = useState(task.status);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editAssignee, setEditAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [h, setH] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = localStorage.getItem('token') || '';
    setToken(t);
    setH({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });
    loadAll(t);
  }, [task.id]);

  function loadAll(t: string) {
    const auth = { Authorization: `Bearer ${t}` };
    fetch(`/api/tasks?parent_task_id=${task.id}`, { headers: auth })
      .then(r => r.json()).then(d => Array.isArray(d) && setSubtasks(d));
    fetch(`/api/comments?entity_type=task&entity_id=${task.id}`, { headers: auth })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
    fetch(`/api/tasks/history?task_id=${task.id}`, { headers: auth })
      .then(r => r.json()).then(d => Array.isArray(d) && setHistory(d));
  }

  function reload() {
    loadAll(token);
  }

  async function updateTask(fields: Record<string, unknown>) {
    setSaving(true); setError('');
    const res = await fetch('/api/tasks', { method: 'PUT', headers: h, body: JSON.stringify({ id: task.id, ...fields }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    fetch(`/api/tasks/history?task_id=${task.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setHistory(d));
    onTaskUpdated();
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const res = await fetch('/api/tasks', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectId, parent_task_id: task.id, title: newSubtask, priority: 'medium' }) });
    if (res.ok) { setNewSubtask(''); reload(); }
  }

  async function moveSubtask(subtaskId: number, status: string) {
    await fetch('/api/tasks', { method: 'PUT', headers: h, body: JSON.stringify({ id: subtaskId, status }) });
    fetch(`/api/tasks?parent_task_id=${task.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setSubtasks(d));
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'task', entity_id: task.id, content: newComment }) });
    setNewComment('');
    reload();
  }

  async function replyComment(parentId: number, content: string) {
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'task', entity_id: task.id, content, parent_id: parentId }) });
    fetch(`/api/comments?entity_type=task&entity_id=${task.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }

  async function resolveComment(id: number, resolved: boolean) {
    await fetch('/api/comments', { method: 'PUT', headers: h, body: JSON.stringify({ id, resolve: resolved, unresolve: !resolved }) });
    fetch(`/api/comments?entity_type=task&entity_id=${task.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }

  async function deleteComment(id: number) {
    await fetch(`/api/comments?id=${id}`, { method: 'DELETE', headers: h });
    fetch(`/api/comments?entity_type=task&entity_id=${task.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }

  // Build merged activity feed: history events + top-level comments, sorted by time
  const commentTree = buildCommentTree(comments);
  const topLevelComments = commentTree; // already roots only

  // History entries that are NOT comment_added (those are shown via comment thread)
  const historyEvents = history.filter(e => e.action !== 'comment_added');

  type ActivityItem =
    | { kind: 'history'; entry: HistoryEntry; time: Date }
    | { kind: 'comment'; comment: CommentNode; time: Date };

  const activityFeed: ActivityItem[] = [
    ...historyEvents.map(e => ({ kind: 'history' as const, entry: e, time: new Date(e.created_at) })),
    ...topLevelComments.map(c => ({ kind: 'comment' as const, comment: c, time: new Date(c.created_at) })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  const canChangeStatus = userRole !== 'viewer';
  const canReopen = ['owner','manager','designer'].includes(userRole);

  const tabs = [
    { key: 'subtasks' as const, label: `Subtasks (${subtasks.length})` },
    { key: 'activity' as const, label: `Activity (${comments.length + historyEvents.length})` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-4" style={{ background: 'rgba(29,53,87,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" style={{ border: '1px solid #d0dce8' }}>

        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid #d0dce8' }}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {task.group_name && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: task.group_color || '#457b9d' }}>
                  {task.group_name}
                </span>
              )}
              <span className="text-xs" style={{ color: '#6b7a8d' }}>Task #{task.id}</span>
            </div>
            <h2 className="text-xl font-black" style={{ color: '#1d3557' }}>{task.title}</h2>
            {task.description && <p className="text-sm mt-1" style={{ color: '#6b7a8d' }}>{task.description}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition hover:bg-gray-100" style={{ color: '#6b7a8d' }}>✕</button>
        </div>

        {/* Meta bar */}
        <div className="px-6 py-3 flex items-center gap-4 flex-wrap" style={{ background: '#f8fafc', borderBottom: '1px solid #d0dce8' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Status</span>
            <select
              value={editStatus}
              onChange={e => {
                const s = e.target.value;
                if (task.status === 'done' && s !== 'done' && !canReopen) {
                  setError('Only manager or owner can reopen a closed task'); return;
                }
                setEditStatus(s);
                updateTask({ status: s, title: task.title, priority: editPriority });
              }}
              disabled={!canChangeStatus}
              className="text-xs font-bold px-2 py-1 rounded-lg focus:outline-none"
              style={{ background: statusColors[editStatus] + '20', color: statusColors[editStatus], border: `1.5px solid ${statusColors[editStatus]}` }}
            >
              {statusOptions.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Priority</span>
            <select
              value={editPriority}
              onChange={e => { setEditPriority(e.target.value); updateTask({ priority: e.target.value, title: task.title, status: editStatus }); }}
              className="text-xs font-bold px-2 py-1 rounded-lg focus:outline-none"
              style={{ background: priorityColors[editPriority] + '20', color: priorityColors[editPriority], border: `1.5px solid ${priorityColors[editPriority]}` }}
            >
              {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Assignee</span>
            <select
              value={editAssignee}
              onChange={e => { setEditAssignee(e.target.value); updateTask({ assignee_id: e.target.value ? Number(e.target.value) : null, title: task.title, status: editStatus, priority: editPriority }); }}
              className="text-xs px-2 py-1 rounded-lg focus:outline-none"
              style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}
            >
              <option value="">{task.assignee_name || 'Unassigned'}</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {task.due_date && (
            <div className="flex items-center gap-1 text-xs" style={{ color: '#6b7a8d' }}>
              <span>📅</span><span>{new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
          {saving && <span className="text-xs" style={{ color: '#457b9d' }}>Saving...</span>}
          {error && <span className="text-xs font-bold" style={{ color: '#e63946' }}>⚠ {error}</span>}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-1" style={{ borderBottom: '1px solid #d0dce8' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 text-sm font-bold rounded-t-lg transition -mb-px"
              style={{
                background: activeTab === tab.key ? '#fff' : 'transparent',
                color: activeTab === tab.key ? '#1d3557' : '#6b7a8d',
                border: activeTab === tab.key ? '1.5px solid #d0dce8' : '1.5px solid transparent',
                borderBottom: activeTab === tab.key ? '1.5px solid #fff' : '1.5px solid transparent',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* SUBTASKS */}
          {activeTab === 'subtasks' && (
            <div>
              <form onSubmit={addSubtask} className="flex gap-2 mb-5">
                <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Add a subtask..."
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
                <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-black text-white hover:opacity-90 transition" style={{ background: '#2a9d8f' }}>
                  + Add
                </button>
              </form>
              {subtasks.length === 0 ? (
                <div className="text-center py-10 rounded-2xl" style={{ border: '2px dashed #d0dce8' }}>
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-sm" style={{ color: '#6b7a8d' }}>No subtasks yet</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3" style={{ border: '1px solid #d0dce8' }}>
                      <input type="checkbox" checked={sub.status === 'done'}
                        onChange={e => moveSubtask(sub.id, e.target.checked ? 'done' : 'todo')}
                        className="w-4 h-4 rounded accent-teal-600 flex-shrink-0" />
                      <span className={`flex-1 text-sm font-medium ${sub.status === 'done' ? 'line-through' : ''}`}
                        style={{ color: sub.status === 'done' ? '#94a3b8' : '#1d3557' }}>
                        {sub.title}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: statusColors[sub.status] + '20', color: statusColors[sub.status] }}>
                        {sub.status.replace('_',' ')}
                      </span>
                      <span className="text-xs font-bold" style={{ color: priorityColors[sub.priority] }}>{sub.priority}</span>
                      <select value={sub.status} onChange={e => moveSubtask(sub.id, e.target.value)}
                        className="text-xs px-2 py-1 rounded-lg focus:outline-none"
                        style={{ background: '#f1faee', border: '1px solid #d0dce8', color: '#1d3557' }}>
                        {statusOptions.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                    </div>
                  ))}
                  <div className="text-xs pt-1" style={{ color: '#6b7a8d' }}>
                    {subtasks.filter(s => s.status === 'done').length}/{subtasks.length} completed
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIVITY — comments + history merged */}
          {activeTab === 'activity' && (
            <div>
              {/* New comment box */}
              <form onSubmit={postComment} className="flex gap-2 mb-6">
                <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..."
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
                <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-black text-white hover:opacity-90 transition" style={{ background: '#457b9d' }}>
                  Post
                </button>
              </form>

              {activityFeed.length === 0 ? (
                <div className="text-center py-10 rounded-2xl" style={{ border: '2px dashed #d0dce8' }}>
                  <div className="text-3xl mb-2">📋</div>
                  <div className="text-sm" style={{ color: '#6b7a8d' }}>No activity yet</div>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5" style={{ background: '#e2e8f0' }} />
                  <div className="space-y-4">
                    {activityFeed.map((item, idx) => {
                      if (item.kind === 'history') {
                        const cfg = actionConfig[item.entry.action] || { icon: '•', color: '#94a3b8', label: item.entry.action };
                        return (
                          <div key={`h-${item.entry.id}`} className="flex gap-4 relative">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 z-10"
                              style={{ background: cfg.color }}>
                              {cfg.icon}
                            </div>
                            <div className="flex-1 pb-1 pt-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold" style={{ color: '#1d3557' }}>{item.entry.changed_by_name}</span>
                                <span className="text-sm" style={{ color: '#6b7a8d' }}>{cfg.label}</span>
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
                              <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{item.time.toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      }

                      // comment
                      return (
                        <div key={`c-${item.comment.id}`} className="flex gap-4 relative">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 z-10"
                            style={{ background: '#457b9d' }}>
                            💬
                          </div>
                          <div className="flex-1">
                            {/* Task context header */}
                            <div className="flex items-center gap-2 flex-wrap mb-1 px-1">
                              {task.group_name && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: task.group_color || '#457b9d' }}>
                                  {task.group_name}
                                </span>
                              )}
                              <span className="text-xs font-semibold" style={{ color: '#1d3557' }}>#{task.id} {task.title}</span>
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: statusColors[task.status] + '20', color: statusColors[task.status] }}>
                                {task.status.replace('_', ' ')}
                              </span>
                              <span className="text-xs font-bold" style={{ color: priorityColors[task.priority] }}>{task.priority}</span>
                            </div>
                            <CommentThread
                              comment={item.comment}
                              currentUserId={currentUserId}
                              userRole={userRole}
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
      </div>
    </div>
  );
}
