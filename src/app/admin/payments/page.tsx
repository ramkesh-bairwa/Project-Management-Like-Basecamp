'use client';
import { useEffect, useState, useCallback } from 'react';

interface Payment {
  id: number; amount: number; billing_cycle: string; status: string;
  created_at: string; provider_ref: string | null;
  user_name: string; user_email: string; plan_name: string;
}
interface Summary { total_revenue: number; completed: number; pending: number; }

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `hsl(${hue},55%,48%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.38, fontWeight: 800, flexShrink: 0 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

const statusStyle: Record<string, { color: string; bg: string }> = {
  completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  failed:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  refunded:  { color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('token') || '') : '';
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), search, status });
    fetch(`/api/admin/payments?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setPayments(d.payments || []); setTotal(d.total || 0); setSummary(d.summary || null); })
      .finally(() => setLoading(false));
  }, [page, search, status, token]);

  useEffect(() => { load(); }, [load]);

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none' };

  const summaryCards = [
    { label: 'Total Revenue', value: `$${Number(summary?.total_revenue ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`, icon: '💰', accent: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    { label: 'Completed', value: summary?.completed ?? 0, icon: '✅', accent: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
    { label: 'Pending', value: summary?.pending ?? 0, icon: '⏳', accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Total Payments', value: total, icon: '📋', accent: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
  ];

  return (
    <div className="fade-in" style={{ padding: '32px 32px 48px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, background: '#0f172a', borderRadius: 14, padding: '16px 24px', border: '1px solid #1e293b' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: 0 }}>Payments</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>Transaction history & revenue</p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {summaryCards.map(s => (
          <div key={s.label} className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 22, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: s.accent, fontWeight: 700, fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search user, email or plan..." style={{ ...inputStyle, width: 280 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['User', 'Plan', 'Amount', 'Cycle', 'Status', 'Ref', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                </td></tr>
              )}
              {!loading && payments.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No payments found</td></tr>
              )}
              {!loading && payments.map(pay => {
                const ss = statusStyle[pay.status] || statusStyle.pending;
                return (
                  <tr key={pay.id} className="row-hover" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={pay.user_name || '?'} size={30} />
                        <div>
                          <div style={{ color: '#0f172a', fontWeight: 600, fontSize: 13 }}>{pay.user_name}</div>
                          <div style={{ color: '#94a3b8', fontSize: 11 }}>{pay.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>{pay.plan_name}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 700, fontSize: 14 }}>${Number(pay.amount).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12, textTransform: 'capitalize' }}>{pay.billing_cycle}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color, textTransform: 'capitalize' }}>{pay.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}>
                      {pay.provider_ref ? pay.provider_ref.slice(0, 12) + '...' : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(pay.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Page {page} of {totalPages} · {total} total</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 12, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
