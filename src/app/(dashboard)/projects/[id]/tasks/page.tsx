'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';
import ConfirmModal from '@/components/ConfirmModal';

interface Task {
  id: number; title: string; description: string; status: string; priority: string;
  assignee_name: string; due_date: string; subtask_count: number; comment_count: number;
  group_name: string; group_color: string; created_at: string; creator_name: string;
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

export default function ProjectTasksPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState('');
  const [token, setToken] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragTask, setDragTask] = useState<Task | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // inline create task form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'todo', group_id: '', assignee_id: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [taskAttachments, setTaskAttachments] = useState<{ type: 'image' | 'video' | 'link'; url: string; name: string }[]>([]);
  const [taskLinkInput, setTaskLinkInput] = useState('');
  const [showTaskLinkInput, setShowTaskLinkInput] = useState(false);
  const [taskUploading, setTaskUploading] = useState(false);
  const [taskPasteDragging, setTaskPasteDragging] = useState(false);

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
        setProjectName(proj.name || '');
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

  async function uploadTaskFile(file: File) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return;
    setTaskUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/documents/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    setTaskUploading(false);
    if (res.ok) {
      const data = await res.json();
      setTaskAttachments(prev => [...prev, { type: isImage ? 'image' : 'video', url: data.url, name: file.name, file: null }]);
    }
  }

  function handleTaskPaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); uploadTaskFile(file); }
      }
    }
  }

  function handleTaskDrop(e: React.DragEvent) {
    e.preventDefault();
    setTaskPasteDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(f => uploadTaskFile(f));
  }

  function addTaskLink() {
    const url = taskLinkInput.trim();
    if (!url) return;
    const isVideo = /youtube|youtu\.be|vimeo|\.mp4|\.webm/i.test(url);
    setTaskAttachments(prev => [...prev, { type: isVideo ? 'video' : 'link', url, name: url }]);
    setTaskLinkInput(''); setShowTaskLinkInput(false);
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
        title: form.title,
        description: form.description || null,
        priority: form.priority, status: form.status,
        due_date: form.due_date || null,
      })
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      // Save attachments to task_attachments table
      for (const a of taskAttachments) {
        await fetch('/api/tasks/attachments', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: created.id, file_url: a.url, file_name: a.name, file_type: a.type }),
        });
      }
      loadTasks();
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'medium', status: 'todo', group_id: '', assignee_id: '', due_date: '' });
      setTaskAttachments([]);
    } else {
      const d = await res.json();
      setFormError(d.error || 'Failed to create task');
    }
  }

  async function handleDrop(targetStatus: string) {
    if (!dragTask || dragTask.status === targetStatus) { setDragTask(null); setDragOverCol(null); return; }
    const updated = tasks.map(t => t.id === dragTask.id ? { ...t, status: targetStatus } : t);
    setTasks(updated);
    setDragTask(null);
    setDragOverCol(null);
    await fetch('/api/tasks', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dragTask.id, status: targetStatus }),
    });
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

      {/* Heading */}
      <div className="mb-5">
        {projectName && <div className="text-xs font-black uppercase tracking-widest mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: '#1d3557', color: '#fff' }}>📁 {projectName}</div>}
        <h2 className="text-2xl font-black" style={{ color: '#1d3557' }}>Tasks <span className="text-base font-bold" style={{ color: '#94a3b8' }}>({filtered.length})</span></h2>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
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
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                onPaste={handleTaskPaste}
                placeholder="Description (optional) — paste image with Ctrl+V" rows={2}
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none md:col-span-2"
                style={{ background: '#fff', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
            </div>

            {/* Attachment zone — prominent */}
            <div
              onDragOver={e => { e.preventDefault(); setTaskPasteDragging(true); }}
              onDragLeave={() => setTaskPasteDragging(false)}
              onDrop={handleTaskDrop}
              style={{ border: `2px dashed ${taskPasteDragging ? '#457b9d' : '#a8dadc'}`, background: taskPasteDragging ? '#eff6ff' : '#f0fdf9', borderRadius: 16, padding: 16 }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-sm font-black" style={{ color: '#0f766e' }}>📎 Attachments</span>
                {taskUploading && <span className="text-xs font-bold" style={{ color: '#457b9d' }}>Uploading...</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:opacity-80 transition text-white"
                  style={{ background: '#2a9d8f' }}>
                  🖼️ Upload Image
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => Array.from(e.target.files || []).forEach(uploadTaskFile)} />
                </label>
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:opacity-80 transition text-white"
                  style={{ background: '#c2410c' }}>
                  🎥 Upload Video
                  <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && uploadTaskFile(e.target.files[0])} />
                </label>
                <button type="button" onClick={() => setShowTaskLinkInput(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80 transition"
                  style={{ background: '#eff6ff', color: '#457b9d', border: '1.5px solid #bfdbfe' }}>
                  🔗 Add Link
                </button>
              </div>
              <div
                tabIndex={0}
                onPaste={handleTaskPaste}
                onClick={e => (e.currentTarget as HTMLDivElement).focus()}
                className="mt-2 rounded-xl text-center cursor-pointer outline-none transition flex flex-col items-center justify-center gap-2"
                style={{ border: '2px dashed #94a3b8', color: '#94a3b8', background: '#f8fafc', minHeight: '100px', padding: '24px 16px' }}
              >
                <span style={{ fontSize: 32 }}>📸</span>
                <span className="text-sm font-bold">Click here then Ctrl+V to paste screenshot</span>
                <span className="text-xs font-normal">Supports PNG, JPG, GIF from clipboard</span>
              </div>

              {showTaskLinkInput && (
                <div className="flex gap-2 mt-3">
                  <input value={taskLinkInput} onChange={e => setTaskLinkInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTaskLink())}
                    placeholder="Paste image/video URL and press Enter..."
                    autoFocus
                    className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    style={{ background: '#fff', border: '1.5px solid #bfdbfe', color: '#1d3557' }} />
                  <button type="button" onClick={addTaskLink}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90"
                    style={{ background: '#457b9d' }}>Add</button>
                </div>
              )}

              {taskAttachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
                  {taskAttachments.map((a, i) => (
                    <div key={i} style={{ position: 'relative', paddingTop: 10, paddingRight: 10, display: 'inline-block' }}>
                      {a.type === 'image' && (
                        <img src={a.url} alt={a.name} style={{ width: 120, height: 96, objectFit: 'cover', borderRadius: 12, border: '2px solid #d0dce8', display: 'block' }} />
                      )}
                      {a.type === 'video' && (
                        <div style={{ width: 120, height: 96, background: '#1d3557', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ fontSize: 28 }}>🎥</span>
                          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{a.name.length > 14 ? a.name.substring(0,14)+'...' : a.name}</span>
                        </div>
                      )}
                      {a.type === 'link' && (
                        <div style={{ padding: '8px 12px', border: '1.5px solid #bfdbfe', borderRadius: 12, background: '#eff6ff' }}>
                          <span>🔗</span>
                          <span style={{ color: '#457b9d', fontSize: 11, marginLeft: 4 }}>{a.url.length > 25 ? a.url.substring(0,25)+'...' : a.url}</span>
                        </div>
                      )}
                      <button type="button" onClick={() => setTaskAttachments(prev => prev.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#e63946', color: '#fff', border: '2px solid #fff', fontSize: 14, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', zIndex: 99, lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <button type="submit" disabled={saving || taskUploading}
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
              <div key={col} className="rounded-2xl overflow-hidden transition-all"
                style={{ background: dragOverCol === col ? cfg.head : cfg.bg, border: `1.5px solid ${dragOverCol === col ? cfg.headText : cfg.border}` }}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col)}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: cfg.head }}>
                  <span className="text-sm font-black" style={{ color: cfg.headText }}>{cfg.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.7)', color: cfg.headText }}>{colTasks.length}</span>
                </div>
                <div className="p-3 space-y-2 min-h-24">
                  {colTasks.map(task => (
                    <div key={task.id}
                      draggable
                      onDragStart={() => setDragTask(task)}
                      onDragEnd={() => { setDragTask(null); setDragOverCol(null); }}
                      onClick={() => router.push(`/projects/${id}/tasks/${task.id}`)}
                      className="bg-white rounded-xl p-3 shadow-sm cursor-grab hover:shadow-md transition group relative"
                      style={{ border: '1px solid #e8f0f7', opacity: dragTask?.id === task.id ? 0.4 : 1 }}>
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
                      {task.creator_name && <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>by {task.creator_name}</div>}
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
                    <td className="px-4 py-3 font-semibold" style={{ color: '#1d3557' }}>
                      <div>{task.title}</div>
                      {task.creator_name && <div className="text-xs font-normal mt-0.5" style={{ color: '#94a3b8' }}>by {task.creator_name}</div>}
                    </td>
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
                    <td className="px-4 py-3 text-xs" style={{ color: '#6b7a8d' }}>{task.due_date ? fmtD(task.due_date) : '—'}</td>
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
