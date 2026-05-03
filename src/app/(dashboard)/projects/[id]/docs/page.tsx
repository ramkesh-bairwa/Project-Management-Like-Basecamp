'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DocDetailModal from '@/components/project/DocDetailModal';

interface Doc {
  id: number; title: string; description: string; type: string; status: string;
  current_version: number; latest_change: string; last_updated_at: string;
  last_updated_by_name: string; created_by_name: string; comment_count: number;
}

const typeIcon: Record<string, string> = { doc: '📄', file: '📎', spreadsheet: '📊', design: '🎨', other: '📁' };
const typeColors: Record<string, string> = { doc: '#457b9d', file: '#6d6875', spreadsheet: '#2a9d8f', design: '#e9c46a', other: '#94a3b8' };

export default function ProjectDocsPage() {
  const { id } = useParams();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [myRole, setMyRole] = useState('');
  const [myId, setMyId] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ title: '', description: '', type: 'doc', content: '' });

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!id) return;
    loadDocs();
    fetch(`/api/projects/members?project_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (!Array.isArray(d)) return;
        const stored = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        if (stored) {
          const me = d.find((m: { id: number; role: string }) => String(m.id) === stored);
          if (me) { setMyRole(me.role); setMyId(Number(stored)); }
        }
      });
  }, [id]);

  function loadDocs() {
    fetch(`/api/documents?project_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setDocs(d));
  }

  async function createDoc(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/documents', { method: 'POST', headers: h, body: JSON.stringify({ ...form, project_id: Number(id) }) });
    if (res.ok) { loadDocs(); setShowForm(false); setForm({ title: '', description: '', type: 'doc', content: '' }); }
  }

  const canManage = ['owner','manager'].includes(myRole);
  const filtered = filterType ? docs.filter(d => d.type === filterType) : docs;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557] transition">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[#1d3557] transition">Overview</Link>
        <span>/</span>
        <span className="font-bold" style={{ color: '#1d3557' }}>Docs</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h2 className="text-xl font-black mr-2" style={{ color: '#1d3557' }}>Documents ({filtered.length})</h2>
        <div className="flex gap-2 flex-wrap">
          {['', 'doc', 'file', 'spreadsheet', 'design', 'other'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition"
              style={{
                background: filterType === t ? '#1d3557' : '#fff',
                color: filterType === t ? '#fff' : '#6b7a8d',
                border: '1px solid', borderColor: filterType === t ? '#1d3557' : '#d0dce8'
              }}>
              {t ? `${typeIcon[t]} ${t}` : `All (${docs.length})`}
            </button>
          ))}
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition ml-auto"
            style={{ background: '#e63946' }}>
            + New Doc
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '2px dashed #d0dce8' }}>
          <div className="text-5xl mb-4">📄</div>
          <div className="font-black text-[#1d3557] mb-2">No documents yet</div>
          <div className="text-sm text-[#6b7a8d] mb-6">Keep all project documents organized with version history</div>
          {canManage && <button onClick={() => setShowForm(true)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#e63946' }}>Create Document</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <div key={doc.id} onClick={() => setSelectedDoc(doc)}
              className="bg-white rounded-2xl p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
              style={{ border: '1px solid #d0dce8' }}>
              <div className="flex items-start gap-3 mb-3">
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
                  {doc.latest_change && <span className="truncate max-w-28" title={doc.latest_change}>{doc.latest_change}</span>}
                </div>
                {doc.last_updated_at && (
                  <span>{new Date(doc.last_updated_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create doc modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg" style={{ color: '#1d3557' }}>New Document</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition" style={{ color: '#6b7a8d' }}>✕</button>
            </div>
            <form onSubmit={createDoc} className="space-y-4">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Document title *"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)"
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                {['doc','file','spreadsheet','design','other'].map(t => (
                  <option key={t} value={t}>{typeIcon[t]} {t}</option>
                ))}
              </select>
              {form.type === 'doc' && (
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="Initial content (optional)" rows={6}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none font-mono"
                  style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              )}
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: '#e63946' }}>Create</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition" style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doc detail modal */}
      {selectedDoc && (
        <DocDetailModal
          doc={selectedDoc}
          userRole={myRole}
          currentUserId={myId}
          onClose={() => setSelectedDoc(null)}
          onUpdated={() => { loadDocs(); setSelectedDoc(null); }}
        />
      )}
    </div>
  );
}
