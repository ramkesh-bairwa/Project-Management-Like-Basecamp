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
interface Subtask { id: number; title: string; status: string; priority: string; comment_count?: number }
interface Member { id: number; name: string; role: string }
interface HistoryEntry {
  id: number; action: string; old_value: string | null; new_value: string | null;
  changed_by_name: string; created_at: string;
}

const statusOptions = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
const priorityOptions = ['low', 'medium', 'high', 'critical'];
const statusColors: Record<string, string> = { todo: '#94a3b8', in_progress: '#6366f1', in_review: '#f59e0b', done: '#10b981', cancelled: '#f43f5e' };
const statusLabels: Record<string, string> = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled' };
const priorityColors: Record<string, string> = { low: '#94a3b8', medium: '#6366f1', high: '#f59e0b', critical: '#f43f5e' };

const actionCfg: Record<string, { icon: string; color: string }> = {
  created:                 { icon: '✦', color: '#10b981' },
  status_changed:          { icon: '⇄', color: '#6366f1' },
  closed:                  { icon: '✓', color: '#0f766e' },
  reopened:                { icon: '↺', color: '#c2410c' },
  assigned:                { icon: '→', color: '#8b5cf6' },
  unassigned:              { icon: '←', color: '#94a3b8' },
  priority_changed:        { icon: '!', color: '#f59e0b' },
  title_changed:           { icon: '✎', color: '#6366f1' },
  moved_group:             { icon: '⇢', color: '#eab308' },
  subtask_added:           { icon: '+', color: '#10b981' },
  subtask_status_changed:  { icon: '☑', color: '#10b981' },
  comment_added:           { icon: '💬', color: '#6366f1' },
  comment_deleted:         { icon: '🗑', color: '#f43f5e' },
  comment_updated:         { icon: '✎', color: '#9333ea' },
  deleted:                 { icon: '🗑', color: '#f43f5e' },
  attachment_deleted:      { icon: '📎', color: '#f43f5e' },
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
    case 'comment_added':           return newVal ? `${by} commented: "${newVal}"` : `${by} commented`;
    case 'comment_deleted':          return oldVal ? `${by} deleted a comment: "${oldVal}"` : `${by} deleted a comment`;
    case 'comment_updated':          return `${by} edited a comment`;
    case 'deleted':                  return `${by} deleted this task`;
    case 'attachment_deleted':       return `${by} deleted attachment "${oldVal}"`;
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
  const [deleteAttachTarget, setDeleteAttachTarget] = useState<{ id: number; name: string } | null>(null);
  const [deletingAttach, setDeletingAttach] = useState(false);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<{ id: number; preview: string } | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [expandedSubtask, setExpandedSubtask] = useState<number | null>(null);
  const [subtaskComments, setSubtaskComments] = useState<Record<number, CommentNode[]>>({});
  const [subtaskCommentInput, setSubtaskCommentInput] = useState<Record<number, string>>({});
  const [postingSubtaskComment, setPostingSubtaskComment] = useState<number | null>(null);

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
    
    try {
      const res = await fetch('/api/tasks', { 
        method: 'POST', 
        headers: h, 
        body: JSON.stringify({ 
          project_id: projectNumId, 
          parent_task_id: task.id, 
          title: newSubtask, 
          priority: 'medium',
          status: 'pending'
        }) 
      });
      
      if (res.ok) {
        setNewSubtask(''); 
        loadSubtasks(); 
        loadHistory();
      } else {
        const errText = await res.text();
        console.error('Subtask creation error:', errText);
        try {
          const err = JSON.parse(errText);
          alert(err.error || 'Failed to create subtask');
        } catch {
          alert('Failed to create subtask: ' + errText);
        }
      }
    } catch (error) {
      console.error('Subtask creation exception:', error);
      alert('Network error. Please try again.');
    }
  }

  async function toggleSubtask(sub: Subtask) {
    const newStatus = (sub.status === 'done' || sub.status === 'completed') ? 'pending' : 'completed';
    await fetch('/api/tasks', { method: 'PUT', headers: h, body: JSON.stringify({ id: sub.id, title: sub.title, status: newStatus }) });
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

  function toggleSubtaskComments(subtaskId: number) {
    if (expandedSubtask === subtaskId) {
      setExpandedSubtask(null);
      return;
    }
    setExpandedSubtask(subtaskId);
    if (!subtaskComments[subtaskId]) {
      loadSubtaskComments(subtaskId);
    }
  }

  function loadSubtaskComments(subtaskId: number) {
    fetch(`/api/comments?entity_type=task&entity_id=${subtaskId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => Array.isArray(d) && setSubtaskComments(prev => ({ ...prev, [subtaskId]: buildCommentTree(d) })));
  }

  async function postSubtaskComment(e: React.FormEvent, subtaskId: number) {
    e.preventDefault();
    const content = subtaskCommentInput[subtaskId]?.trim();
    if (!content) return;
    setPostingSubtaskComment(subtaskId);
    await fetch('/api/comments', {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ entity_type: 'task', entity_id: subtaskId, content })
    });
    setSubtaskCommentInput(prev => ({ ...prev, [subtaskId]: '' }));
    setPostingSubtaskComment(null);
    loadSubtaskComments(subtaskId);
    loadSubtasks();
    loadHistory();
  }

  async function replySubtaskComment(subtaskId: number, parentId: number, content: string) {
    await fetch('/api/comments', {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ entity_type: 'task', entity_id: subtaskId, content, parent_id: parentId })
    });
    loadSubtaskComments(subtaskId);
    loadHistory();
  }

  async function resolveSubtaskComment(subtaskId: number, cid: number, resolved: boolean) {
    await fetch('/api/comments', {
      method: 'PUT',
      headers: h,
      body: JSON.stringify({ id: cid, resolve: resolved, unresolve: !resolved })
    });
    loadSubtaskComments(subtaskId);
  }

  async function deleteSubtaskComment(subtaskId: number, cid: number) {
    await fetch(`/api/comments?id=${cid}`, { method: 'DELETE', headers: h });
    loadSubtaskComments(subtaskId);
    loadHistory();
  }

  async function uploadFile(file: File) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    if (isImage) {
      // Upload to comment-specific endpoint — embed in comment text
      const res = await fetch('/api/comments/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      setUploading(false);
      if (res.ok) {
        const data = await res.json();
        setNewComment(prev => (prev ? prev + '\n' : '') + `![image](${data.url})`);
      }
    } else {
      // Videos still go to task attachments
      fd.append('task_id', String(task?.id));
      const res = await fetch('/api/tasks/attachments', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      setUploading(false);
      if (res.ok && task) loadAttachments(task.id);
    }
  }

  async function uploadTaskImage(file: File) {
    if (!task || !file.type.startsWith('image/')) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('task_id', String(task.id));
    const res = await fetch('/api/tasks/attachments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    setUploading(false);
    if (res.ok) loadAttachments(task.id);
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

  async function deleteSavedAttachment() {
    if (!deleteAttachTarget || !task) return;
    setDeletingAttach(true);
    await fetch(`/api/tasks/attachments?id=${deleteAttachTarget.id}`, { method: 'DELETE', headers: h });
    setDeletingAttach(false);
    setDeleteAttachTarget(null);
    loadAttachments(task.id);
    // Refresh history so the deletion shows in activity
    fetch(`/api/tasks/history?task_id=${task.id}`, { headers: h })
      .then(r => r.json()).then(r => Array.isArray(r) && setHistory(r));
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
    loadHistory();
  }
  async function resolveComment(cid: number, resolved: boolean) {
    await fetch('/api/comments', { method: 'PUT', headers: h, body: JSON.stringify({ id: cid, resolve: resolved, unresolve: !resolved }) });
    loadComments();
  }
  async function editComment(cid: number, content: string) {
    await fetch('/api/comments', { method: 'PUT', headers: h, body: JSON.stringify({ id: cid, content }) });
    loadComments();
    loadHistory();
  }
  async function deleteComment() {
    if (!deleteCommentTarget || !task) return;
    setDeletingComment(true);
    await fetch(`/api/comments?id=${deleteCommentTarget.id}`, { method: 'DELETE', headers: h });
    setDeletingComment(false);
    setDeleteCommentTarget(null);
    loadComments();
    loadHistory();
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

  // Build feed: newest first. New comments render as comments; edits/deletes render as history.
  const feed: FeedItem[] = [
    ...history.filter(e => e.action !== 'comment_added').map(e => ({ kind: 'history' as const, entry: e, time: new Date(e.created_at).getTime() })),
    ...commentTree.map(c => ({ kind: 'comment' as const, comment: c, time: new Date(c.created_at).getTime() })),
  ].sort((a, b) => b.time - a.time);

  const [accessDenied, setAccessDenied] = useState(false);

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <div className="font-black text-xl text-[var(--text)] mb-2">Access Denied</div>
      <div className="text-sm text-[var(--text-muted)] mb-6">You are not a member of this group or project.</div>
      <button onClick={() => router.push('/projects')}
        className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90"
        style={{ background: 'var(--primary)' }}>← Back to Projects</button>
    </div>
  );

  if (!task) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-4xl mb-3 text-center">⏳<br /><span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</span></div>
    </div>
  );

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
        <Link href="/projects" className="hover:text-[var(--text)]">Projects</Link><span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[var(--text)]">Overview</Link><span>/</span>
        <Link href={`/projects/${id}/tasks`} className="hover:text-[var(--text)]">Tasks</Link><span>/</span>
        <span className="font-bold truncate max-w-48" style={{ color: 'var(--text)' }}>{task.title}</span>
      </div>

      {/* Task header */}
      <div className="bg-surface rounded-2xl p-5 mb-4" style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {projectName && <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: 'var(--info-soft)', color: 'var(--link)' }}>📁 {projectName}</span>}
              {task.group_name && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: task.group_color || 'var(--link)' }}>{task.group_name}</span>
              )}
              <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>#{task.id}</span>
            </div>
            <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>{task.title}</h1>
            {task.description && (
              <div className="text-sm mt-2 space-y-1" style={{ color: 'var(--text-muted)' }}>
                {task.description.split('\n').map((line, i) => {
                  const imgMatch = line.match(/^!\[.*?\]\((.+?)\)$/);
                  const videoMatch = line.match(/^🎥 \[video\]\((.+?)\)$/);
                  const linkMatch = line.match(/^🔗 (.+)$/);
                  if (imgMatch) return <img key={i} src={imgMatch[1]} alt="attachment" className="rounded-xl max-w-full max-h-64 object-contain mt-1" style={{ border: '1px solid var(--border)' }} />;
                  if (videoMatch) return (
                    <div key={i}>
                      {/youtube|youtu\.be|vimeo/i.test(videoMatch[1])
                        ? <a href={videoMatch[1]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80" style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)', border: '1.5px solid var(--warning-soft)' }}>🎥 Watch Video</a>
                        : <video src={videoMatch[1]} controls className="rounded-xl max-w-full max-h-48 mt-1" style={{ border: '1px solid var(--border)' }} />}
                    </div>
                  );
                  if (linkMatch) return <a key={i} href={linkMatch[1]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--link)' }}>🔗 {linkMatch[1].length > 60 ? linkMatch[1].substring(0,60)+'...' : linkMatch[1]}</a>;
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
                <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{task.assignee_name}</span>
                <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>assigned</span>
              </div>
            )}

            {/* Saved Attachments */}
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>📎 Attachments ({savedAttachments.length})</div>
                <label
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition hover:opacity-80"
                  style={{ background: 'var(--success-soft)', color: 'var(--success-text)', border: '1px solid var(--success-soft)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  {uploading ? 'Uploading...' : 'Add Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) uploadTaskImage(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
              {savedAttachments.length > 0 && (
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
                              style={{ width: 140, height: 110, objectFit: 'cover', borderRadius: 10, border: '2px solid var(--border)', display: 'block' }} />
                          </a>
                        ) : a.file_type === 'video' ? (
                          // Video — inline player
                          /youtube|youtu\.be|vimeo/i.test(a.file_url)
                            ? <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 140, height: 110, background: 'var(--primary)', borderRadius: 10, gap: 4, textDecoration: 'none' }}>
                                <span style={{ fontSize: 30 }}>🎥</span>
                                <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>Watch Video</span>
                              </a>
                            : <video src={a.file_url} controls
                                style={{ width: 200, maxHeight: 140, borderRadius: 10, border: '2px solid var(--border)', display: 'block' }} />
                        ) : a.file_type === 'link' ? (
                          // External link
                          <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1.5px solid var(--info-soft)', borderRadius: 10, background: 'var(--info-soft)', maxWidth: 200, textDecoration: 'none' }}>
                            <span style={{ fontSize: 18 }}>🔗</span>
                            <span style={{ color: 'var(--link)', fontSize: 11, fontWeight: 600, wordBreak: 'break-all' }}>{a.file_url.length > 30 ? a.file_url.substring(0,30)+'...' : a.file_url}</span>
                          </a>
                        ) : (
                          // Other file types — download card
                          <a href={a.file_url} download={a.file_name} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)', maxWidth: 200, textDecoration: 'none' }}>
                            <span style={{ fontSize: 22 }}>
                              {['mp4','webm','mov','avi'].includes(ext) ? '🎥' :
                               ['pdf'].includes(ext) ? '📄' :
                               ['doc','docx'].includes(ext) ? '📝' :
                               ['xls','xlsx','csv'].includes(ext) ? '📊' :
                               ['zip','rar','tar'].includes(ext) ? '🗂' : '📎'}
                            </span>
                            <div>
                              <div style={{ color: 'var(--text)', fontSize: 11, fontWeight: 700, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name}</div>
                              <div style={{ color: 'var(--text-subtle)', fontSize: 10 }}>{ext.toUpperCase()} • Download</div>
                            </div>
                          </a>
                        )}
                        <button
                          onClick={() => setDeleteAttachTarget({ id: a.id, name: a.file_name })}
                          style={{ position: 'absolute', top: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: '2px solid #fff', fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.35)', zIndex: 99 }}
                        >×</button>
                        <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.uploaded_by_name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => router.back()} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-gray-100 transition" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>← Back</button>
          {['owner', 'admin', 'manager'].includes(myRole) && (
            <button onClick={() => setDeleteTaskConfirm(true)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-50 transition"
              style={{ color: 'var(--accent)', border: '1px solid var(--danger-soft)' }}>
              🗑 Delete Task
            </button>
          )}
        </div>

        {/* Inline controls */}
        <div className="flex items-center gap-3 flex-wrap pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Status</span>
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
            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Priority</span>
            <select value={editPriority}
              onChange={e => { setEditPriority(e.target.value); updateTask({ priority: e.target.value }); }}
              className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
              style={{ background: priorityColors[editPriority] + '20', color: priorityColors[editPriority], border: `1.5px solid ${priorityColors[editPriority]}50` }}>
              {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Assignee</span>
            <select value={editAssignee}
              onChange={e => { setEditAssignee(e.target.value); updateTask({ assignee_id: e.target.value ? Number(e.target.value) : null }); }}
              className="text-xs px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>
              <option value="">{task.assignee_name || 'Unassigned'}</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
          </div>
          {task.due_date && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>📅 {fmtD(task.due_date)}</span>}
          {saving && <span className="text-xs" style={{ color: 'var(--link)' }}>Saving...</span>}
          {saveError && <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>⚠ {saveError}</span>}
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 text-xs" style={{ borderTop: '1px solid var(--border-soft)', color: 'var(--text-subtle)' }}>
          <span>🕐 Created {fmtDT(task.created_at)}</span>
          {task.creator_name && <><span>·</span><span>by <strong style={{ color: 'var(--text-muted)' }}>{task.creator_name}</strong></span></>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-3)' }}>
        {[
          { key: 'activity' as const, label: `📋 Activity (${feed.length})` },
          { key: 'subtasks' as const, label: `✅ Subtasks (${subtasks.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition"
            style={{ background: activeTab === tab.key ? 'var(--primary)' : 'transparent', color: activeTab === tab.key ? '#fff' : 'var(--text-muted)' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ACTIVITY TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-2">
          {/* Comment input */}
          <div className="bg-surface rounded-2xl p-4 mb-2" style={{ border: '1px solid var(--border)' }}>
            <form onSubmit={postComment}>
              <div className="flex gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                  style={{ background: 'var(--link)' }}>
                  {members.find(m => m.id === myId)?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <input value={newComment} onChange={e => setNewComment(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Write a comment... (paste image with Ctrl+V)"
                  className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
              </div>

              {/* Attachment toolbar */}
              <div className="flex items-center gap-2 mb-3 pl-9">
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition hover:opacity-80"
                  style={{ background: 'var(--success-soft)', color: 'var(--success-text)', border: '1.5px solid var(--success-soft)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  {uploading ? 'Uploading...' : 'Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </label>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition hover:opacity-80"
                  style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)', border: '1.5px solid var(--warning-soft)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  Video
                  <input type="file" accept="video/*" className="hidden" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </label>
                <button type="button" onClick={() => setShowLinkInput(v => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition hover:opacity-80"
                  style={{ background: 'var(--info-soft)', color: 'var(--link)', border: '1.5px solid var(--info-soft)' }}>
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
                    style={{ background: 'var(--surface-2)', border: '1.5px solid var(--info-soft)', color: 'var(--text)' }} />
                  <button type="button" onClick={addLink}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90"
                    style={{ background: 'var(--link)' }}>Add</button>
                </div>
              )}

              {uploading && (
                <div style={{ paddingLeft: 36, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--link)", fontWeight: 700 }}>⏳ Uploading...</span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap pl-9">
                <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Status:</span>
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
                  style={{ background: 'var(--link)' }}>
                  {posting ? '...' : 'Post'}
                </button>
              </div>
            </form>
          </div>


          {feed.length === 0 ? (
            <div className="bg-surface rounded-2xl p-12 text-center" style={{ border: '2px dashed var(--border)' }}>
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No activity yet</div>
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
                  <div className="flex-1 h-px" style={{ background: 'var(--surface-3)' }} />
                  <span className="text-xs font-black px-3 py-1 rounded-full flex-shrink-0"
                    style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{group.dateLabel}</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--surface-3)' }} />
                </div>
                <div className="space-y-2">
                {group.items.map((item) => {
              if (item.kind === 'history') {
                const cfg = actionCfg[item.entry.action] || { icon: '•', color: '#94a3b8' };
                const key = `h-${item.entry.id}`;
                const isOpen = expandedItems.has(key);
                const msg = buildMessage(item.entry.action, item.entry.changed_by_name, item.entry.old_value, item.entry.new_value);
                return (
                  <div key={key} className="bg-surface rounded-xl overflow-hidden transition-all"
                    style={{ border: `1px solid ${isOpen ? cfg.color + '40' : '#e2e8f0'}` }}>
                    {/* Row — always clickable */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--surface-2)] transition"
                      onClick={() => toggleItem(key)}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: cfg.color }}>{cfg.icon}</div>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: `hsl(${(item.entry.changed_by_name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                        {item.entry.changed_by_name[0]}
                      </div>
                      <span className="flex-1 text-sm min-w-0" style={{ color: 'var(--text)' }}>{msg}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>
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
                        <div className="rounded-xl p-3 flex items-center gap-3 flex-wrap" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{ background: cfg.color }}>{cfg.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-black mb-0.5" style={{ color: 'var(--text)' }}>{item.entry.changed_by_name}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{msg}</div>
                          </div>
                          {/* old → new values */}
                          {(item.entry.old_value || item.entry.new_value) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.entry.old_value && (
                                <span className="text-xs px-2 py-0.5 rounded-lg font-bold line-through" style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)' }}>
                                  {item.entry.old_value}
                                </span>
                              )}
                              {item.entry.old_value && item.entry.new_value && <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>→</span>}
                              {item.entry.new_value && (
                                <span className="text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: 'var(--success-soft)', color: 'var(--success-text)' }}>
                                  {item.entry.new_value}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick-change controls */}
                        <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <div className="text-xs font-black mb-2" style={{ color: 'var(--text-muted)' }}>QUICK UPDATE</div>
                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Status */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Status</span>
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
                              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Priority</span>
                              <select value={editPriority}
                                onChange={e => { setEditPriority(e.target.value); updateTask({ priority: e.target.value }); }}
                                className="text-xs font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                style={{ background: priorityColors[editPriority] + '20', color: priorityColors[editPriority], border: `1.5px solid ${priorityColors[editPriority]}50` }}>
                                {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            {/* Assignee */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Assignee</span>
                              <select value={editAssignee}
                                onChange={e => { setEditAssignee(e.target.value); updateTask({ assignee_id: e.target.value ? Number(e.target.value) : null }); }}
                                className="text-xs px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>
                                <option value="">Unassigned</option>
                                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                            {saving && <span className="text-xs" style={{ color: 'var(--link)' }}>Saving...</span>}
                            {saveError && <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>⚠ {saveError}</span>}
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
                <div key={key} className="bg-surface rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${isOpen ? 'var(--info-soft)' : 'var(--border)'}` }}>
                  {/* Compact comment row */}
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--surface-2)] transition"
                    onClick={() => toggleItem(key)}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: `hsl(${(item.comment.user_name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                      {item.comment.user_name[0]}
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--text)' }}>{item.comment.user_name}</span>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>commented</span>
                      {!isOpen && (
                        <span className="text-xs truncate" style={{ color: 'var(--text-subtle)' }}>
                          — {item.comment.content.length > 60 ? item.comment.content.substring(0, 60) + '…' : item.comment.content}
                        </span>
                      )}
                      {item.comment.is_resolved && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--success-soft)', color: 'var(--success-text)' }}>✓ Resolved</span>
                      )}
                      {(item.comment.children?.length ?? 0) > 0 && !isOpen && (
                        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>💬 {item.comment.children!.length} repl{item.comment.children!.length === 1 ? 'y' : 'ies'}</span>
                      )}
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-subtle)' }}>
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
                    <div className="px-4 pb-3 pt-1" style={{ borderTop: '1px solid var(--info-soft)', background: 'var(--surface-2)' }}>
                      <CommentThread
                        comment={item.comment}
                        currentUserId={myId}
                        userRole={myRole}
                        onReply={replyComment}
                        onResolve={resolveComment}
                        onEdit={editComment}
                        onDelete={async (cid) => {
                          await fetch(`/api/comments?id=${cid}`, { method: 'DELETE', headers: h });
                          loadComments();
                          loadHistory();
                        }}
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
        <div className="bg-surface rounded-2xl p-5" style={{ border: '1px solid var(--border)' }}>
          <form onSubmit={addSubtask} className="flex gap-2 mb-4">
            <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="Add a subtask..."
              className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
            <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: 'var(--success)' }}>+ Add</button>
          </form>
          {subtasks.length === 0 ? (
            <div className="text-center py-10 rounded-xl" style={{ border: '2px dashed var(--border)' }}>
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No subtasks yet</div>
            </div>
          ) : (
            <div className="space-y-2">
              {subtasks.map(sub => (
                <div key={sub.id} className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {/* Subtask row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <input type="checkbox" checked={sub.status === 'done' || sub.status === 'completed'} onChange={() => toggleSubtask(sub)}
                      className="w-4 h-4 rounded accent-teal-600 flex-shrink-0 cursor-pointer" />
                    <span className={`flex-1 text-sm font-medium ${(sub.status === 'done' || sub.status === 'completed') ? 'line-through' : ''}`}
                      style={{ color: (sub.status === 'done' || sub.status === 'completed') ? 'var(--text-subtle)' : 'var(--text)' }}>
                      {sub.title}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: statusColors[sub.status] + '20', color: statusColors[sub.status] }}>
                      {sub.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold" style={{ color: priorityColors[sub.priority] }}>{sub.priority}</span>
                    <button onClick={() => toggleSubtaskComments(sub.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition"
                      style={{
                        color: expandedSubtask === sub.id ? 'var(--link)' : 'var(--text-subtle)',
                        background: expandedSubtask === sub.id ? 'var(--info-soft)' : 'transparent',
                        border: `1px solid ${expandedSubtask === sub.id ? 'var(--info-soft)' : 'var(--border)'}`
                      }}>
                      💬 {sub.comment_count || 0}
                    </button>
                    {['owner', 'admin', 'manager'].includes(myRole) && (
                      <button onClick={() => setDeleteSubtaskTarget(sub)}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-50 transition flex-shrink-0"
                        style={{ color: 'var(--accent)', border: '1px solid var(--danger-soft)' }}>✕</button>
                    )}
                  </div>

                  {/* Comments section */}
                  {expandedSubtask === sub.id && (
                    <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                      {/* Comment input */}
                      <form onSubmit={(e) => postSubtaskComment(e, sub.id)} className="mb-3">
                        <div className="flex gap-2">
                          <input
                            value={subtaskCommentInput[sub.id] || ''}
                            onChange={e => setSubtaskCommentInput(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            placeholder="Write a comment..."
                            className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
                            style={{ background: 'var(--surface)', border: '1.5px solid var(--info-soft)', color: 'var(--text)' }}
                          />
                          <button
                            type="submit"
                            disabled={postingSubtaskComment === sub.id || !subtaskCommentInput[sub.id]?.trim()}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-40 transition"
                            style={{ background: 'var(--link)' }}>
                            {postingSubtaskComment === sub.id ? '...' : 'Post'}
                          </button>
                        </div>
                      </form>

                      {/* Comments list */}
                      {!subtaskComments[sub.id] ? (
                        <div className="text-xs py-2 text-center" style={{ color: 'var(--text-subtle)' }}>Loading comments...</div>
                      ) : subtaskComments[sub.id].length === 0 ? (
                        <div className="text-xs py-2 text-center rounded-lg" style={{ color: 'var(--text-subtle)', border: '1px dashed var(--border)' }}>
                          No comments yet
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {subtaskComments[sub.id].map(comment => (
                            <CommentThread
                              key={comment.id}
                              comment={comment}
                              currentUserId={myId}
                              userRole={myRole}
                              onReply={(parentId, content) => replySubtaskComment(sub.id, parentId, content)}
                              onResolve={(cid, resolved) => resolveSubtaskComment(sub.id, cid, resolved)}
                              onEdit={editComment}
                              onDelete={(cid) => deleteSubtaskComment(sub.id, cid)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                {subtasks.filter(s => s.status === 'done' || s.status === 'completed').length}/{subtasks.length} completed
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

      {deleteAttachTarget && (
        <ConfirmModal
          title="Delete Attachment"
          message={`Delete "${deleteAttachTarget.name}"? This cannot be undone.`}
          onConfirm={deleteSavedAttachment}
          onCancel={() => setDeleteAttachTarget(null)}
          loading={deletingAttach}
        />
      )}

      {deleteCommentTarget && (
        <ConfirmModal
          title="Delete Comment"
          message={`Delete this comment? "${deleteCommentTarget.preview}${deleteCommentTarget.preview.length >= 80 ? '…' : ''}" This cannot be undone.`}
          onConfirm={deleteComment}
          onCancel={() => setDeleteCommentTarget(null)}
          loading={deletingComment}
        />
      )}
    </div>
  );
}
