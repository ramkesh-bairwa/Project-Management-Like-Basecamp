'use client';
import { useEffect, useState, useCallback } from 'react';

interface Project {
  id: number; name: string; status: string; priority: string; visibility: string;
  owner_name: string; owner_email: string; member_count: number; task_count: number; created_at: string;
}

const statusColor: Record<string, { color: string; bg: string }> = {
  active:    { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  planning:  { color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
  on_hold:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  completed: { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  archived:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

const priorityColor: Record<string, { color: string; bg: string }> = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  high:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low:      { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{label.replace('_', ' ')}</span>;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<number | null>(null);

  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('token') || '') : '';
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, status });
    fetch(`/api/admin/projects?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setProjects(d.projects || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [page, search, status, token]);

  useEffect(() => { load(); }, [load]);

  async function deleteProject(id: number) {
    await fetch(`/api/admin/projects?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setConfirm(null);
    load();
  }

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none' };

  return (
    <div className="fade-in" style={{ padding: '32px 32px 48px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, background: '#0f172a', borderRadius: 14, padding: '16px 24px', border: '1px solid #1e293b' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: 0 }}>Projects</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>{total} total projects</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search project or owner..." style={{ ...inputStyle, width: 260 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">All statuses</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Project', 'Owner', 'Status', 'Priority', 'Members', 'Tasks', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                </td></tr>
              )}
              {!loading && projects.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No projects found</td></tr>
              )}
              {!loading && projects.map(p => {
                const sc = statusColor[p.status] || statusColor.planning;
                const pc = priorityColor[p.priority] || priorityColor.medium;
                return (
                  <tr key={p.id} className="row-hover" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#0f172a', fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2, textTransform: 'capitalize' }}>{p.visibility}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 500 }}>{p.owner_name}</div>
                      <div style={{ color: '#94a3b8', fontSize: 11 }}>{p.owner_email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}><Badge label={p.status} color={sc.color} bg={sc.bg} /></td>
                    <td style={{ padding: '12px 16px' }}><Badge label={p.priority} color={pc.color} bg={pc.bg} /></td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{p.member_count}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{p.task_count}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(p.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => setConfirm(p.id)}
                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {confirm !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>Delete Project?</div>
            <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>This will soft-delete the project and all its data.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteProject(confirm)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
