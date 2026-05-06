'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';
import CommentThread, { CommentNode, buildCommentTree } from '@/components/project/CommentThread';
import ConfirmModal from '@/components/ConfirmModal';
import { formatDate, formatDateOnly } from '@/lib/date';

interface Task {
  id: number; title: string; description: string; status: string; priority: string;
  assignee_id: number | null; assignee_name: string; due_date: string;
  group_name: string; group_color: string; project_id: number; created_at: string;
  creator_name: string;
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

const actionCfg: Record<string, { icon: string; color: string }> = {
  created:                 { icon: '✦', color: '#2a9d8f' },
  status_changed:          { icon: '⇄', color: '#457b9d' },
  closed:                  { icon: '✓', color: '#0f766e' },
  reopened:                { icon: '↺', color: '#c2410c' },
  assigned:                { icon: '→', color: '#6d6875' },
  unassigned:              { icon: '←', color: '#94a3b8' },
  priority_changed:        { icon: '!', color: '#f4a261' },
  title_changed:           { icon: '✎', color: '#457b9d' },
  moved_group:             { icon: '⇢', color: '#e9c46a' },
  subtask_added:           { icon: '+', color: '#2a9d8f' },
  subtask_status_changed:  { icon: '☑', color: '#2a9d8f' },
  comment_added:           { icon: '💬', color: '#457b9d' },
  deleted:                 { icon: '🗑', color: '#e63946' },
};

function buildMessage(action: string, by: string, oldVal: string | null, newVal: string | null): string {
  const sl: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled' };
  const label = (v: string | null) => (v && sl[v]) ? sl[v] : (v || '');
  switch (action) {
    case 'created':                 return `${by} created this task`;
    case 'assigned':                return newVal ? `${by} assigned task to ${newVal}` : `${by} assigned task`;
    case 'unassigned':              return oldVal ? `${by} removed ${oldVal} from this task` : `${by} unassigned task`;
    case 'status_changed':          return `${by} changed status from "${label(oldVal)}" to "${label(newVal)}"`;
    case 'closed':                  return `${by} marked task as Done`;
    case 'reopened':                return `${by} reopened task (from "${label(oldVal)}" to "${label(newVal)}")`;
    case 'priority_changed':        return `${by} changed priority from "${oldVal}" to "${newVal}"`;
    case 'title_changed':           return `${by} renamed task from "${oldVal}" to "${newVal}"`;
    case 'moved_group':             return oldVal ? `${by} moved task from group "${oldVal}" to "${newVal}"` : `${by} moved task to group "${newVal}"`;
    case 'subtask_added':           return `${by} added subtask "${newVal}"`;
    case 'subtask_status_changed':  return `${by} updated subtask "${oldVal}"`;
    case 'comment_added':           return `${by} commented`;
    case 'deleted':                 return `${by} deleted this task`;
    default:                        return `${by} ${action.replace(/_/g, ' ')}`;
  }
}

type FeedItem =
  | { kind: 'history'; entry: HistoryEntry; time: number }
  | { kind: 'comment'; comment: CommentNode; time: number };


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
  const [projectNumId, setProjectNumId] = useState(0);
  const [projectName, setProjectName] = useState('');
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
  const [commentStatus, setCommentStatus] = useState('');
  const [attachments, setAttachments] = useState<{ type: 'image' | 'video' | 'link'; url: string; name: string }[]>([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [uploading, setUploading] = useState(false);
  // saved attachments from DB
  const [savedAttachments, setSavedAttachments] = useState<{ id: number; file_url: string; file_name: string; file_type: string; uploaded_by_name: string }[]>([]);
  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [deleteSubtaskTarget, setDeleteSubtaskTarget] = useState<Subtask | null>(null);
  const [deletingSubtask, setDeletingSubtask] = useState(false);

  useEffect(() => {
    setAttachments([]);
    setNewComment('');
    setCommentStatus('');
  }, [taskId]);

  useEffect(() => {
    const t = getToken();
    const uid = getTokenUserId();
    setToken(t); setMyId(uid);
    if (!id || !taskId) return;
    const auth = { Authorization: `Bearer ${t}` };
    fetch(`/api/projects?id=${id}`, { headers: auth }).then(r => r.json()).then(p => p?.name && setProjectName(p.name));
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
          setProjectNumId(d.project_id);
          setEditStatus(d.status);
          setEditPriority(d.priority);
          setEditAssignee(d.assignee_id ? String(d.assignee_id) : '');
          fetch(`/api/tasks?parent_task_id=${d.id}`, { headers: auth }).then(r => r.json()).then(r => Array.isArray(r) && setSubtasks(r));
          fetch(`/api/comments?entity_type=task&entity_id=${d.id}`, { headers: auth }).then(r => r.json()).then(r => Array.isArray(r) && setComments(buildCommentTree(r)));
          fetch(`/api/tasks/history?task_id=${d.id}`, { headers: auth }).then(r => r.json()).then(r => Array.isArray(r) && setHistory(r));
          loadAttachments(d.id, t);
        } else {
          setAccessDenied(true);
        }
      });
  }, [id, taskId]);

  function loadAttachments(taskNumId: number, t = token) {
    fetch(`/api/tasks/attachments?task_id=${taskNumId}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setSavedAttachments(d));
  }

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
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(buildCommentTree(d)));
  }
  function loadHistory(t = token) {
    if (!task) return;
    fetch(`/api/tasks/history?task_id=${task.id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setHistory(d));
  }

  // Auto-refresh activity every 5 seconds
  useEffect(() => {
    if (!task) return;
    const interval = setInterval(() => {
      loadComments();
      loadHistory();
    }, 5000);
    return () => clearInterval(interval);
  }, [task, token]);

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
    await fetch('/api/tasks', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectNumId, parent_task_id: task.id, title: newSubtask, priority: 'medium' }) });
    setNewSubtask(''); loadSubtasks(); loadHistory();
  }

  async function toggleSubtask(sub: Subtask) {
    await fetch('/api/tasks', { method: 'PUT', headers: h, body: JSON.stringify({ id: sub.id, title: sub.title, status: sub.status === 'done' ? 'todo' : 'done' }) });
    loadSubtasks();
  }

  async function deleteTask() {
    if (!task) return;
    setDeletingTask(true);
    await fetch(`/api/tasks?id=${task.id}`, { method: 'DELETE', headers: h });
    setDeletingTask(false);
    router.push(`/projects/${id}/tasks`);
  }

  async function deleteSubtask() {
    if (!deleteSubtaskTarget) return;
    setDeletingSubtask(true);
    await fetch(`/api/tasks?id=${deleteSubtaskTarget.id}`, { method: 'DELETE', headers: h });
    setDeletingSubtask(false);
    setDeleteSubtaskTarget(null);
    loadSubtasks();
  }

  async function uploadFile(file: File) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('task_id', String(task?.id));
    const res = await fetch('/api/tasks/attachments', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    setUploading(false);
    if (res.ok && task) {
      loadAttachments(task.id);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) { e.preventDefault(); uploadFile(file); }
      }
    }
  }

  async function addLink() {
    const url = linkInput.trim();
    if (!url || !task) return;
    const isVideo = /youtube|youtu\.be|vimeo|\.mp4|\.webm/i.test(url);
    await fetch('/api/tasks/attachments', {
      method: 'POST', headers: { ...h },
      body: JSON.stringify({ task_id: task.id, file_url: url, file_name: url, file_type: isVideo ? 'video' : 'link' })
    });
    setLinkInput(''); setShowLinkInput(false);
    loadAttachments(task.id);
  }

  async function deleteSavedAttachment(attId: number) {
    await fetch(`/api/tasks/attachments?id=${attId}`, { method: 'DELETE', headers: h });
    if (task) loadAttachments(task.id);
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if ((!newComment.trim() && attachments.length === 0) || !task) return;
    setPosting(true);
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'task', entity_id: task.id, content: newComment.trim() }) });
    if (commentStatus && commentStatus !== task.status) {
      setEditStatus(commentStatus);
      await updateTask({ status: commentStatus });
    }
    setNewComment(''); setCommentStatus(''); setAttachments([]); setPosting(false);
    loadComments(); loadHistory();
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
  const canReopen = ['owner', 'admin', 'manager'].includes(myRole);

  // Build feed: newest first — exclude comment_added (shown as actual comments)
  const feed: FeedItem[] = [
    ...history.filter(e => e.action !== 'comment_added').map(e => ({ kind: 'history' as const, entry: e, time: new Date(e.created_at).getTime() })),
    ...commentTree.map(c => ({ kind: 'comment' as const, comment: c, time: new Date(c.created_at).getTime() })),
  ].sort((a, b) => b.time - a.time);

  const [accessDenied, setAccessDenied] = useState(false);

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <div className="font-black text-xl text-[#1d3557] mb-2">Access Denied</div>
      <div className="text-sm text-[#6b7a8d] mb-6">You are not a member of this group or project.</div>
      <button onClick={() => router.push('/projects')}
        className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90"
        style={{ background: '#1d3557' }}>← Back to Projects</button>
    </div>
  );

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
              {projectName && <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: '#eff6ff', color: '#457b9d' }}>📁 {projectName}</span>}
              {task.group_name && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: task.group_color || '#457b9d' }}>{task.group_name}</span>
              )}
              <span className="text-xs" style={{ color: '#94a3b8' }}>#{task.id}</span>
            </div>
            <h1 className="text-xl font-black" style={{ color: '#1d3557' }}>{task.title}</h1>
            {task.description && (
              <div className="text-sm mt-2 space-y-1" style={{ color: '#6b7a8d' }}>
                {task.description.split('\n').map((line, i) => {
                  const imgMatch = line.match(/^!\[.*?\]\((.+?)\)$/);
                  const videoMatch = line.match(/^🎥 \[video\]\((.+?)\)$/);
                  const linkMatch = line.match(/^🔗 (.+)$/);
                  if (imgMatch) return <img key={i} src={imgMatch[1]} alt="attachment" className="rounded-xl max-w-full max-h-64 object-contain mt-1" style={{ border: '1px solid #e2e8f0' }} />;
                  if (videoMatch) return (
                    <div key={i}>
                      {/youtube|youtu\.be|vimeo/i.test(videoMatch[1])
                        ? <a href={videoMatch[1]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background: '#fff7ed', color: '#c2410c', border: '1.5px solid #fed7aa' }}>🎥 Watch Video</a>
                        : <video src={videoMatch[1]} controls className="rounded-xl max-w-full max-h-48 mt-1" style={{ border: '1px solid #e2e8f0' }} />}
                    </div>
                  );
                  if (linkMatch) return <a key={i} href={linkMatch[1]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: '#457b9d' }}>🔗 {linkMatch[1].length > 60 ? linkMatch[1].substring(0,60)+'...' : linkMatch[1]}</a>;
                  return line ? <p key={i}>{line}</p> : null;
                })}
              </div>
            )}
            {task.assignee_name && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{ background: `hsl(${(task.assignee_name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                  {task.assignee_name[0].toUpperCase()}
                </div>
                <span className="text-xs font-bold" style={{ color: '#1d3557' }}>{task.assignee_name}</span>
                <span className="text-xs" style={{ color: '#94a3b8' }}>assigned</span>
              </div>
            )}

            {/* Saved Attachments */}
            {savedAttachments.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-bold mb-2" style={{ color: '#6b7a8d' }}>📎 Attachments ({savedAttachments.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
                  {savedAttachments.map(a => {
                    const ext = a.file_name.split('.').pop()?.toLowerCase() || '';
                    const isInlineImage = ['jpg','jpeg','png','svg','webp','gif'].includes(ext);
                    return (
                      <div key={a.id} style={{ position: 'relative', paddingTop: 10, paddingRight: 10, display: 'inline-block' }}>
                        {isInlineImage ? (
                          // Show as image preview
                          <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                            <img src={a.file_url} alt={a.file_name}
                              style={{ width: 140, height: 110, objectFit: 'cover', borderRadius: 10, border: '2px solid #d0dce8', display: 'block' }} />
                          </a>
                        ) : a.file_type === 'video' ? (
                          // Video — inline player
                          /youtube|youtu\.be|vimeo/i.test(a.file_url)
                            ? <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 140, height: 110, background: '#1d3557', borderRadius: 10, gap: 4, textDecoration: 'none' }}>
                                <span style={{ fontSize: 30 }}>🎥</span>
                                <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>Watch Video</span>
                              </a>
                            : <video src={a.file_url} controls
                                style={{ width: 200, maxHeight: 140, borderRadius: 10, border: '2px solid #d0dce8', display: 'block' }} />
                        ) : a.file_type === 'link' ? (
                          // External link
                          <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1.5px solid #bfdbfe', borderRadius: 10, background: '#eff6ff', maxWidth: 200, textDecoration: 'none' }}>
                            <span style={{ fontSize: 18 }}>🔗</span>
                            <span style={{ color: '#457b9d', fontSize: 11, fontWeight: 600, wordBreak: 'break-all' }}>{a.file_url.length > 30 ? a.file_url.substring(0,30)+'...' : a.file_url}</span>
                          </a>
                        ) : (
                          // Other file types — download card
                          <a href={a.file_url} download={a.file_name} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', maxWidth: 200, textDecoration: 'none' }}>
                            <span style={{ fontSize: 22 }}>
                              {['mp4','webm','mov','avi'].includes(ext) ? '🎥' :
                               ['pdf'].includes(ext) ? '📄' :
                               ['doc','docx'].includes(ext) ? '📝' :
                               ['xls','xlsx','csv'].includes(ext) ? '📊' :
                               ['zip','rar','tar'].includes(ext) ? '🗂' : '📎'}
                            </span>
                            <div>
                              <div style={{ color: '#1d3557', fontSize: 11, fontWeight: 700, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name}</div>
                              <div style={{ color: '#94a3b8', fontSize: 10 }}>{ext.toUpperCase()} • Download</div>
                            </div>
                          </a>
                        )}
                        <button
                          onClick={() => deleteSavedAttachment(a.id)}
                          style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: '#e63946', color: '#fff', border: '2px solid #fff', fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.35)', zIndex: 99 }}
                        >×</button>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.uploaded_by_name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => router.back()} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-gray-100 transition" style={{ color: '#6b7a8d', border: '1px solid #d0dce8' }}>← Back</button>
          {['owner', 'admin', 'manager'].includes(myRole) && (
            <button onClick={() => setDeleteTaskConfirm(true)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-50 transition"
              style={{ color: '#e63946', border: '1px solid #fecaca' }}>
              🗑 Delete Task
            </button>
          )}
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
          {task.due_date && <span className="text-xs" style={{ color: '#6b7a8d' }}>📅 {fmtD(task.due_date)}</span>}
          {saving && <span className="text-xs" style={{ color: '#457b9d' }}>Saving...</span>}
          {saveError && <span className="text-xs font-bold" style={{ color: '#e63946' }}>⚠ {saveError}</span>}
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 text-xs" style={{ borderTop: '1px solid #f1f5f9', color: '#94a3b8' }}>
          <span>🕐 Created {fmtDT(task.created_at)}</span>
          {task.creator_name && <><span>·</span><span>by <strong style={{ color: '#6b7a8d' }}>{task.creator_name}</strong></span></>}
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
            <form onSubmit={postComment}>
              <div className="flex gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{ background: '#457b9d' }}>
                  {members.find(m => m.id === myId)?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <input value={newComment} onChange={e => setNewComment(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Write a comment... (paste image with Ctrl+V)"
                  className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              </div>

              {/* Attachment toolbar */}
              <div className="flex items-center gap-2 mb-3 pl-9">
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition hover:opacity-80"
                  style={{ background: '#f0fdf9', color: '#0f766e', border: '1.5px solid #99f6e4' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  {uploading ? 'Uploading...' : 'Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </label>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition hover:opacity-80"
                  style={{ background: '#fff7ed', color: '#c2410c', border: '1.5px solid #fed7aa' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  Video
                  <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </label>
                <button type="button" onClick={() => setShowLinkInput(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-80"
                  style={{ background: '#eff6ff', color: '#457b9d', border: '1.5px solid #bfdbfe' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Link
                </button>
              </div>

              {/* Link input */}
              {showLinkInput && (
                <div className="flex gap-2 mb-3 pl-9">
                  <input value={linkInput} onChange={e => setLinkInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLink())}
                    placeholder="Paste image/video URL..."
                    className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #bfdbfe', color: '#1d3557' }} />
                  <button type="button" onClick={addLink}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90"
                    style={{ background: '#457b9d' }}>Add</button>
                </div>
              )}

              {uploading && (
                <div style={{ paddingLeft: 36, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "#457b9d", fontWeight: 700 }}>⏳ Uploading...</span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap pl-9">
                <span className="text-xs font-bold flex-shrink-0" style={{ color: '#6b7a8d' }}>Status:</span>
                {statusOptions.map(s => (
                  <button type="button" key={s} onClick={() => setCommentStatus(s === commentStatus ? '' : s)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold transition"
                    style={{
                      background: (commentStatus || task.status) === s ? statusColors[s] : statusColors[s] + '15',
                      color: (commentStatus || task.status) === s ? '#fff' : statusColors[s],
                      border: `1.5px solid ${statusColors[s]}50`,
                    }}>
                    {(commentStatus || task.status) === s && '✓ '}{statusLabels[s]}
                  </button>
                ))}
                <button type="submit" disabled={posting || uploading || !newComment.trim()}
                  className="ml-auto px-4 py-1.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition flex-shrink-0"
                  style={{ background: '#457b9d' }}>
                  {posting ? '...' : 'Post'}
                </button>
              </div>
            </form>
          </div>


          {feed.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '2px dashed #d0dce8' }}>
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm" style={{ color: '#6b7a8d' }}>No activity yet</div>
            </div>
          ) : (() => {
            // Group feed items by date
            const groups: { dateLabel: string; items: FeedItem[] }[] = [];
            feed.forEach(item => {
              const dt = new Date(item.time);
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
                {group.items.map((item) => {
              if (item.kind === 'history') {
                const cfg = actionCfg[item.entry.action] || { icon: '•', color: '#94a3b8' };
                const key = `h-${item.entry.id}`;
                const isOpen = expandedItems.has(key);
                const msg = buildMessage(item.entry.action, item.entry.changed_by_name, item.entry.old_value, item.entry.new_value);
                return (
                  <div key={key} className="bg-white rounded-xl overflow-hidden transition-all"
                    style={{ border: `1px solid ${isOpen ? cfg.color + '40' : '#e2e8f0'}` }}>
                    {/* Row — always clickable */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f8fafc] transition"
                      onClick={() => toggleItem(key)}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: cfg.color }}>{cfg.icon}</div>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: `hsl(${(item.entry.changed_by_name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                        {item.entry.changed_by_name[0]}
                      </div>
                      <span className="flex-1 text-sm min-w-0" style={{ color: '#1d3557' }}>{msg}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>
                        {fmtDT(item.entry.created_at)}
                      </span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
                        className="flex-shrink-0 transition-transform duration-200"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>

                    {/* Expanded detail + quick actions */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: `1px solid ${cfg.color}30`, background: '#fafbfc' }}>
                        {/* Detail card */}
                        <div className="rounded-xl p-3 flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ background: cfg.color }}>{cfg.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black mb-0.5" style={{ color: '#1d3557' }}>{item.entry.changed_by_name}</div>
                            <div className="text-xs" style={{ color: '#6b7a8d' }}>{msg}</div>
                          </div>
                          {/* old → new values */}
                          {(item.entry.old_value || item.entry.new_value) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.entry.old_value && (
                                <span className="text-xs px-2 py-0.5 rounded-lg font-bold line-through" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                                  {item.entry.old_value}
                                </span>
                              )}
                              {item.entry.old_value && item.entry.new_value && <span className="text-xs" style={{ color: '#94a3b8' }}>→</span>}
                              {item.entry.new_value && (
                                <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: '#f0fdf9', color: '#0f766e' }}>
                                  {item.entry.new_value}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick-change controls */}
                        <div className="rounded-xl p-3" style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                          <div className="text-xs font-black mb-2" style={{ color: '#6b7a8d' }}>QUICK UPDATE</div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Status */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Status</span>
                              <select value={editStatus}
                                onChange={e => {
                                  const s = e.target.value;
                                  if (task!.status === 'done' && s !== 'done' && !canReopen) { setSaveError('Only manager/owner can reopen'); return; }
                                  setEditStatus(s); updateTask({ status: s });
                                }}
                                className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                style={{ background: statusColors[editStatus] + '20', color: statusColors[editStatus], border: `1.5px solid ${statusColors[editStatus]}50` }}>
                                {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                              </select>
                            </div>
                            {/* Priority */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Priority</span>
                              <select value={editPriority}
                                onChange={e => { setEditPriority(e.target.value); updateTask({ priority: e.target.value }); }}
                                className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                style={{ background: priorityColors[editPriority] + '20', color: priorityColors[editPriority], border: `1.5px solid ${priorityColors[editPriority]}50` }}>
                                {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            {/* Assignee */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold" style={{ color: '#6b7a8d' }}>Assignee</span>
                              <select value={editAssignee}
                                onChange={e => { setEditAssignee(e.target.value); updateTask({ assignee_id: e.target.value ? Number(e.target.value) : null }); }}
                                className="text-xs px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                                <option value="">Unassigned</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                            {saving && <span className="text-xs" style={{ color: '#457b9d' }}>Saving...</span>}
                            {saveError && <span className="text-xs font-bold" style={{ color: '#e63946' }}>⚠ {saveError}</span>}
                          </div>
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
                  style={{ border: `1px solid ${isOpen ? '#bfdbfe' : '#e2e8f0'}` }}>
                  {/* Compact comment row */}
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f8fafc] transition"
                    onClick={() => toggleItem(key)}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: `hsl(${(item.comment.user_name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                      {item.comment.user_name[0]}
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: '#1d3557' }}>{item.comment.user_name}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: '#6b7a8d' }}>commented</span>
                      {!isOpen && (
                        <span className="text-xs truncate" style={{ color: '#94a3b8' }}>
                          — {item.comment.content.length > 60 ? item.comment.content.substring(0, 60) + '…' : item.comment.content}
                        </span>
                      )}
                      {item.comment.is_resolved && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#f0fdf9', color: '#0f766e' }}>✓ Resolved</span>
                      )}
                      {(item.comment.children?.length ?? 0) > 0 && !isOpen && (
                        <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>💬 {item.comment.children!.length} repl{item.comment.children!.length === 1 ? 'y' : 'ies'}</span>
                      )}
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: '#94a3b8' }}>
                      {fmtDT(item.comment.created_at)}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5"
                      className="flex-shrink-0 transition-transform duration-200"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  {/* Expanded comment thread */}
                  {isOpen && (
                    <div className="px-4 pb-3 pt-1" style={{ borderTop: '1px solid #bfdbfe', background: '#f8fbff' }}>
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
            })}
                </div>
              </div>
            ));
          })()}
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
                  {['owner', 'admin', 'manager'].includes(myRole) && (
                    <button onClick={() => setDeleteSubtaskTarget(sub)}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-50 transition flex-shrink-0"
                      style={{ color: '#e63946', border: '1px solid #fecaca' }}>✕</button>
                  )}
                </div>
              ))}
              <div className="text-xs pt-1" style={{ color: '#6b7a8d' }}>
                {subtasks.filter(s => s.status === 'done').length}/{subtasks.length} completed
              </div>
            </div>
          )}
        </div>
      )}

      {deleteTaskConfirm && (
        <ConfirmModal
          title="Delete Task"
          message={`Delete "${task?.title}"? All subtasks and comments will also be removed.`}
          onConfirm={deleteTask}
          onCancel={() => setDeleteTaskConfirm(false)}
          loading={deletingTask}
        />
      )}

      {deleteSubtaskTarget && (
        <ConfirmModal
          title="Delete Subtask"
          message={`Delete "${deleteSubtaskTarget.title}"?`}
          onConfirm={deleteSubtask}
          onCancel={() => setDeleteSubtaskTarget(null)}
          loading={deletingSubtask}
        />
      )}
    </div>
  );
}
