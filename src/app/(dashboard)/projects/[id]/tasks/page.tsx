'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';
import ConfirmModal from '@/components/ConfirmModal';

interface Task {
  id: number; title: string; description: string; status: string; priority: string;
  assignee_name: string; due_date: string; subtask_count: number; comment_count: number;
  group_name: string; group_color: string; created_at: string;
}
interface Group { id: number; name: string; color: string }
interface Member { id: number; name: string; role: string }

const statusCols = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'] as const;
const statusCfg: Record<string, { label: string; bg: string; border: string; head: string; headText: string }> = {
  todo:        { label: 'To Do',       bg: '#f8fafc', border: '#e2e8f0', head: '#e2e8f0', headText: '#475569' },
  in_progress: { label: 'In Progress', bg: '#eff6ff', border: '#bfdbfe', head: '#bfdbfe', headText: '#1d4ed8' },
  in_review:   { label: 'In Review',   bg: '#fff7ed', border: '#fed7aa', head: '#fed7aa', headText: '#c2410c' },
  done:        { label: 'Done',        bg: '#f0fdf9', border: '#99f6e4', head: '#99f6e4', headText: '#0f766e' },
  cancelled:   { label: 'Cancelled',   bg: '#fef2f2', border: '#fecaca', head: '#fecaca', headText: '#b91c1c' },
};
const priorityColors: Record<string, string> = { low: '#94a3b8', medium: '#457b9d', high: '#f4a261', critical: '#e63946' };

export default function ProjectTasksPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState('');
  const [token, setToken] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // inline create task form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', group_id: '', assignee_id: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const t = getToken();
    const uid = getTokenUserId();
    setToken(t);
    if (!id) return;
    const auth = { Authorization: `Bearer ${t}` };
    fetch(`/api/projects?id=${id}`, { headers: auth })
      .then(r => r.json()).then(proj => {
        if (!proj?.id) return;
        const pid = proj.id;
        setProjectId(pid);
        fetch(`/api/tasks?project_id=${pid}`, { headers: auth }).then(r => r.json()).then(d => Array.isArray(d) && setTasks(d));
        fetch(`/api/project-groups?project_id=${pid}`, { headers: auth }).then(r => r.json()).then(d => Array.isArray(d) && setGroups(d));
        fetch(`/api/projects/members?project_id=${pid}`, { headers: auth }).then(r => r.json()).then(d => {
          if (!Array.isArray(d)) return;
          setMembers(d);
          const me = d.find((m: Member) => m.id === uid);
          if (me) setMyRole(me.role);
          else router.replace('/projects');
        });
      });
  }, [id]);

  function loadTasks(t = token) {
    if (!projectId) return;
    fetch(`/api/tasks?project_id=${projectId}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setTasks(d));
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true); setFormError('');
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        group_id: form.group_id ? Number(form.group_id) : null,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        title: form.title, description: form.description,
        priority: form.priority, status: form.status,
        due_date: form.due_date || null,
      })
    });
    setSaving(false);
    if (res.ok) {
      loadTasks();
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', group_id: '', assignee_id: '', due_date: '' });
    } else {
      const d = await res.json();
      setFormError(d.error || 'Failed to create task');
    }
  }

  async function confirmDeleteTask() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/tasks?id=${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    setDeleting(false);
    setDeleteTarget(null);
    loadTasks();
  }

  const filtered = tasks.filter(t =>
    (!filterGroup || String((t as unknown as { group_id: number }).group_id) === filterGroup) &&
    (!filterStatus || t.status === filterStatus)
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557]">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[#1d3557]">Overview</Link>
        <span>/</span>
        <span className="font-bold" style={{ color: '#1d3557' }}>Tasks</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="text-xl font-black" style={{ color: '#1d3557' }}>Tasks ({filtered.length})</h2>
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
          <option value="">All Groups</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
          <option value="">All Status</option>
          {statusCols.map(s => <option key={s} value={s}>{statusCfg[s].label}</option>)}
        </select>
        <div className="flex gap-1 p-1 rounded-xl ml-auto" style={{ background: '#e8f0f7' }}>
          {(['board', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-sm font-bold transition capitalize"
              style={{ background: view === v ? '#1d3557' : 'transparent', color: view === v ? '#fff' : '#6b7a8d' }}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
          style={{ background: showForm ? '#6b7a8d' : '#e63946' }}>
          {showForm ? '✕ Cancel' : '+ New Task'}
        </button>
      </div>

      {/* Inline create task form */}
      {showForm && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#f8fafc', border: '1.5px solid #d0dce8' }}>
          <h3 className="font-black text-base mb-4" style={{ color: '#1d3557' }}>Create New Task</h3>
          <form onSubmit={createTask} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Task title *" autoFocus
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none md:col-span-2"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" rows={2}
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none md:col-span-2"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <select value={form.group_id} onChange={e => setForm(p => ({ ...p, group_id: e.target.value }))}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                <option value="">No Group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select value={form.assignee_id} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                {['low', 'medium', 'high', 'critical'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                {statusCols.map(s => <option key={s} value={s}>{statusCfg[s].label}</option>)}
              </select>
              <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            </div>
            {formError && <p className="text-xs font-bold" style={{ color: '#e63946' }}>⚠ {formError}</p>}
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
              style={{ background: '#e63946' }}>
              {saving ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>
      )}

      {/* Board view */}
      {view === 'board' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {statusCols.map(col => {
            const cfg = statusCfg[col];
            const colTasks = filtered.filter(t => t.status === col);
            return (
              <div key={col} className="rounded-2xl overflow-hidden" style={{ background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: cfg.head }}>
                  <span className="text-sm font-black" style={{ color: cfg.headText }}>{cfg.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.7)', color: cfg.headText }}>{colTasks.length}</span>
                </div>
                <div className="p-3 space-y-2 min-h-24">
                  {colTasks.map(task => (
                    <div key={task.id} onClick={() => router.push(`/projects/${id}/tasks/${task.id}`)}
                      className="bg-white rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition group relative"
                      style={{ border: '1px solid #e8f0f7' }}>
                      {task.group_name && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white mb-1.5 inline-block"
                          style={{ background: task.group_color || '#457b9d' }}>
                          {task.group_name}
                        </span>
                      )}
                      <div className="text-sm font-semibold leading-snug mb-2" style={{ color: '#1d3557' }}>{task.title}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold capitalize" style={{ color: priorityColors[task.priority] }}>{task.priority}</span>
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
                          {task.subtask_count > 0 && <span>✅{task.subtask_count}</span>}
                          {task.comment_count > 0 && <span>💬{task.comment_count}</span>}
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget(task); }}
                            className="hover:bg-red-50 rounded px-1 transition"
                            style={{ color: '#e63946' }}>🗑</button>
                        </div>
                      </div>
                      {task.assignee_name && <div className="text-xs mt-1.5" style={{ color: '#6b7a8d' }}>→ {task.assignee_name}</div>}
                    </div>
                  ))}
                  {colTasks.length === 0 && <div className="text-center py-6 text-xs" style={{ color: '#94a3b8' }}>Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: '#94a3b8' }}>No tasks found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Title', 'Group', 'Status', 'Priority', 'Assignee', 'Due', '✅', '💬', ''].map(c => (
                    <th key={c} className="px-4 py-3 text-left text-xs font-black" style={{ color: '#6b7a8d' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(task => (
                  <tr key={task.id} onClick={() => router.push(`/projects/${id}/tasks/${task.id}`)}
                    className="cursor-pointer hover:bg-[#f8fafc] transition" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1d3557' }}>{task.title}</td>
                    <td className="px-4 py-3">
                      {task.group_name && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: task.group_color || '#457b9d' }}>
                          {task.group_name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: statusCfg[task.status]?.head, color: statusCfg[task.status]?.headText }}>
                        {statusCfg[task.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold capitalize" style={{ color: priorityColors[task.priority] }}>{task.priority}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#6b7a8d' }}>{task.assignee_name || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#6b7a8d' }}>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>{task.subtask_count || 0}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>{task.comment_count || 0}</td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(task); }}
                        className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition"
                        style={{ color: '#e63946', border: '1px solid #fecaca' }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Task"
          message={`Delete "${deleteTarget.title}"? All subtasks and comments will also be removed.`}
          onConfirm={confirmDeleteTask}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
