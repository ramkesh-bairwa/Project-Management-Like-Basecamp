'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';

interface Group { id: number; name: string; description: string; color: string; task_count: number; member_count: number }
interface Task { id: number; title: string; status: string; priority: string; assignee_name: string; subtask_count: number; comment_count: number; description: string; due_date: string; group_name: string; group_color: string; created_at: string }
interface Member { id: number; name: string; role: string }

const statusColors: Record<string, string> = { todo: '#94a3b8', in_progress: '#457b9d', in_review: '#f4a261', done: '#2a9d8f', cancelled: '#e63946' };
const priorityColors: Record<string, string> = { low: '#94a3b8', medium: '#457b9d', high: '#f4a261', critical: '#e63946' };

export default function ProjectGroupsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState('');
  const [token, setToken] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [groupTasks, setGroupTasks] = useState<Record<number, Task[]>>({});

  // inline create group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', color: '#457b9d' });
  const [groupSaving, setGroupSaving] = useState(false);

  // inline add task form per group
  const [showTaskForm, setShowTaskForm] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'medium', assignee_id: '' });

  useEffect(() => {
    const t = getToken();
    const uid = getTokenUserId();
    setToken(t);
    if (!id) return;
    const auth = { Authorization: `Bearer ${t}` };
    fetch(`/api/project-groups?project_id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => Array.isArray(d) && setGroups(d));
    fetch(`/api/projects/members?project_id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => {
        if (!Array.isArray(d)) return;
        setMembers(d);
        const me = d.find((m: Member) => m.id === uid);
        if (me) setMyRole(me.role);
        setLoaded(true);
      });
  }, [id]);

  const h = (t = token) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

  function loadGroups() {
    fetch(`/api/project-groups?project_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setGroups(d));
  }

  function loadGroupTasks(gid: number) {
    fetch(`/api/tasks?group_id=${gid}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setGroupTasks(p => ({ ...p, [gid]: d })));
  }

  function toggleGroup(gid: number) {
    if (expandedGroup === gid) { setExpandedGroup(null); return; }
    setExpandedGroup(gid);
    loadGroupTasks(gid);
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setGroupSaving(true);
    const res = await fetch('/api/project-groups', { method: 'POST', headers: h(), body: JSON.stringify({ ...groupForm, project_id: Number(id) }) });
    setGroupSaving(false);
    if (res.ok) { loadGroups(); setShowGroupForm(false); setGroupForm({ name: '', description: '', color: '#457b9d' }); }
  }

  async function deleteGroup(gid: number) {
    if (!confirm('Delete this group?')) return;
    await fetch(`/api/project-groups?id=${gid}`, { method: 'DELETE', headers: h() });
    loadGroups(); setExpandedGroup(null);
  }

  async function createTask(e: React.FormEvent, gid: number) {
    e.preventDefault();
    const res = await fetch('/api/tasks', { method: 'POST', headers: h(), body: JSON.stringify({
      project_id: Number(id), group_id: gid,
      title: taskForm.title, priority: taskForm.priority,
      assignee_id: taskForm.assignee_id ? Number(taskForm.assignee_id) : null
    })});
    if (res.ok) { loadGroupTasks(gid); setShowTaskForm(null); setTaskForm({ title: '', priority: 'medium', assignee_id: '' }); }
  }

  const canManage = !loaded || ['owner', 'manager'].includes(myRole);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557]">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[#1d3557]">Overview</Link>
        <span>/</span>
        <span className="font-bold" style={{ color: '#1d3557' }}>Groups</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black" style={{ color: '#1d3557' }}>Groups ({groups.length})</h2>
        {canManage && (
          <button onClick={() => setShowGroupForm(v => !v)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: showGroupForm ? '#6b7a8d' : '#e63946' }}>
            {showGroupForm ? '✕ Cancel' : '+ New Group'}
          </button>
        )}
      </div>

      {/* Inline create group form */}
      {showGroupForm && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: '#f8fafc', border: '1.5px solid #d0dce8' }}>
          <h3 className="font-black text-base mb-4" style={{ color: '#1d3557' }}>Create New Group</h3>
          <form onSubmit={createGroup}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} required placeholder="Group name *"
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <input value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)"
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <div className="flex items-center gap-3 rounded-xl px-4 py-2" style={{ background: '#fff', border: '1.5px solid #d0dce8' }}>
                <label className="text-sm font-bold flex-shrink-0" style={{ color: '#6b7a8d' }}>Color</label>
                <input type="color" value={groupForm.color} onChange={e => setGroupForm(p => ({ ...p, color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border-0 flex-shrink-0" />
                <span className="text-xs font-mono" style={{ color: '#6b7a8d' }}>{groupForm.color}</span>
              </div>
            </div>
            <button type="submit" disabled={groupSaving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
              style={{ background: '#e63946' }}>
              {groupSaving ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        </div>
      )}

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ border: '2px dashed #d0dce8', background: '#fff' }}>
          <div className="text-5xl mb-3">🗂</div>
          <div className="font-black text-lg mb-1" style={{ color: '#1d3557' }}>No groups yet</div>
          <div className="text-sm" style={{ color: '#6b7a8d' }}>Groups help organize tasks by team or feature</div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <div key={group.id} className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #d0dce8' }}>

              {/* Group row */}
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
                style={{ borderLeft: `4px solid ${group.color}` }}
                onClick={() => toggleGroup(group.id)}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-black text-base" style={{ color: '#1d3557' }}>{group.name}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: group.color + '20', color: group.color }}>
                      {group.task_count} tasks
                    </span>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>{group.member_count} members</span>
                  </div>
                  {group.description && <p className="text-xs mt-0.5" style={{ color: '#6b7a8d' }}>{group.description}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {canManage && (
                    <button onClick={e => { e.stopPropagation(); deleteGroup(group.id); }}
                      className="text-xs font-bold px-3 py-1 rounded-lg transition"
                      style={{ color: '#e63946', background: '#fef2f2', border: '1px solid #fecaca' }}>
                      Delete
                    </button>
                  )}
                  <span className="text-sm font-bold" style={{ color: '#94a3b8' }}>{expandedGroup === group.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded section */}
              {expandedGroup === group.id && (
                <div className="px-5 pb-5 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>

                  {/* Inline add task */}
                  {showTaskForm === group.id ? (
                    <form onSubmit={e => createTask(e, group.id)} className="flex gap-2 mb-4 flex-wrap">
                      <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Task title..." required autoFocus
                        className="flex-1 min-w-48 rounded-xl px-3 py-2 text-sm focus:outline-none"
                        style={{ background: '#f1faee', border: '1.5px solid #a8dadc', color: '#1d3557' }} />
                      <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                        className="rounded-xl px-3 py-2 text-sm focus:outline-none"
                        style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                        {['low','medium','high','critical'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <select value={taskForm.assignee_id} onChange={e => setTaskForm(p => ({ ...p, assignee_id: e.target.value }))}
                        className="rounded-xl px-3 py-2 text-sm focus:outline-none"
                        style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                        <option value="">Unassigned</option>
                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#2a9d8f' }}>Add</button>
                      <button type="button" onClick={() => setShowTaskForm(null)} className="px-3 py-2 rounded-xl text-sm font-bold" style={{ color: '#6b7a8d', background: '#f1f5f9' }}>✕</button>
                    </form>
                  ) : (
                    <button onClick={() => { setShowTaskForm(group.id); setTaskForm({ title: '', priority: 'medium', assignee_id: '' }); }}
                      className="text-sm font-bold mb-4 flex items-center gap-1 hover:opacity-70 transition"
                      style={{ color: group.color }}>
                      + Add Task
                    </button>
                  )}

                  {/* Task rows */}
                  {!groupTasks[group.id] ? (
                    <div className="text-sm text-center py-6" style={{ color: '#94a3b8' }}>Loading...</div>
                  ) : groupTasks[group.id].length === 0 ? (
                    <div className="text-sm text-center py-8 rounded-xl" style={{ border: '2px dashed #e2e8f0', color: '#94a3b8' }}>No tasks yet</div>
                  ) : (
                    <div className="space-y-1">
                      {groupTasks[group.id].map(task => (
                        <div key={task.id}
                          onClick={() => router.push(`/projects/${id}/tasks/${task.id}`)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer hover:shadow-sm transition group"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColors[task.status] }} />
                          <span className="flex-1 text-sm font-semibold group-hover:text-[#e63946] transition" style={{ color: '#1d3557' }}>{task.title}</span>
                          {task.assignee_name && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{task.assignee_name}</span>}
                          <span className="text-xs font-bold capitalize" style={{ color: priorityColors[task.priority] }}>{task.priority}</span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: statusColors[task.status] + '20', color: statusColors[task.status] }}>
                            {task.status.replace('_', ' ')}
                          </span>
                          {task.subtask_count > 0 && <span className="text-xs" style={{ color: '#94a3b8' }}>✅{task.subtask_count}</span>}
                          {task.comment_count > 0 && <span className="text-xs" style={{ color: '#94a3b8' }}>💬{task.comment_count}</span>}
                          <span className="text-xs" style={{ color: '#94a3b8' }}>→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
