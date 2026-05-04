'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Doc {
  id: number; title: string; description: string; type: string; status: string;
  current_version: number; latest_change: string; last_updated_at: string;
  last_updated_by_name: string; created_by_name: string; comment_count: number;
  file_url?: string; file_name?: string;
}
interface Folder { id: number; name: string; created_by_name: string; doc_count: number; }
interface Toast { msg: string; type: 'success' | 'error'; }

const typeIcon: Record<string, string> = { doc: '📄', file: '📎', spreadsheet: '📊', design: '🎨', other: '📁' };
const typeColors: Record<string, string> = { doc: '#457b9d', file: '#6d6875', spreadsheet: '#2a9d8f', design: '#e9c46a', other: '#94a3b8' };

export default function ProjectDocsPage() {
  const { id } = useParams();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [myRole, setMyRole] = useState('member');
  const [projectId, setProjectId] = useState<number | null>(null);
  const router = useRouter();
  const [showDocForm, setShowDocForm] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [form, setForm] = useState({ title: '', description: '', type: 'doc', content: '' });
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    if (!id) return;
    const auth = { Authorization: `Bearer ${token}` };
    // Resolve numeric project id from slug/uuid/id
    fetch(`/api/projects?id=${id}`, { headers: auth })
      .then(r => r.json()).then(proj => {
        if (!proj?.id) return;
        const pid = proj.id;
        setProjectId(pid);
        fetch('/api/users/me', { headers: auth })
          .then(r => r.json()).then(user => {
            if (!user?.id) return;
            fetch(`/api/projects/members?project_id=${pid}`, { headers: auth })
              .then(r => r.json()).then(d => {
                if (!Array.isArray(d)) return;
                const me = d.find((m: { id: number; role: string }) => m.id === user.id);
                if (me) setMyRole(me.role);
                else router.replace('/projects');
              });
          });
        fetch(`/api/document-folders?project_id=${pid}`, { headers: auth })
          .then(r => r.json()).then(d => Array.isArray(d) && setFolders(d));
        fetch(`/api/documents?project_id=${pid}`, { headers: auth })
          .then(r => r.json()).then(d => Array.isArray(d) && setDocs(d));
      });
  }, [id]);

  function loadFolders() {
    if (!projectId) return;
    fetch(`/api/document-folders?project_id=${projectId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setFolders(d));
  }

  function loadDocs() {
    if (!projectId) return;
    const url = activeFolderId
      ? `/api/documents?project_id=${projectId}&folder_id=${activeFolderId}`
      : `/api/documents?project_id=${projectId}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setDocs(d));
  }

  // Reload docs when folder selection or projectId changes
  useEffect(() => { loadDocs(); }, [projectId, activeFolderId]);

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const res = await fetch('/api/document-folders', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectId, name: folderName }) });
    if (res.ok) {
      showToast('📁 Folder created successfully!', 'success');
      setFolderName(''); setShowFolderForm(false); loadFolders();
    } else {
      showToast('Failed to create folder', 'error');
    }
  }

  async function deleteFolder(folderId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this folder? Documents inside will be moved to root.')) return;
    const res = await fetch(`/api/document-folders?id=${folderId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      showToast('Folder deleted', 'success');
      if (activeFolderId === folderId) setActiveFolderId(null);
      loadFolders(); loadDocs();
    }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); setForm(p => ({ ...p, type: 'file', title: p.title || dropped.name })); }
  }

  async function createDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setUploading(true);
    let file_url = '', file_name = '', file_size = 0;

    if (file && form.type !== 'doc') {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        // DO NOT set Content-Type — browser sets multipart/form-data with boundary automatically
        body: fd,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        showToast(err?.error || 'File upload failed', 'error');
        setUploading(false);
        return;
      }
      const uploaded = await uploadRes.json();
      file_url = uploaded.url;
      file_name = uploaded.name;
      file_size = uploaded.size;
    }

    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        ...form,
        project_id: projectId,
        folder_id: activeFolderId || null,
        ...(file_url ? { file_url, file_name, file_size } : {}),
      }),
    });
    const data = await res.json();
    setUploading(false);
    if (res.ok || data?.id) {
      showToast(`✅ "${form.title}" created successfully!`, 'success');
      loadDocs(); loadFolders();
      setShowDocForm(false);
      setForm({ title: '', description: '', type: 'doc', content: '' });
      setFile(null);
    } else {
      showToast(data?.error || 'Failed to create document', 'error');
    }
  }

  async function downloadDoc(docId: number, docTitle: string) {
    const t = localStorage.getItem('token') || '';
    if (!t) return;
    try {
      const res = await fetch(`/api/documents/download?document_id=${docId}`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const nameMatch = disposition.match(/filename="([^"]+)"/);
      const fileName = nameMatch?.[1] || docTitle;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }

  async function deleteDoc(docId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this document? This cannot be undone.')) return;
    const res = await fetch(`/api/documents?id=${docId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Document deleted', 'success');
      setDocs(prev => prev.filter(d => d.id !== docId));
    } else {
      showToast('Failed to delete document', 'error');
    }
  }

  const activeFolder = folders.find(f => f.id === activeFolderId);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl shadow-xl font-bold text-sm text-white flex items-center gap-2 animate-fade-in"
          style={{ background: toast.type === 'success' ? '#2a9d8f' : '#e63946' }}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557] transition">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[#1d3557] transition">Overview</Link>
        <span>/</span>
        <button onClick={() => setActiveFolderId(null)} className="hover:text-[#1d3557] transition font-bold" style={{ color: activeFolderId ? '#6b7a8d' : '#1d3557' }}>Docs & Files</button>
        {activeFolder && <><span>/</span><span className="font-bold" style={{ color: '#1d3557' }}>📁 {activeFolder.name}</span></>}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h2 className="text-xl font-black" style={{ color: '#1d3557' }}>
          {activeFolder ? `📁 ${activeFolder.name}` : 'Docs & Files'}
        </h2>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setShowFolderForm(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition flex items-center gap-1"
            style={{ background: '#f1faee', color: '#1d3557', border: '1.5px solid #d0dce8' }}>
            📁 New Folder
          </button>
          <button onClick={() => setShowDocForm(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition flex items-center gap-1"
            style={{ background: '#e63946' }}>
            + Upload / New Doc
          </button>
        </div>
      </div>

      {/* Folders row — only show on root */}
      {!activeFolderId && folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {folders.map(folder => (
            <div key={folder.id} onClick={() => setActiveFolderId(folder.id)}
              className="bg-white rounded-2xl p-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all group relative"
              style={{ border: '1.5px solid #d0dce8' }}>
              {/* SVG Folder Icon */}
              <svg width="40" height="36" viewBox="0 0 40 36" fill="none" className="mb-3" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 6C0 4.343 1.343 3 3 3H15L19 8H37C38.657 8 40 9.343 40 11V33C40 34.657 38.657 36 37 36H3C1.343 36 0 34.657 0 33V6Z" fill="#e9c46a"/>
                <path d="M0 11C0 9.343 1.343 8 3 8H37C38.657 8 40 9.343 40 11V33C40 34.657 38.657 36 37 36H3C1.343 36 0 34.657 0 33V11Z" fill="#f4d06f"/>
              </svg>
              <div className="font-black text-sm truncate" style={{ color: '#1d3557' }}>{folder.name}</div>
              <div className="text-xs mt-1" style={{ color: '#6b7a8d' }}>{folder.doc_count} item{folder.doc_count !== 1 ? 's' : ''}</div>
              <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>by {folder.created_by_name}</div>
              <button onClick={e => deleteFolder(folder.id, e)}
                className="absolute top-2 right-2 w-6 h-6 rounded-lg items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition hover:bg-red-50 hidden group-hover:flex"
                style={{ color: '#e63946' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Docs grid */}
      {docs.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '2px dashed #d0dce8' }}>
          <div className="text-5xl mb-4">{activeFolderId ? '📁' : '📄'}</div>
          <div className="font-black text-[#1d3557] mb-2">{activeFolderId ? 'This folder is empty' : 'No documents yet'}</div>
          <div className="text-sm text-[#6b7a8d] mb-6">Upload files or write documents for this project</div>
          <button onClick={() => setShowDocForm(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#e63946' }}>
            + Upload / New Doc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map(doc => (
            <div key={doc.id}
              className="bg-white rounded-2xl p-5 hover:shadow-lg transition-all"
              style={{ border: '1px solid #d0dce8' }}>
              <div className="flex items-start gap-3 mb-3" onClick={() => router.push(`/projects/${id}/docs/${doc.id}`)} style={{ cursor: 'pointer' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: (typeColors[doc.type] || '#94a3b8') + '15' }}>
                  {typeIcon[doc.type] || '📁'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm leading-snug truncate" style={{ color: '#1d3557' }}>{doc.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7a8d' }}>by {doc.created_by_name}</div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: (typeColors[doc.type] || '#94a3b8') + '20', color: typeColors[doc.type] || '#94a3b8' }}>
                  v{doc.current_version}
                </span>
              </div>
              {doc.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: '#6b7a8d' }}>{doc.description}</p>}
              <div className="flex items-center justify-between text-xs" style={{ color: '#94a3b8' }}>
                <div className="flex items-center gap-3">
                  {doc.comment_count > 0 && <span>💬 {doc.comment_count}</span>}
                  {doc.last_updated_at && <span>{new Date(doc.last_updated_at).toLocaleDateString()}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); downloadDoc(doc.id, doc.title); }}
                      title="Download"
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition"
                      style={{ background: '#1d3557' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button
                      onClick={e => deleteDoc(doc.id, e)}
                      title="Delete"
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition"
                      style={{ background: '#e63946' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                    <button onClick={() => router.push(`/projects/${id}/docs/${doc.id}`)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-gray-100 transition"
                      style={{ color: '#457b9d', border: '1px solid #d0dce8' }}>Open →</button>
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg" style={{ color: '#1d3557' }}>📁 New Folder</h3>
              <button onClick={() => setShowFolderForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100" style={{ color: '#6b7a8d' }}>✕</button>
            </div>
            <form onSubmit={createFolder} className="space-y-4">
              <input value={folderName} onChange={e => setFolderName(e.target.value)} required
                placeholder="Folder name *" autoFocus
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90" style={{ background: '#1d3557' }}>Create Folder</button>
                <button type="button" onClick={() => setShowFolderForm(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50" style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Doc / Upload Modal */}
      {showDocForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" style={{ border: '1px solid #d0dce8' }}>
            <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #d0dce8' }}>
              <div>
                <h3 className="font-black text-lg" style={{ color: '#1d3557' }}>Upload / New Document</h3>
                {activeFolder && <div className="text-xs mt-0.5" style={{ color: '#6b7a8d' }}>Saving to 📁 {activeFolder.name}</div>}
              </div>
              <button onClick={() => { setShowDocForm(false); setFile(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100" style={{ color: '#6b7a8d' }}>✕</button>
            </div>
            <form onSubmit={createDoc} className="p-6 space-y-4">

              {/* Folder selector */}
              {folders.length > 0 && (
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: '#6b7a8d' }}>Save to folder</label>
                  <select value={activeFolderId ?? ''} onChange={e => setActiveFolderId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                    <option value="">📂 Root (no folder)</option>
                    {folders.map(f => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
                  </select>
                </div>
              )}

              {/* Type selector */}
              <div className="grid grid-cols-5 gap-2">
                {(['doc', 'file', 'spreadsheet', 'design', 'other'] as const).map(t => (
                  <button key={t} type="button" onClick={() => { setForm(p => ({ ...p, type: t })); setFile(null); }}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition"
                    style={{
                      background: form.type === t ? '#1d3557' : '#f1faee',
                      color: form.type === t ? '#fff' : '#6b7a8d',
                      border: `2px solid ${form.type === t ? '#1d3557' : '#d0dce8'}`
                    }}>
                    <span className="text-xl">{typeIcon[t]}</span>
                    <span className="capitalize">{t}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                placeholder="Title *"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />

              {/* Description */}
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />

              {/* Content for doc */}
              {form.type === 'doc' && (
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Write your document content here..." rows={6}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                  style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              )}

              {/* File upload */}
              {form.type !== 'doc' && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl p-6 text-center cursor-pointer transition"
                  style={{ border: `2px dashed ${dragOver ? '#e63946' : '#d0dce8'}`, background: dragOver ? '#fff5f5' : '#f8fafc' }}>
                  <input ref={fileRef} type="file" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setFile(f); setForm(p => ({ ...p, title: p.title || f.name })); }
                    }} />
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">📎</span>
                      <div className="text-left">
                        <div className="font-bold text-sm" style={{ color: '#1d3557' }}>{file.name}</div>
                        <div className="text-xs" style={{ color: '#6b7a8d' }}>{(file.size / 1024).toFixed(1)} KB · Ready to upload</div>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                        className="ml-2 text-xs px-2 py-1 rounded-lg hover:bg-red-50" style={{ color: '#e63946' }}>✕</button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl mb-2">☁️</div>
                      <div className="font-bold text-sm" style={{ color: '#1d3557' }}>Drop file here or click to browse</div>
                      <div className="text-xs mt-1" style={{ color: '#6b7a8d' }}>Any file type supported</div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition disabled:opacity-50"
                  style={{ background: '#e63946' }}>
                  {uploading ? '⏳ Uploading...' : '⬆️ Upload / Create'}
                </button>
                <button type="button" onClick={() => { setShowDocForm(false); setFile(null); }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                  style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
