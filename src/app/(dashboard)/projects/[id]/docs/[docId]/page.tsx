'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CommentThread, { CommentNode, buildCommentTree } from '@/components/project/CommentThread';

interface Doc {
  id: number; title: string; description: string; type: string; status: string;
  current_version: number; latest_change: string; last_updated_at: string;
  last_updated_by_name: string; created_by_name: string; comment_count: number;
}
interface Version {
  id: number; version_number: number; uploaded_by_name: string;
  change_summary: string; content: string; file_url: string; file_name: string;
  file_size: number; created_at: string;
}

const typeIcon: Record<string, string> = { doc: '📄', file: '📎', spreadsheet: '📊', design: '🎨', other: '📁' };
const typeColors: Record<string, string> = { doc: '#457b9d', file: '#6d6875', spreadsheet: '#2a9d8f', design: '#e9c46a', other: '#94a3b8' };


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

export default function DocDetailPage() {
  const { id, docId } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [activeTab, setActiveTab] = useState<'content' | 'versions' | 'comments'>('content');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [myRole, setMyRole] = useState('');
  const [myId, setMyId] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function loadComments() {
    fetch(`/api/comments?entity_type=document&entity_id=${docId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }

  useEffect(() => {
    if (!docId) return;
    fetch(`/api/documents?id=${docId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d?.id) setDoc(d); });
    fetch(`/api/documents/versions?document_id=${docId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) { setVersions(d); if (d[0]?.content) setEditContent(d[0].content); } });
    loadComments();
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(user => {
        if (user?.id) {
          setMyId(user.id);
          fetch(`/api/projects/members?project_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => {
              if (Array.isArray(d)) {
                const me = d.find((m: { id: number; role: string }) => m.id === user.id);
                if (me) setMyRole(me.role);
              }
            });
        }
      });
  }, [docId]);

  async function saveVersion(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/documents', {
      method: 'PUT', headers: h,
      body: JSON.stringify({ id: Number(docId), content: editContent, change_summary: changeSummary || `Version ${(doc?.current_version ?? 0) + 1}` })
    });
    setSaving(false);
    if (res.ok) {
      showToast('✅ New version saved!', 'success');
      setEditing(false); setChangeSummary('');
      fetch(`/api/documents?id=${docId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => d?.id && setDoc(d));
      fetch(`/api/documents/versions?document_id=${docId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => Array.isArray(d) && setVersions(d));
    } else {
      showToast('Failed to save version', 'error');
    }
  }

  async function downloadFile(versionNum?: number, fileName?: string) {
    const t = localStorage.getItem('token') || '';
    if (!t) return;
    const url = versionNum
      ? `/api/documents/download?document_id=${docId}&version=${versionNum}`
      : `/api/documents/download?document_id=${docId}`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const nameMatch = disposition.match(/filename="([^"]+)"/);
      const name = nameMatch?.[1] || fileName || 'download';
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = name;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { /* ignore */ }
  }

  async function confirmDelete() {
    setDeleting(true);
    const res = await fetch(`/api/documents?id=${docId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setDeleting(false);
    if (res.ok) {
      router.push(`/projects/${id}/docs`);
    } else {
      setShowDeleteModal(false);
      showToast('Failed to delete document', 'error');
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'document', entity_id: Number(docId), content: newComment }) });
    setNewComment('');
    loadComments();
  }

  async function replyComment(parentId: number, content: string) {
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'document', entity_id: Number(docId), content, parent_id: parentId }) });
    loadComments();
  }

  async function resolveComment(cid: number, resolved: boolean) {
    await fetch('/api/comments', { method: 'PUT', headers: h, body: JSON.stringify({ id: cid, resolve: resolved, unresolve: !resolved }) });
    loadComments();
  }

  async function deleteComment(cid: number) {
    await fetch(`/api/comments?id=${cid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadComments();
  }

  const currentVersion = versions[0];
  const canEdit = ['owner', 'manager', 'developer'].includes(myRole);
  const canDelete = ['owner', 'manager'].includes(myRole);
  const tree = buildCommentTree(comments);

  // For file types, default tab is 'comments' if no content
  const tabs = doc?.type === 'doc'
    ? [
        { key: 'content' as const, label: '📝 Content' },
        { key: 'versions' as const, label: `🕓 History (${versions.length})` },
        { key: 'comments' as const, label: `💬 Comments (${comments.length})` },
      ]
    : [
        { key: 'comments' as const, label: `💬 Comments (${comments.length})` },
        { key: 'versions' as const, label: `🕓 History (${versions.length})` },
      ];

  if (!doc) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-[#6b7a8d] text-sm">Loading...</div>
    </div>
  );

  return (
    <div className="max-w-4xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl shadow-xl font-bold text-sm text-white flex items-center gap-2"
          style={{ background: toast.type === 'success' ? '#2a9d8f' : '#e63946' }}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(29,53,87,0.6)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ border: '1px solid #fecaca' }}>
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">🗑️</div>
              <h3 className="font-black text-lg" style={{ color: '#1d3557' }}>Delete {doc.type === 'doc' ? 'Document' : 'File'}?</h3>
              <p className="text-sm mt-2" style={{ color: '#6b7a8d' }}>
                <strong>"{doc.title}"</strong> will be permanently deleted along with all versions and comments. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 disabled:opacity-50 transition"
                style={{ background: '#e63946' }}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557] transition">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[#1d3557] transition">Overview</Link>
        <span>/</span>
        <Link href={`/projects/${id}/docs`} className="hover:text-[#1d3557] transition">Docs & Files</Link>
        <span>/</span>
        <span className="font-bold truncate max-w-48" style={{ color: '#1d3557' }}>{doc.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 mb-4" style={{ border: '1px solid #d0dce8' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: (typeColors[doc.type] || '#94a3b8') + '15', border: `2px solid ${typeColors[doc.type] || '#94a3b8'}30` }}>
              {typeIcon[doc.type] || '📄'}
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: '#1d3557' }}>{doc.title}</h1>
              {doc.description && <p className="text-sm mt-1" style={{ color: '#6b7a8d' }}>{doc.description}</p>}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-bold capitalize"
                  style={{ background: (typeColors[doc.type] || '#94a3b8') + '20', color: typeColors[doc.type] || '#94a3b8' }}>
                  {doc.type}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f1faee', color: '#457b9d' }}>
                  v{doc.current_version}
                </span>
                <span className="text-xs" style={{ color: '#6b7a8d' }}>
                  Created by <strong>{doc.created_by_name}</strong>
                </span>
                {doc.last_updated_at && (
                  <span className="text-xs" style={{ color: '#6b7a8d' }}>
                    Updated {fmtD(doc.last_updated_at)} by <strong>{doc.last_updated_by_name}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {currentVersion?.file_url && (
              <button onClick={() => downloadFile(currentVersion.version_number, currentVersion.file_name)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
                style={{ background: '#2a9d8f' }}>
                ⬇️ Download
              </button>
            )}
            {canEdit && doc.type === 'doc' && !editing && (
              <button onClick={() => { setEditing(true); setActiveTab('content'); }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
                style={{ background: '#457b9d' }}>
                ✎ Edit
              </button>
            )}
            {canDelete && (
              <button onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-50 transition"
                style={{ color: '#e63946', border: '1.5px solid #fecaca' }}>
                🗑 Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File info card */}
      {doc.type !== 'doc' && currentVersion?.file_url && (
        <div className="bg-white rounded-2xl p-5 mb-4 flex items-center gap-4" style={{ border: '1px solid #d0dce8' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#f1faee' }}>
            📎
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-sm" style={{ color: '#1d3557' }}>{currentVersion.file_name}</div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7a8d' }}>
              {currentVersion.file_size ? `${(currentVersion.file_size / 1024).toFixed(1)} KB · ` : ''}
              Uploaded by <strong>{currentVersion.uploaded_by_name}</strong> · {fmtD(currentVersion.created_at)}
            </div>
          </div>
          <button onClick={() => downloadFile(currentVersion.version_number, currentVersion.file_name)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
            style={{ background: '#2a9d8f' }}>
            ⬇️ Download File
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition"
            style={{
              background: activeTab === tab.key ? '#1d3557' : '#fff',
              color: activeTab === tab.key ? '#fff' : '#6b7a8d',
              border: `1.5px solid ${activeTab === tab.key ? '#1d3557' : '#d0dce8'}`
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #d0dce8' }}>

        {/* Content tab — doc only */}
        {activeTab === 'content' && doc.type === 'doc' && (
          editing ? (
            <form onSubmit={saveVersion} className="space-y-4">
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                rows={18} placeholder="Write document content..."
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none font-mono"
                style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <input value={changeSummary} onChange={e => setChangeSummary(e.target.value)}
                placeholder="What changed? (e.g. Updated requirements section)"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#2a9d8f' }}>
                  {saving ? 'Saving...' : '💾 Save New Version'}
                </button>
                <button type="button" onClick={() => setEditing(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-black hover:bg-gray-100"
                  style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            currentVersion?.content ? (
              <div className="rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1d3557' }}>
                {currentVersion.content}
              </div>
            ) : (
              <div className="text-center py-16 rounded-2xl" style={{ border: '2px dashed #d0dce8' }}>
                <div className="text-4xl mb-3">📄</div>
                <div className="font-bold text-sm" style={{ color: '#6b7a8d' }}>No content yet.</div>
                {canEdit && (
                  <button onClick={() => setEditing(true)} className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#457b9d' }}>
                    ✎ Add Content
                  </button>
                )}
              </div>
            )
          )
        )}

        {/* Comments tab */}
        {activeTab === 'comments' && (
          <div>
            <form onSubmit={postComment} className="flex gap-2 mb-6">
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <button type="submit"
                className="px-4 py-2.5 rounded-xl text-sm font-black text-white hover:opacity-90 transition"
                style={{ background: '#457b9d' }}>
                Post
              </button>
            </form>
            {tree.length === 0 ? (
              <div className="text-center py-12 rounded-2xl" style={{ border: '2px dashed #d0dce8' }}>
                <div className="text-3xl mb-2">💬</div>
                <div className="text-sm" style={{ color: '#6b7a8d' }}>No comments yet. Be the first to comment.</div>
              </div>
            ) : (
              tree.map(c => (
                <CommentThread key={c.id} comment={c} currentUserId={myId} userRole={myRole}
                  onReply={replyComment} onResolve={resolveComment} onDelete={deleteComment} />
              ))
            )}
          </div>
        )}

        {/* Version history tab */}
        {activeTab === 'versions' && (
          <div className="space-y-3">
            {versions.map((v, i) => (
              <div key={v.id} className="rounded-xl p-4 flex items-start gap-4"
                style={{ background: i === 0 ? '#f0fdf9' : '#f8fafc', border: `1.5px solid ${i === 0 ? '#99f6e4' : '#e2e8f0'}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 text-white"
                  style={{ background: i === 0 ? '#2a9d8f' : '#94a3b8' }}>
                  v{v.version_number}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm" style={{ color: '#1d3557' }}>{v.change_summary || v.file_name || `Version ${v.version_number}`}</span>
                    {i === 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0fdf9', color: '#0f766e' }}>Current</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7a8d' }}>
                    by {v.uploaded_by_name} · {fmtDT(v.created_at)}
                    {v.file_size ? ` · ${(v.file_size / 1024).toFixed(1)} KB` : ''}
                  </div>
                  {v.content && (
                    <div className="mt-2 text-xs rounded-lg p-2 font-mono line-clamp-2" style={{ background: '#f1f5f9', color: '#475569' }}>
                      {v.content.substring(0, 150)}{v.content.length > 150 ? '...' : ''}
                    </div>
                  )}
                </div>
                {v.file_url && (
                  <button onClick={() => downloadFile(v.version_number, v.file_name)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 flex-shrink-0"
                    style={{ background: '#457b9d' }}>
                    ⬇️ Download
                  </button>
                )}
              </div>
            ))}
            {versions.length === 0 && <div className="text-center py-10 text-sm" style={{ color: '#6b7a8d' }}>No versions yet</div>}
          </div>
        )}
      </div>
    </div>
  );
}
