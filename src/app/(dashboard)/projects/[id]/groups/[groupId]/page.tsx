'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';
import TaskCommentAccordion from '@/components/project/TaskCommentAccordion';
import ConfirmModal from '@/components/ConfirmModal';

interface Group { id: number; uuid: string; slug: string; project_id: number; name: string; description: string; color: string; task_count: number; member_count: number; created_by_name: string }
interface Task {
  id: number; uuid: string; slug: string; title: string; status: string; priority: string;
  assignee_id: number | null; assignee_name: string;
  subtask_count: number; comment_count: number;
  description: string; due_date: string; created_at: string; creator_name: string;
  group_name: string; group_color: string;
}
interface Subtask { id: number; title: string; status: string; priority: string }
interface Member { id: number; name: string; role: string }
interface GroupMember { id: number; name: string; email: string; role: string }
interface Connection { user_id: number; name: string; email: string; status: string }
interface Invitation { id: number; email: string; status: string; created_at: string; invited_by_name: string }
interface GroupActivity {
  id: number; kind: 'history' | 'comment';
  created_at: string; user_name: string;
  task_id: number; task_title: string;
  // history fields
  action?: string; old_value?: string | null; new_value?: string | null;
  // comment fields
  content?: string; is_resolved?: boolean;
}

const statusOptions = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const statusColors: Record<string, string> = { todo: '#94a3b8', in_progress: '#457b9d', in_review: '#f4a261', done: '#2a9d8f', cancelled: '#e63946' };
const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled' };
const priorityColors: Record<string, string> = { low: '#94a3b8', medium: '#457b9d', high: '#f4a261', critical: '#e63946' };
const priorityOptions = ['low', 'medium', 'high', 'critical'];


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

export default function GroupDetailPage() {
  const { id, groupId } = useParams();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState('');
  const [myId, setMyId] = useState(0);
  const [token, setToken] = useState('');
  const [projectNumId, setProjectNumId] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  function toggleItem(key: string) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '' });
  const [taskSaving, setTaskSaving] = useState(false);

  // inline accordions
  const [openCommentTaskId, setOpenCommentTaskId] = useState<number | null>(null);
  const [openSubtaskTaskId, setOpenSubtaskTaskId] = useState<number | null>(null);
  const [subtasks, setSubtasks] = useState<Record<number, Subtask[]>>({});
  const [subtaskInput, setSubtaskInput] = useState<Record<number, string>>({});
  const [updatingTask, setUpdatingTask] = useState<number | null>(null);
  const [groupComments, setGroupComments] = useState<GroupActivity[]>([]);

  // members panel
  const [showMembers, setShowMembers] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [addingMember, setAddingMember] = useState<number | null>(null);
  const [memberMsg, setMemberMsg] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // meeting
  const [showMeeting, setShowMeeting] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ purpose: '', is_instant: true, scheduled_at: '' });
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');

  // filter
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<{ id: number; title: string } | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [deleteSubtaskTarget, setDeleteSubtaskTarget] = useState<{ id: number; title: string; parentId: number } | null>(null);
  const [deletingSubtask, setDeletingSubtask] = useState(false);

  useEffect(() => {
    const t = getToken();
    const uid = getTokenUserId();
    setToken(t); setMyId(uid);
    if (!id || !groupId) return;
    const auth = { Authorization: `Bearer ${t}` };

    // Load group info by slug/uuid/id — group contains project_id
    fetch(`/api/project-groups?id=${groupId}`, { headers: auth })
      .then(r => r.json()).then(d => {
        if (!d.id) { setAccessDenied(true); return; }
        setGroup(d);
        const pid = d.project_id;
        setProjectNumId(pid);
        fetch(`/api/projects?id=${pid}`, { headers: auth }).then(r => r.json()).then(p => p?.name && setProjectName(p.name));
        // Load tasks, comments, members using resolved numeric ids
        fetch(`/api/tasks?group_id=${d.id}`, { headers: auth })
          .then(r => r.json()).then(r => Array.isArray(r) && setTasks(r));
        fetch(`/api/comments/group?group_id=${d.id}`, { headers: auth })
          .then(r => r.json()).then(r => Array.isArray(r) && setGroupComments(r));
        fetch(`/api/projects/members?project_id=${pid}`, { headers: auth })
          .then(r => r.json()).then(r => {
            if (!Array.isArray(r)) { setAccessDenied(true); return; }
            setMembers(r);
            const me = r.find((m: Member) => m.id === uid);
            if (!me) { setAccessDenied(true); return; }
            setMyRole(me.role);
          });
      });
  }, [id, groupId]);

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  function loadGroupMembers() {
    const gid = group?.id;
    if (!gid) return;
    fetch(`/api/project-groups/members?group_id=${gid}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setGroupMembers(d));
  }

  function loadConnections() {
    fetch('/api/connections', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setConnections(d.filter((c: Connection) => c.status === 'accepted')));
  }

  function loadInvitations() {
    if (!group) return;
    fetch(`/api/project-groups/invite?group_id=${group.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setInvitations(d));
  }

  function openMembersPanel() {
    setShowMembers(true);
    setMemberSearch('');
    setMemberMsg('');
    loadGroupMembers();
    loadConnections();
    loadInvitations();
  }

  async function addFromConnection(userId: number) {
    setAddingMember(userId);
    const res = await fetch('/api/project-groups/members', {
      method: 'POST', headers: h,
      body: JSON.stringify({ group_id: group?.id || Number(groupId), user_id: userId, role: 'member' }),
    });
    setAddingMember(null);
    if (res.ok) {
      setMemberMsg('Member added!');
      loadGroupMembers();
      // Also refresh project members so the new member appears in task assignee dropdowns
      fetch(`/api/projects/members?project_id=${projectNumId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => Array.isArray(d) && setMembers(d));
    }
    else { const d = await res.json(); setMemberMsg(d.error || 'Failed'); }
    setTimeout(() => setMemberMsg(''), 3000);
  }

  async function removeMember(userId: number) {
    await fetch('/api/project-groups/members', {
      method: 'DELETE', headers: h,
      body: JSON.stringify({ group_id: group?.id || Number(groupId), user_id: userId }),
    });
    loadGroupMembers();
    setMemberMsg('Member removed.');
    setTimeout(() => setMemberMsg(''), 3000);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const res = await fetch('/api/project-groups/invite', {
      method: 'POST', headers: h,
      body: JSON.stringify({ group_id: group?.id || Number(groupId), email: inviteEmail }),
    });
    setInviting(false);
    const d = await res.json();
    if (res.ok) { setInviteEmail(''); setMemberMsg('Invitation sent!'); loadInvitations(); }
    else setMemberMsg(d.error || 'Failed to send invite');
    setTimeout(() => setMemberMsg(''), 3000);
  }

  async function cancelInvite(invId: number) {
    await fetch(`/api/project-groups/invite?id=${invId}`, { method: 'DELETE', headers: h });
    loadInvitations();
  }

  async function scheduleMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!group) return;
    setMeetingLoading(true);
    const res = await fetch('/api/meetings', {
      method: 'POST', headers: h,
      body: JSON.stringify({
        group_id: group.id,
        purpose: meetingForm.purpose,
        is_instant: meetingForm.is_instant,
        scheduled_at: meetingForm.scheduled_at || new Date().toISOString(),
      }),
    });
    setMeetingLoading(false);
    if (res.ok) {
      const data = await res.json();
      setMeetingLink(data.meeting_link);
      setMeetingForm({ purpose: '', is_instant: true, scheduled_at: '' });
    }
  }

  function loadTasks() {
    if (!group) return;
    fetch(`/api/tasks?group_id=${group.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setTasks(d));
  }

  function loadGroupComments() {
    if (!group) return;
    fetch(`/api/comments/group?group_id=${group.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setGroupComments(d));
  }

  // Auto-refresh activity every 5 seconds
  useEffect(() => {
    if (!group) return;
    const interval = setInterval(loadGroupComments, 5000);
    return () => clearInterval(interval);
  }, [group, token]);

  async function updateTask(task: Task, fields: Partial<{ status: string; assignee_id: number | null; priority: string }>) {
    setUpdatingTask(task.id);
    await fetch('/api/tasks', {
      method: 'PUT', headers: h,
      body: JSON.stringify({ id: task.id, title: task.title, status: task.status, priority: task.priority, assignee_id: task.assignee_id, ...fields })
    });
    setUpdatingTask(null);
    loadTasks();
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!group || !projectNumId) return;
    setTaskSaving(true);
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: h,
      body: JSON.stringify({
        project_id: projectNumId,
        group_id: group.id,
        title: taskForm.title, description: taskForm.description,
        priority: taskForm.priority,
        assignee_id: taskForm.assignee_id ? Number(taskForm.assignee_id) : null,
        due_date: taskForm.due_date || null,
      })
    });
    setTaskSaving(false);
    if (res.ok) {
      loadTasks();
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', priority: 'medium', assignee_id: '', due_date: '' });
    }
  }

  async function deleteTask(e: React.MouseEvent, taskId: number) {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (task) setDeleteTaskTarget({ id: task.id, title: task.title });
  }

  async function confirmDeleteTask() {
    if (!deleteTaskTarget) return;
    setDeletingTask(true);
    await fetch(`/api/tasks?id=${deleteTaskTarget.id}`, { method: 'DELETE', headers: h });
    setDeletingTask(false);
    setDeleteTaskTarget(null);
    loadTasks();
  }

  function loadSubtasks(taskId: number) {
    fetch(`/api/tasks?parent_task_id=${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setSubtasks(p => ({ ...p, [taskId]: d })));
  }

  function toggleSubtaskPanel(taskId: number) {
    if (openSubtaskTaskId === taskId) { setOpenSubtaskTaskId(null); return; }
    setOpenSubtaskTaskId(taskId);
    if (!subtasks[taskId]) loadSubtasks(taskId);
  }

  async function addSubtask(taskId: number) {
    const title = subtaskInput[taskId]?.trim();
    if (!title || !projectNumId) return;
    await fetch('/api/tasks', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectNumId, parent_task_id: taskId, title, priority: 'medium' }) });
    setSubtaskInput(p => ({ ...p, [taskId]: '' }));
    loadSubtasks(taskId);
    loadTasks();
  }

  async function toggleSubtaskDone(sub: Subtask, taskId: number) {
    await fetch('/api/tasks', { method: 'PUT', headers: h, body: JSON.stringify({ id: sub.id, title: sub.title, status: sub.status === 'done' ? 'todo' : 'done' }) });
    loadSubtasks(taskId);
  }

  async function deleteSubtask(subId: number, taskId: number) {
    const sub = subtasks[taskId]?.find(s => s.id === subId);
    if (sub) setDeleteSubtaskTarget({ id: sub.id, title: sub.title, parentId: taskId });
  }

  async function confirmDeleteSubtask() {
    if (!deleteSubtaskTarget) return;
    setDeletingSubtask(true);
    await fetch(`/api/tasks?id=${deleteSubtaskTarget.id}`, { method: 'DELETE', headers: h });
    setDeletingSubtask(false);
    loadSubtasks(deleteSubtaskTarget.parentId);
    loadTasks();
    setDeleteSubtaskTarget(null);
  }

  const canManage = ['owner', 'admin', 'manager'].includes(myRole);
  const filtered = filterStatus ? tasks.filter(t => t.status === filterStatus) : tasks;
  const doneTasks = tasks.filter(t => t.status === 'done').length;

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <div className="font-black text-xl text-[#1d3557] mb-2">Access Denied</div>
      <div className="text-sm text-[#6b7a8d] mb-6">You are not a member of this project or group.</div>
      <button onClick={() => router.push('/projects')}
        className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90"
        style={{ background: '#1d3557' }}>← Back to Projects</button>
    </div>
  );

  if (!group) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-sm" style={{ color: '#6b7a8d' }}>Loading...</div>
    </div>
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557]">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[#1d3557]">Overview</Link>
        <span>/</span>
        <Link href={`/projects/${id}/groups`} className="hover:text-[#1d3557]">Groups</Link>
        <span>/</span>
        <span className="font-bold" style={{ color: '#1d3557' }}>{group.name}</span>
      </div>

      {/* Group header */}
      <div className="bg-white rounded-2xl p-5 mb-5" style={{ border: '1px solid #d0dce8', borderTop: `4px solid ${group.color}` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0"
              style={{ background: group.color }}>
              {group.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: '#1d3557' }}>{group.name}</h1>
              {group.description && <p className="text-sm mt-0.5" style={{ color: '#6b7a8d' }}>{group.description}</p>}
              <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: '#6b7a8d' }}>
                {projectName && <span>📁 <strong style={{ color: '#457b9d' }}>{projectName}</strong></span>}
                <span><strong style={{ color: '#1d3557' }}>{tasks.length}</strong> tasks</span>
                <span><strong style={{ color: '#2a9d8f' }}>{doneTasks}</strong> done</span>
                <span><strong style={{ color: '#1d3557' }}>{group.member_count}</strong> members</span>
                {group.created_by_name && <span>by <strong>{group.created_by_name}</strong></span>}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="flex-shrink-0 w-32">
              <div className="text-xs font-bold mb-1 text-right" style={{ color: '#6b7a8d' }}>
                {Math.round((doneTasks / tasks.length) * 100)}% done
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(doneTasks / tasks.length) * 100}%`, background: group.color }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {['', ...statusOptions].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition"
              style={{
                background: filterStatus === s ? '#1d3557' : '#fff',
                color: filterStatus === s ? '#fff' : '#6b7a8d',
                border: `1px solid ${filterStatus === s ? '#1d3557' : '#d0dce8'}`
              }}>
              {s ? statusLabels[s] : `All (${tasks.length})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {canManage && (
            <button onClick={openMembersPanel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition hover:opacity-90"
              style={{ background: '#f0fdf9', color: '#2a9d8f', border: '1.5px solid #99f6e4' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Members
            </button>
          )}
          <button onClick={() => router.push(`/projects/${id}/groups/${groupId}/chat`)}
            title="Open Chat"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition hover:opacity-90"
            style={{ background: '#eff6ff', color: '#457b9d', border: '1.5px solid #bfdbfe' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chat
          </button>
          <button onClick={() => { setShowMeeting(true); setMeetingLink(''); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition hover:opacity-90"
            style={{ background: '#fff7ed', color: '#c2410c', border: '1.5px solid #fed7aa' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            Meeting
          </button>
          <button onClick={() => setShowTaskForm(v => !v)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
            style={{ background: showTaskForm ? '#6b7a8d' : '#e63946' }}>
            {showTaskForm ? '✕ Cancel' : '+ New Task'}
          </button>
        </div>
      </div>

      {/* Create task form */}
      {showTaskForm && (
        <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: '1.5px solid #d0dce8' }}>
          <h3 className="font-black text-sm mb-3" style={{ color: '#1d3557' }}>New Task</h3>
          <form onSubmit={createTask} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} required
                placeholder="Task title *" autoFocus
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none md:col-span-2"
                style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)" rows={2}
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none md:col-span-2"
                style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                {priorityOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={taskForm.assignee_id} onChange={e => setTaskForm(p => ({ ...p, assignee_id: e.target.value }))}
                className="rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
              <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))}
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            </div>
            <button type="submit" disabled={taskSaving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              style={{ background: '#e63946' }}>
              {taskSaving ? 'Creating...' : 'Create Task'}
            </button>
          </form>
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '2px dashed #d0dce8' }}>
          <div className="text-4xl mb-3">✅</div>
          <div className="font-black text-base mb-1" style={{ color: '#1d3557' }}>{filterStatus ? 'No tasks with this status' : 'No tasks yet'}</div>
          <div className="text-sm mb-4" style={{ color: '#6b7a8d' }}>Add tasks to get started</div>
          <button onClick={() => setShowTaskForm(true)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: '#e63946' }}>
            + New Task
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <div key={task.id} className="bg-white rounded-2xl overflow-hidden transition-all"
              style={{ border: '1px solid #d0dce8', opacity: updatingTask === task.id ? 0.6 : 1 }}>

              {/* Task row */}
              <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                {/* Status dot */}
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusColors[task.status] }} />

                {/* Title */}
                <div className="flex-1 min-w-40 cursor-pointer" onClick={() => router.push(`/projects/${id}/tasks/${task.slug || task.id}`)}>
                  <div className="text-sm font-semibold hover:text-[#e63946] transition" style={{ color: '#1d3557' }}>{task.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>🕐 {fmtDT(task.created_at)}{task.creator_name && <> · by <strong style={{ color: '#6b7a8d' }}>{task.creator_name}</strong></>}</div>
                </div>

                {/* Due date */}
                {task.due_date && (
                  <span className="text-xs px-2 py-0.5 rounded-full hidden md:block"
                    style={{ background: '#fef9c3', color: '#854d0e' }}>
                    📅 {fmtD(task.due_date)}
                  </span>
                )}

                {/* Status dropdown */}
                <select value={task.status}
                  onClick={e => e.stopPropagation()}
                  onChange={e => updateTask(task, { status: e.target.value })}
                  className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                  style={{ background: statusColors[task.status] + '18', color: statusColors[task.status], border: `1.5px solid ${statusColors[task.status]}40` }}>
                  {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>

                {/* Assignee dropdown */}
                <select value={task.assignee_id ?? ''}
                  onClick={e => e.stopPropagation()}
                  onChange={e => updateTask(task, { assignee_id: e.target.value ? Number(e.target.value) : null })}
                  className="text-xs px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                  style={{ background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', maxWidth: '130px' }}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                {/* Priority */}
                <span className="text-xs font-bold capitalize hidden sm:block" style={{ color: priorityColors[task.priority] }}>
                  {task.priority}
                </span>

                {/* Subtask toggle */}
                <button onClick={e => { e.stopPropagation(); toggleSubtaskPanel(task.id); }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition"
                  style={{
                    color: openSubtaskTaskId === task.id ? '#2a9d8f' : '#94a3b8',
                    background: openSubtaskTaskId === task.id ? '#f0fdf9' : '#f8fafc',
                    border: `1.5px solid ${openSubtaskTaskId === task.id ? '#99f6e4' : '#e2e8f0'}`
                  }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  {task.subtask_count > 0 ? task.subtask_count : 'Sub'}
                </button>

                {/* Comment toggle */}
                {/* <button onClick={e => { e.stopPropagation(); setOpenCommentTaskId(openCommentTaskId === task.id ? null : task.id); }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition"
                  style={{
                    color: openCommentTaskId === task.id ? '#457b9d' : '#94a3b8',
                    background: openCommentTaskId === task.id ? '#eff6ff' : '#f8fafc',
                    border: `1.5px solid ${openCommentTaskId === task.id ? '#bfdbfe' : '#e2e8f0'}`
                  }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {task.comment_count > 0 ? task.comment_count : 'Chat'}
                </button> */}

                {/* Open detail */}
                <button onClick={() => router.push(`/projects/${id}/tasks/${task.slug || task.id}`)}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold hover:opacity-90 transition text-white flex-shrink-0"
                  style={{ background: '#1d3557' }}>
                  Open →
                </button>

                {/* Delete */}
                <button onClick={e => deleteTask(e, task.id)}
                  className="text-xs px-2 py-1.5 rounded-lg font-bold transition hover:bg-red-50 flex-shrink-0"
                  style={{ color: '#e63946', border: '1px solid #fecaca' }}>
                  🗑
                </button>
              </div>

              {/* Subtask accordion */}
              {openSubtaskTaskId === task.id && (
                <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid #e8f0f7', background: '#f0fdf9' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black" style={{ color: '#0f766e' }}>
                      Subtasks
                      {subtasks[task.id] && ` — ${subtasks[task.id].filter(s => s.status === 'done').length}/${subtasks[task.id].length} done`}
                    </span>
                  </div>

                  {/* Subtask list */}
                  {!subtasks[task.id] ? (
                    <div className="text-xs py-2 mb-3" style={{ color: '#94a3b8' }}>Loading...</div>
                  ) : subtasks[task.id].length === 0 ? (
                    <div className="text-xs py-2 mb-3 text-center rounded-lg" style={{ color: '#94a3b8', border: '1.5px dashed #d1fae5' }}>No subtasks yet</div>
                  ) : (
                    <div className="space-y-1.5 mb-3">
                      {subtasks[task.id].map(sub => (
                        <div key={sub.id} className="flex items-center gap-3 rounded-xl px-3 py-2"
                          style={{ background: '#fff', border: '1px solid #d1fae5' }}>
                          <input type="checkbox" checked={sub.status === 'done'}
                            onChange={() => toggleSubtaskDone(sub, task.id)}
                            className="w-4 h-4 rounded accent-teal-600 cursor-pointer flex-shrink-0" />
                          <span className={`flex-1 text-xs font-medium ${sub.status === 'done' ? 'line-through' : ''}`}
                            style={{ color: sub.status === 'done' ? '#94a3b8' : '#1d3557' }}>
                            {sub.title}
                          </span>
                          <span className="text-xs font-bold capitalize" style={{ color: priorityColors[sub.priority] }}>{sub.priority}</span>
                          {canManage && (
                            <button onClick={() => deleteSubtask(sub.id, task.id)}
                              className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-50 transition flex-shrink-0"
                              style={{ color: '#e63946' }}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add subtask */}
                  <div className="flex gap-2">
                    <input value={subtaskInput[task.id] || ''}
                      onChange={e => setSubtaskInput(p => ({ ...p, [task.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addSubtask(task.id)}
                      placeholder="Add subtask... (Enter to save)"
                      className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      style={{ background: '#fff', border: '1.5px solid #99f6e4', color: '#1d3557' }} />
                    <button onClick={() => addSubtask(task.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90"
                      style={{ background: '#2a9d8f' }}>
                      + Add
                    </button>
                  </div>
                </div>
              )}

              {/* Comment accordion */}
              <TaskCommentAccordion
                taskId={task.id}
                token={token}
                myId={myId}
                myRole={myRole}
                commentCount={task.comment_count}
                open={openCommentTaskId === task.id}
                onToggle={() => setOpenCommentTaskId(openCommentTaskId === task.id ? null : task.id)}
                onCommentPosted={loadGroupComments}
              />
            </div>
          ))}
        </div>
      )}

      {deleteTaskTarget && (
        <ConfirmModal
          title="Delete Task"
          message={`Delete "${deleteTaskTarget.title}"? All subtasks and comments will also be removed.`}
          onConfirm={confirmDeleteTask}
          onCancel={() => setDeleteTaskTarget(null)}
          loading={deletingTask}
        />
      )}

      {deleteSubtaskTarget && (
        <ConfirmModal
          title="Delete Subtask"
          message={`Delete "${deleteSubtaskTarget.title}"?`}
          onConfirm={confirmDeleteSubtask}
          onCancel={() => setDeleteSubtaskTarget(null)}
          loading={deletingSubtask}
        />
      )}

      {/* Meeting Modal */}
      {showMeeting && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(15,23,42,0.6)' }}
          onClick={() => { setShowMeeting(false); setMeetingLink(''); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ border: '1px solid #e2e8f0' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: '#1d3557' }}>
              <div>
                <div className="font-black text-white">📹 Create Meeting</div>
                <div className="text-xs text-white/50 mt-0.5">{group?.name}</div>
              </div>
              <button onClick={() => { setShowMeeting(false); setMeetingLink(''); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition">✕</button>
            </div>

            {/* Meeting link created */}
            {meetingLink ? (
              <div className="p-6 space-y-4">
                <div className="flex flex-col items-center text-center py-2">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3" style={{ background: '#f0fdf9' }}>🎉</div>
                  <div className="font-black text-[#1d3557] text-lg mb-1">Meeting Created!</div>
                  <div className="text-sm text-[#6b7a8d]">The link has been posted in the group chat.</div>
                </div>
                <div className="rounded-xl p-3" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
                  <div className="text-xs font-bold text-[#6b7a8d] mb-1">Meeting Link</div>
                  <a href={meetingLink} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-bold break-all hover:underline" style={{ color: '#457b9d' }}>
                    {meetingLink}
                  </a>
                </div>
                <div className="flex gap-3">
                  <a href={meetingLink} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white text-center hover:opacity-90 transition"
                    style={{ background: '#2a9d8f' }}>
                    🚀 Join Now
                  </a>
                  <button onClick={() => router.push(`/projects/${id}/groups/${groupId}/chat`)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition"
                    style={{ background: '#eff6ff', color: '#457b9d', border: '1.5px solid #bfdbfe' }}>
                    💬 Open Chat
                  </button>
                </div>
                <button onClick={() => { setShowMeeting(false); setMeetingLink(''); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-[#6b7a8d] hover:bg-[#f8fafc] transition"
                  style={{ border: '1.5px solid #e2e8f0' }}>Close</button>
              </div>
            ) : (
              <form onSubmit={scheduleMeeting} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Meeting Purpose *</label>
                  <textarea
                    value={meetingForm.purpose}
                    onChange={e => setMeetingForm(f => ({ ...f, purpose: e.target.value }))}
                    placeholder="e.g. Weekly sync, Sprint planning, Design review…"
                    rows={3} required
                    className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none resize-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }} />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#1d3557] mb-2">When?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setMeetingForm(f => ({ ...f, is_instant: true }))}
                      className="py-3 rounded-xl font-bold text-sm transition"
                      style={meetingForm.is_instant
                        ? { background: '#1d3557', color: '#fff', border: '1.5px solid #1d3557' }
                        : { background: '#f8fafc', color: '#1d3557', border: '1.5px solid #e2e8f0' }}>
                      ⚡ Start Now
                    </button>
                    <button type="button" onClick={() => setMeetingForm(f => ({ ...f, is_instant: false }))}
                      className="py-3 rounded-xl font-bold text-sm transition"
                      style={!meetingForm.is_instant
                        ? { background: '#1d3557', color: '#fff', border: '1.5px solid #1d3557' }
                        : { background: '#f8fafc', color: '#1d3557', border: '1.5px solid #e2e8f0' }}>
                      🗓 Schedule Later
                    </button>
                  </div>
                </div>

                {!meetingForm.is_instant && (
                  <div>
                    <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Date & Time *</label>
                    <input type="datetime-local" value={meetingForm.scheduled_at}
                      onChange={e => setMeetingForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      required
                      className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                      style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }} />
                  </div>
                )}

                <div className="flex items-center gap-2 rounded-xl p-3 text-xs font-medium"
                  style={{ background: '#f0fdf9', border: '1px solid #99f6e4', color: '#0f766e' }}>
                  📨 A video meeting link will be auto-posted in the group chat.
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={meetingLoading}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 disabled:opacity-50 transition"
                    style={{ background: '#c2410c' }}>
                    {meetingLoading ? 'Creating…' : '📹 Create Meeting'}
                  </button>
                  <button type="button" onClick={() => setShowMeeting(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1d3557] hover:bg-[#f8fafc] transition"
                    style={{ border: '1.5px solid #e2e8f0' }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Members Panel Modal */}
      {showMembers && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(15,23,42,0.6)' }}
          onClick={() => setShowMembers(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col" style={{ border: '1px solid #e2e8f0', maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ background: '#1d3557' }}>
              <div>
                <div className="font-black text-white">Manage Members</div>
                <div className="text-xs text-white/50 mt-0.5">{group.name} · {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => setShowMembers(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition">✕</button>
            </div>

            {/* Toast */}
            {memberMsg && (
              <div className="mx-4 mt-3 px-3 py-2 rounded-xl text-xs font-bold text-center flex-shrink-0"
                style={{ background: memberMsg.includes('!') ? '#f0fdf9' : '#fef2f2', color: memberMsg.includes('!') ? '#0f766e' : '#e63946' }}>
                {memberMsg}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">

              {/* Search section */}
              <div className="p-4 pb-0">
                <div className="text-xs font-black text-[#1d3557] mb-2 uppercase tracking-wide">Add Members</div>
                <div className="relative mb-3">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    autoFocus
                    className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1d3557' }}
                  />
                  {memberSearch && (
                    <button onClick={() => setMemberSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#1d3557]">
                      ✕
                    </button>
                  )}
                </div>

                {/* Search results: project members + connections filtered by search */}
                {(() => {
                  const q = memberSearch.toLowerCase().trim();
                  const alreadyIds = new Set(groupMembers.map(m => m.id));
                  // Combine project members and connections, deduplicate
                  const allUsers: { id: number; name: string; email: string; source: string }[] = [];
                  const seen = new Set<number>();
                  members.filter(m => m.id !== myId).forEach(m => {
                    if (!seen.has(m.id)) { seen.add(m.id); allUsers.push({ id: m.id, name: m.name, email: (m as unknown as { email: string }).email || '', source: 'project' }); }
                  });
                  connections.forEach(c => {
                    if (!seen.has(c.user_id)) { seen.add(c.user_id); allUsers.push({ id: c.user_id, name: c.name, email: c.email, source: 'connection' }); }
                  });
                  const filtered = q ? allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : allUsers;
                  if (!filtered.length && q) return (
                    <div className="text-center py-6 text-sm text-[#94a3b8]">No users found for &ldquo;{memberSearch}&rdquo;</div>
                  );
                  if (!filtered.length) return (
                    <div className="text-center py-4 text-xs text-[#94a3b8]">Type to search project members &amp; connections</div>
                  );
                  return (
                    <div className="space-y-1.5 mb-4">
                      {filtered.map((u, i) => {
                        const added = alreadyIds.has(u.id);
                        const avatarBg = `hsl(${(u.name.charCodeAt(0) * 37) % 360}, 55%, 50%)`;
                        return (
                          <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition"
                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                              style={{ background: avatarBg }}>
                              {u.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-[#1d3557] truncate">{u.name}</div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-[#6b7a8d] truncate">{u.email}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                                  style={{ background: u.source === 'project' ? '#eff6ff' : '#f0fdf9', color: u.source === 'project' ? '#1d4ed8' : '#0f766e' }}>
                                  {u.source === 'project' ? 'Project' : 'Connection'}
                                </span>
                              </div>
                            </div>
                            {added
                              ? <span className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ background: '#f0fdf9', color: '#2a9d8f' }}>✓ Added</span>
                              : <button onClick={() => addFromConnection(u.id)} disabled={addingMember === u.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition flex-shrink-0"
                                  style={{ background: '#1d3557' }}>
                                  {addingMember === u.id ? '…' : '+ Add'}
                                </button>
                            }
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Invite by email */}
              <div className="px-4 pb-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                <div className="text-xs font-black text-[#1d3557] mb-2 mt-4 uppercase tracking-wide">Invite by Email</div>
                <form onSubmit={sendInvite} className="flex gap-2">
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="someone@example.com"
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1d3557' }} />
                  <button type="submit" disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition flex-shrink-0"
                    style={{ background: '#2a9d8f' }}>
                    {inviting ? '…' : 'Invite'}
                  </button>
                </form>

                {/* Pending invitations */}
                {invitations.filter(i => i.status === 'pending').length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-xs font-bold text-[#6b7a8d] mb-1">Pending invitations</div>
                    {invitations.filter(i => i.status === 'pending').map(inv => (
                      <div key={inv.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                        style={{ background: '#fef9c3', border: '1px solid #fde68a' }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[#1d3557] truncate">{inv.email}</div>
                          <div className="text-xs text-[#6b7a8d]">{fmtD(inv.created_at)}</div>
                        </div>
                        <button onClick={() => cancelInvite(inv.id)}
                          className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition flex-shrink-0"
                          style={{ color: '#e63946', border: '1px solid #fecaca' }}>Cancel</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current members */}
              <div className="px-4 pb-4" style={{ borderTop: '1px solid #f1f5f9' }}>
                <div className="text-xs font-black text-[#1d3557] mb-2 mt-4 uppercase tracking-wide">Current Members ({groupMembers.length})</div>
                {groupMembers.length === 0
                  ? <div className="text-center py-6 text-sm text-[#94a3b8]">No members yet</div>
                  : <div className="space-y-1.5">
                      {groupMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ background: `hsl(${(m.name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                            {m.name[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-[#1d3557] truncate">{m.name}</div>
                            <div className="text-xs text-[#6b7a8d] truncate">{m.email}</div>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg capitalize flex-shrink-0"
                            style={{ background: m.role === 'lead' ? '#fef2f2' : '#f1faee', color: m.role === 'lead' ? '#e63946' : '#2a9d8f' }}>
                            {m.role}
                          </span>
                          {m.role !== 'lead' && (
                            <button onClick={() => removeMember(m.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition flex-shrink-0"
                              style={{ color: '#e63946', border: '1px solid #fecaca' }}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      {groupComments.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-black text-base" style={{ color: '#1d3557' }}>⚡ Recent Activity</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#e8f4ff', color: '#457b9d' }}>
              {groupComments.length}
            </span>
          </div>
          <div className="space-y-2">
            {(() => {
              const groups: { dateLabel: string; items: typeof groupComments }[] = [];
              groupComments.forEach(item => {
                const dt = new Date(item.created_at);
                const today = new Date();
                const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
                const isSameDay = (a: Date, b: Date) => a.getDate()===b.getDate() && a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear();
                const label = isSameDay(dt, today) ? 'Today' : isSameDay(dt, yesterday) ? 'Yesterday' : fmtD(dt);
                const last = groups[groups.length - 1];
                if (last && last.dateLabel === label) last.items.push(item);
                else groups.push({ dateLabel: label, items: [item] });
              });
              return groups.map(group => (
                <div key={group.dateLabel}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                    <span className="text-xs font-black px-3 py-1 rounded-full flex-shrink-0"
                      style={{ background: '#f1f5f9', color: '#64748b' }}>{group.dateLabel}</span>
                    <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                  </div>
                  <div className="space-y-2">
                  {group.items.map(item => {
              const key = item.kind === 'history' ? `h-${item.id}` : `c-${item.id}`;
              const isExpanded = expandedItems.has(key);
              const relatedTask = tasks.find(t => t.id === item.task_id);

              const actCfg: Record<string, { icon: string; color: string }> = {
                created:          { icon: '✦', color: '#2a9d8f' },
                status_changed:   { icon: '⇄', color: '#457b9d' },
                closed:           { icon: '✓', color: '#0f766e' },
                reopened:         { icon: '↺', color: '#c2410c' },
                assigned:         { icon: '→', color: '#6d6875' },
                unassigned:       { icon: '←', color: '#94a3b8' },
                priority_changed: { icon: '!',  color: '#f4a261' },
                title_changed:    { icon: '✎', color: '#457b9d' },
                deleted:          { icon: '🗑', color: '#e63946' },
                subtask_added:    { icon: '+',  color: '#2a9d8f' },
                comment_added:    { icon: '💬', color: '#457b9d' },
                moved_group:      { icon: '⇢', color: '#e9c46a' },
              };

              const sl: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled' };
              const lbl = (v: string | null) => (v && sl[v]) ? sl[v] : (v || '');

              function buildMsg(action: string, by: string, oldVal: string | null, newVal: string | null): string {
                switch (action) {
                  case 'created':          return `${by} created task "${item.task_title}"`;
                  case 'assigned':         return newVal ? `${by} assigned "${item.task_title}" to ${newVal}` : `${by} assigned task`;
                  case 'unassigned':       return oldVal ? `${by} removed ${oldVal} from "${item.task_title}"` : `${by} unassigned task`;
                  case 'status_changed':   return `${by} changed status of "${item.task_title}" from "${lbl(oldVal)}" to "${lbl(newVal)}"`;
                  case 'closed':           return `${by} marked "${item.task_title}" as Done`;
                  case 'reopened':         return `${by} reopened "${item.task_title}" to "${lbl(newVal)}"`;
                  case 'priority_changed': return `${by} changed priority of "${item.task_title}" from "${oldVal}" to "${newVal}"`;
                  case 'title_changed':    return `${by} renamed task from "${oldVal}" to "${newVal}"`;
                  case 'moved_group':      return `${by} moved "${item.task_title}" to group "${newVal}"`;
                  case 'subtask_added':    return `${by} added subtask "${newVal}" to "${item.task_title}"`;
                  case 'deleted':          return `${by} deleted task "${item.task_title}"`;
                  default:                 return `${by} ${action.replace(/_/g, ' ')} on "${item.task_title}"`;
                }
              }

              if (item.kind === 'history') {
                const cfg = actCfg[item.action || ''] || { icon: '•', color: '#94a3b8' };
                const msg = buildMsg(item.action || '', item.user_name, item.old_value || null, item.new_value || null);
                return (
                  <div key={key} className="bg-white rounded-2xl overflow-hidden transition-all"
                    style={{ border: `1px solid ${isExpanded ? cfg.color + '50' : '#d0dce8'}` }}>
                    {/* Row */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f8fafc] transition"
                      onClick={() => toggleItem(key)}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: cfg.color }}>{cfg.icon}</div>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: `hsl(${(item.user_name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                        {item.user_name[0].toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm min-w-0" style={{ color: '#1d3557' }}>{msg}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>
                        {fmtDT(item.created_at)}
                      </span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
                        className="flex-shrink-0 transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                    {/* Expanded */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: `1px solid ${cfg.color}30`, background: '#fafbfc' }}>
                        {/* Detail */}
                        <div className="rounded-xl p-3 flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ background: cfg.color }}>{cfg.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black mb-0.5" style={{ color: '#1d3557' }}>{item.user_name}</div>
                            <div className="text-xs" style={{ color: '#6b7a8d' }}>{msg}</div>
                          </div>
                          {(item.old_value || item.new_value) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.old_value && (
                                <span className="text-xs px-2 py-0.5 rounded-lg font-bold line-through" style={{ background: '#fef2f2', color: '#b91c1c' }}>{item.old_value}</span>
                              )}
                              {item.old_value && item.new_value && <span className="text-xs" style={{ color: '#94a3b8' }}>→</span>}
                              {item.new_value && (
                                <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: '#f0fdf9', color: '#0f766e' }}>{item.new_value}</span>
                              )}
                            </div>
                          )}
                          {relatedTask && (
                            <button onClick={() => router.push(`/projects/${id}/tasks/${relatedTask.slug || relatedTask.id}`)}
                              className="text-xs font-bold px-2 py-1 rounded-lg hover:opacity-80 transition flex-shrink-0"
                              style={{ background: '#1d3557', color: '#fff' }}>Open Task →</button>
                          )}
                        </div>
                        {/* Quick update */}
                        {relatedTask && (
                          <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                            <div className="text-xs font-black mb-2" style={{ color: '#6b7a8d' }}>QUICK UPDATE</div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Status</span>
                                <select
                                  defaultValue={relatedTask.status}
                                  onChange={async e => { await updateTask(relatedTask, { status: e.target.value }); }}
                                  className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                  style={{ background: statusColors[relatedTask.status] + '20', color: statusColors[relatedTask.status], border: `1.5px solid ${statusColors[relatedTask.status]}50` }}>
                                  {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Priority</span>
                                <select
                                  defaultValue={relatedTask.priority}
                                  onChange={async e => { await updateTask(relatedTask, { priority: e.target.value }); }}
                                  className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                  style={{ background: priorityColors[relatedTask.priority] + '20', color: priorityColors[relatedTask.priority], border: `1.5px solid ${priorityColors[relatedTask.priority]}50` }}>
                                  {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Assignee</span>
                                <select
                                  defaultValue={relatedTask.assignee_id ?? ''}
                                  onChange={async e => { await updateTask(relatedTask, { assignee_id: e.target.value ? Number(e.target.value) : null }); }}
                                  className="text-xs px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                                  <option value="">Unassigned</option>
                                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              // Comment
              return (
                <div key={key} className="bg-white rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${isExpanded ? '#bfdbfe' : '#d0dce8'}` }}>
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f8fafc] transition"
                    onClick={() => toggleItem(key)}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: '#457b9d' }}>💬</div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: `hsl(${(item.user_name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                      {item.user_name[0].toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm min-w-0" style={{ color: '#1d3557' }}>
                      <span className="font-bold">{item.user_name}</span>
                      {' commented on '}
                      <span className="font-bold" style={{ color: '#457b9d' }}>{item.task_title}</span>
                      {!isExpanded && (
                        <span style={{ color: '#6b7a8d' }}>
                          {' — '}{(item.content || '').length > 60 ? (item.content || '').substring(0, 60) + '…' : item.content}
                        </span>
                      )}
                    </span>
                    <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>
                      {fmtDT(item.created_at)}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
                      className="flex-shrink-0 transition-transform duration-200"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: '1px solid #bfdbfe', background: '#f8fbff' }}>
                      <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                        <p className="text-sm leading-relaxed" style={{ color: '#1d3557' }}>{item.content}</p>
                        {item.is_resolved && (
                          <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0fdf9', color: '#0f766e' }}>✓ Resolved</span>
                        )}
                      </div>
                      {relatedTask && (
                        <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                          <div className="text-xs font-black mb-2" style={{ color: '#6b7a8d' }}>QUICK UPDATE</div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Status</span>
                              <select
                                defaultValue={relatedTask.status}
                                onChange={async e => { await updateTask(relatedTask, { status: e.target.value }); }}
                                className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                style={{ background: statusColors[relatedTask.status] + '20', color: statusColors[relatedTask.status], border: `1.5px solid ${statusColors[relatedTask.status]}50` }}>
                                {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                              </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Assignee</span>
                              <select
                                defaultValue={relatedTask.assignee_id ?? ''}
                                onChange={async e => { await updateTask(relatedTask, { assignee_id: e.target.value ? Number(e.target.value) : null }); }}
                                className="text-xs px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                                <option value="">Unassigned</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                            <button onClick={() => router.push(`/projects/${id}/tasks/${relatedTask.slug || relatedTask.id}`)}
                              className="text-xs font-bold px-2 py-1.5 rounded-lg hover:opacity-80 transition ml-auto"
                              style={{ background: '#1d3557', color: '#fff' }}>Open Task →</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
