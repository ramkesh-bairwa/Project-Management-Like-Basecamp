'use client';
import { use, useEffect, useState, useCallback } from 'react';

interface User {
  id: number; name: string; email: string; role: string;
  plan_name: string | null; plan_expires_at: string | null; project_count: number; active_subs: number;
  created_at: string; is_org: number; email_verified: number;
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `hsl(${hue},55%,48%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.38, fontWeight: 800, flexShrink: 0 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color, textTransform: 'capitalize' }}>{label}</span>;
}

const roleColor: Record<string, { color: string; bg: string }> = {
  admin: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  user: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
  banned: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

export default function AdminUsersPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // Allow linking straight to a filter, e.g. /admin/users?verified=0
  const initialVerified = use(searchParams).verified;
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [verified, setVerified] = useState(initialVerified === '0' || initialVerified === '1' ? initialVerified : '');
  const [unverified, setUnverified] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; type: 'delete' | 'ban' | 'unban' } | null>(null);
  const [confirmVerifyAll, setConfirmVerifyAll] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const limit = 20;
  function getToken() { return localStorage.getItem('admin_token') || localStorage.getItem('token') || ''; }
  const totalPages = Math.ceil(total / limit);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, role, verified });
    fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.error) showNotice(`Could not load users: ${d.error}`, false);
        setUsers(d.users || []); setTotal(d.total || 0); setUnverified(d.unverified || 0);
      })
      .catch(() => showNotice('Could not load users: server error', false))
      .finally(() => setLoading(false));
  }, [page, search, role, verified]);

  function showNotice(text: string, ok: boolean) {
    setNotice({ text, ok });
    setTimeout(() => setNotice(null), 5000);
  }

  async function resendVerification(u: User) {
    setActionId(u.id);
    const res = await fetch('/api/admin/users/resend-verification', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ id: u.id }),
    });
    const d = await res.json().catch(() => ({}));
    setActionId(null);
    showNotice(d.message || d.error || (res.ok ? 'Email sent' : 'Could not send the email'), res.ok);
  }

  async function verifyAll() {
    setConfirmVerifyAll(false);
    const res = await fetch('/api/admin/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ verify_all: true }),
    });
    const d = await res.json().catch(() => ({}));
    showNotice(d.message || d.error || 'Done', res.ok);
    load();
  }

  useEffect(() => { load(); }, [load]);

  async function updateUser(id: number, body: object) {
    setActionId(id);
    await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ id, ...body }) });
    setActionId(null);
    setConfirm(null);
    load();
  }

  async function deleteUser(id: number) {
    setActionId(id);
    await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    setActionId(null);
    setConfirm(null);
    load();
  }

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none' };

  return (
    <div className="fade-in" style={{ padding: '32px 32px 48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, background: '#0f172a', borderRadius: 14, padding: '16px 24px', border: '1px solid #1e293b' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: 0 }}>Users</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>
            {total} {verified || search || role ? 'matching' : 'total'} users
            {unverified > 0 && <> · <span style={{ color: '#f87171', fontWeight: 600 }}>{unverified} unverified</span></>}
          </p>
        </div>
        {unverified > 0 && (
          <button onClick={() => setConfirmVerifyAll(true)}
            style={{ fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.35)', cursor: 'pointer' }}>
            ✓ Verify all {unverified}
          </button>
        )}
      </div>

      {notice && (
        <div role="status" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: notice.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: notice.ok ? '#065f46' : '#991b1b' }}>
          {notice.text}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name or email..." style={{ ...inputStyle, width: 260 }} />
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="banned">Banned</option>
        </select>
        <select value={verified} onChange={e => { setVerified(e.target.value); setPage(1); }} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">All email statuses</option>
          <option value="1">Verified</option>
          <option value="0">Unverified</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['User', 'Email', 'Verified', 'Role', 'Plan', 'Projects', 'Joined', 'Actions'].map(h => (
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
              {!loading && users.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No users found</td></tr>
              )}
              {!loading && users.map(u => {
                const rc = roleColor[u.role] || roleColor.user;
                return (
                  <tr key={u.id} className="row-hover" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={u.name} size={30} />
                        <div>
                          <div style={{ color: '#0f172a', fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                          {u.is_org ? <div style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>ORG</div> : null}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => updateUser(u.id, { email_verified: u.email_verified ? 0 : 1 })}
                        disabled={actionId === u.id}
                        title={u.email_verified ? 'Click to unverify' : 'Click to verify'}
                        style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                          background: u.email_verified ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          color: u.email_verified ? '#059669' : '#ef4444',
                        }}>
                        {u.email_verified ? '✓ Verified' : '✗ Unverified'}
                      </button>
                      {!u.email_verified && (
                        <button
                          onClick={() => resendVerification(u)}
                          disabled={actionId === u.id}
                          title="Send a new verification link to this user"
                          style={{ display: 'block', marginTop: 4, fontSize: 11, fontWeight: 600, padding: 0, border: 'none', background: 'none', color: '#6366f1', cursor: 'pointer', textDecoration: 'underline' }}>
                          {actionId === u.id ? 'Sending…' : 'Resend email'}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select value={u.role} disabled={actionId === u.id}
                        onChange={e => updateUser(u.id, { role: e.target.value })}
                        style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, border: `1px solid ${rc.color}20`, background: rc.bg, color: rc.color, cursor: 'pointer', outline: 'none' }}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="banned">banned</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.plan_name ? (() => {
                        const expired = !!u.plan_expires_at && new Date(u.plan_expires_at) < new Date();
                        return (
                          <div>
                            <Badge label={u.plan_name} color="#6366f1" bg="rgba(99,102,241,0.08)" />
                            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3, color: expired ? '#ef4444' : '#10b981', whiteSpace: 'nowrap' }}>
                              {expired ? 'Expired' : 'Active'}
                              {u.plan_expires_at && ` · ${new Date(u.plan_expires_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            </div>
                          </div>
                        );
                      })() : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>{u.project_count}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => setConfirm({ id: u.id, type: 'delete' })}
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

        {/* Pagination */}
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

      {/* Verify-all modal */}
      {confirmVerifyAll && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>Verify {unverified} user{unverified === 1 ? '' : 's'}?</div>
            <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>They will be able to log in without confirming their email address.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmVerifyAll(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={verifyAll} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Verify all</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 32, marginBottom: 12, textAlign: 'center' }}>⚠️</div>
            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>Delete User?</div>
            <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteUser(confirm.id)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
