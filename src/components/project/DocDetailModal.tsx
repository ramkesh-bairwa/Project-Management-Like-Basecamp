'use client';
import { useEffect, useState } from 'react';
import CommentThread, { CommentNode, buildCommentTree } from './CommentThread';

interface Doc {
  id: number; title: string; description: string; type: string; status: string;
  current_version: number; latest_change: string; last_updated_at: string;
  last_updated_by_name: string; created_by_name: string; comment_count: number;
}

interface Version {
  id: number; version_number: number; uploaded_by_name: string;
  change_summary: string; content: string; file_url: string; file_name: string;
  created_at: string;
}

interface Props {
  doc: Doc;
  userRole: string;
  currentUserId: number;
  onClose: () => void;
  onUpdated: () => void;
}

const typeIcon: Record<string, string> = { doc: '📄', file: '📎', spreadsheet: '📊', design: '🎨', other: '📁' };


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

export default function DocDetailModal({ doc, userRole, currentUserId, onClose, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'content'|'versions'|'comments'>('content');
  const [versions, setVersions] = useState<Version[]>([]);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const canEdit = ['owner','manager'].includes(userRole);

  async function downloadFile(docId: number, versionNum?: number, fileName?: string) {
    const t = localStorage.getItem('token') || '';
    if (!t) return;
    try {
      const url = versionNum
        ? `/api/documents/download?document_id=${docId}&version=${versionNum}`
        : `/api/documents/download?document_id=${docId}`;
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

  useEffect(() => {
    fetch(`/api/documents/versions?document_id=${doc.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) { setVersions(d); if (d[0]?.content) setEditContent(d[0].content); } });
    fetch(`/api/comments?entity_type=document&entity_id=${doc.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }, [doc.id]);

  async function saveVersion(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/documents', { method: 'PUT', headers: h, body: JSON.stringify({ id: doc.id, content: editContent, change_summary: changeSummary || `Version ${doc.current_version + 1}` }) });
    setSaving(false);
    setEditing(false);
    setChangeSummary('');
    fetch(`/api/documents/versions?document_id=${doc.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setVersions(d));
    onUpdated();
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'document', entity_id: doc.id, content: newComment }) });
    setNewComment('');
    fetch(`/api/comments?entity_type=document&entity_id=${doc.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }

  async function replyComment(parentId: number, content: string) {
    await fetch('/api/comments', { method: 'POST', headers: h, body: JSON.stringify({ entity_type: 'document', entity_id: doc.id, content, parent_id: parentId }) });
    fetch(`/api/comments?entity_type=document&entity_id=${doc.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }

  async function resolveComment(id: number, resolved: boolean) {
    await fetch('/api/comments', { method: 'PUT', headers: h, body: JSON.stringify({ id, resolve: resolved, unresolve: !resolved }) });
    fetch(`/api/comments?entity_type=document&entity_id=${doc.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }

  async function deleteComment(id: number) {
    await fetch(`/api/comments?id=${id}`, { method: 'DELETE', headers: h });
    fetch(`/api/comments?entity_type=document&entity_id=${doc.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setComments(d));
  }

  const tree = buildCommentTree(comments);
  const currentVersion = versions[0];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-4" style={{ background: 'rgba(29,53,87,0.6)' }}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" style={{ border: '1px solid #d0dce8' }}>

        {/* Header */}
        <div className="px-6 py-5 flex items-start justify-between gap-4" style={{ borderBottom: '1px solid #d0dce8' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#f1faee', border: '1px solid #d0dce8' }}>
              {typeIcon[doc.type] || '📄'}
            </div>
            <div>
              <h2 className="text-xl font-black" style={{ color: '#1d3557' }}>{doc.title}</h2>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs" style={{ color: '#6b7a8d' }}>v{doc.current_version} · by {doc.created_by_name}</span>
                {doc.last_updated_at && (
                  <span className="text-xs" style={{ color: '#6b7a8d' }}>
                    Updated {fmtD(doc.last_updated_at)} by {doc.last_updated_by_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-xl text-sm font-black text-white hover:opacity-90 transition" style={{ background: '#457b9d' }}>
                ✎ Edit
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100 transition" style={{ color: '#6b7a8d' }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-1" style={{ borderBottom: '1px solid #d0dce8' }}>
          {[
            { key: 'content' as const, label: 'Content' },
            { key: 'versions' as const, label: `History (${versions.length})` },
            { key: 'comments' as const, label: `Comments (${comments.length})` },
          ].map(tab => (
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {activeTab === 'content' && (
            <div>
              {editing ? (
                <form onSubmit={saveVersion} className="space-y-4">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={16}
                    placeholder="Write document content..."
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none font-mono"
                    style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#1d3557' }}
                  />
                  <input
                    value={changeSummary}
                    onChange={e => setChangeSummary(e.target.value)}
                    placeholder="What changed? (e.g. Updated requirements section)"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}
                  />
                  <div className="flex gap-3">
                    <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-black text-white hover:opacity-90 transition disabled:opacity-50" style={{ background: '#2a9d8f' }}>
                      {saving ? 'Saving...' : 'Save New Version'}
                    </button>
                    <button type="button" onClick={() => setEditing(false)} className="px-5 py-2.5 rounded-xl text-sm font-black hover:bg-gray-100 transition" style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  {doc.description && <p className="text-sm mb-4" style={{ color: '#6b7a8d' }}>{doc.description}</p>}
                  {currentVersion?.content ? (
                    <div className="rounded-xl p-5 text-sm leading-relaxed whitespace-pre-wrap font-mono" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#1d3557' }}>
                      {currentVersion.content}
                    </div>
                  ) : currentVersion?.file_url ? (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #d0dce8' }}>
                      {/* Inline viewer */}
                      {(() => {
                        const mime = currentVersion.file_url.match(/data:([^;]+)/)?.[1] || '';
                        if (mime.startsWith('image/')) return (
                          <img src={currentVersion.file_url} alt={currentVersion.file_name}
                            className="w-full max-h-[500px] object-contain bg-gray-50" />
                        );
                        if (mime === 'application/pdf') return (
                          <iframe src={currentVersion.file_url} className="w-full" style={{ height: 500 }} title={currentVersion.file_name} />
                        );
                        if (mime.startsWith('text/') || mime === 'application/json') {
                          try {
                            const text = atob(currentVersion.file_url.split(',')[1]);
                            return (
                              <pre className="p-4 text-xs overflow-auto max-h-96 font-mono" style={{ background: '#f8fafc', color: '#1d3557' }}>{text}</pre>
                            );
                          } catch { /* fall through */ }
                        }
                        return null;
                      })()}
                      {/* Download bar */}
                      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#f1faee', borderTop: '1px solid #d0dce8' }}>
                        <span className="text-xl">📎</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate" style={{ color: '#1d3557' }}>{currentVersion.file_name}</div>
                        </div>
                        <button
                          onClick={() => downloadFile(doc.id, undefined, currentVersion.file_name)}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition flex items-center gap-1.5"
                          style={{ background: '#2a9d8f' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 rounded-2xl" style={{ border: '2px dashed #d0dce8' }}>
                      <div className="text-3xl mb-2">📄</div>
                      <div className="text-sm" style={{ color: '#6b7a8d' }}>No content yet. {canEdit && 'Click Edit to add content.'}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-3">
              {versions.map((v, i) => (
                <div key={v.id} className="rounded-xl p-4 flex items-start gap-4" style={{ background: i === 0 ? '#f0fdf9' : '#f8fafc', border: `1.5px solid ${i === 0 ? '#99f6e4' : '#e2e8f0'}` }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 text-white" style={{ background: i === 0 ? '#2a9d8f' : '#94a3b8' }}>
                    v{v.version_number}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: '#1d3557' }}>{v.change_summary || `Version ${v.version_number}`}</span>
                      {i === 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#f0fdf9', color: '#0f766e' }}>Current</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#6b7a8d' }}>
                      by {v.uploaded_by_name} · {fmtDT(v.created_at)}
                    </div>
                    {v.content && (
                      <div className="mt-2 text-xs rounded-lg p-2 font-mono line-clamp-2" style={{ background: '#f1f5f9', color: '#475569' }}>
                        {v.content.substring(0, 150)}{v.content.length > 150 ? '...' : ''}
                      </div>
                    )}
                    {v.file_url && (
                      <button
                        onClick={() => downloadFile(doc.id, v.version_number, v.file_name)}
                        className="text-xs font-bold mt-1 inline-flex items-center gap-1 hover:underline"
                        style={{ color: '#457b9d' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {v.file_name}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {versions.length === 0 && (
                <div className="text-center py-10 text-sm" style={{ color: '#6b7a8d' }}>No versions yet</div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div>
              <form onSubmit={postComment} className="flex gap-2 mb-5">
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment on this document..."
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}
                />
                <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-black text-white hover:opacity-90 transition" style={{ background: '#457b9d' }}>Post</button>
              </form>
              {tree.length === 0 ? (
                <div className="text-center py-10 rounded-2xl" style={{ border: '2px dashed #d0dce8' }}>
                  <div className="text-3xl mb-2">💬</div>
                  <div className="text-sm" style={{ color: '#6b7a8d' }}>No comments on this document yet</div>
                </div>
              ) : (
                tree.map(c => (
                  <CommentThread key={c.id} comment={c} currentUserId={currentUserId} userRole={userRole}
                    onReply={replyComment} onResolve={resolveComment} onDelete={deleteComment} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
