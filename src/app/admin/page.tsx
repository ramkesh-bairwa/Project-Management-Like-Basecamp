'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  total_users: number; admin_users: number;
  total_projects: number; active_projects: number;
  total_tasks: number; total_payments: number; total_revenue: number;
}
interface Plan { id: number; name: string; price: number; subscribers: number; }
interface RecentUser { id: number; name: string; email: string; role: string; created_at: string; }
interface RecentPayment { id: number; user_name: string; plan_name: string; amount: number; billing_cycle: string; status: string; created_at: string; }

function fmtD(d: string) {
  return new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `hsl(${hue},55%,48%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.38, fontWeight: 800, flexShrink: 0 }}>
      {name[0].toUpperCase()}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    if (!token) { router.push('/admin/login'); return; }
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setStats(d.stats); setPlans(d.plans || []);
        setRecentUsers(d.recent_users || []); setRecentPayments(d.recent_payments || []);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Access Denied</div>
        <div style={{ color: '#64748b', fontSize: 13 }}>{error}</div>
      </div>
    </div>
  );

  const statCards = [
    { label: 'Total Users', value: stats?.total_users ?? 0, sub: `${stats?.admin_users ?? 0} admins`, icon: '👥', accent: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
    { label: 'Projects', value: stats?.total_projects ?? 0, sub: `${stats?.active_projects ?? 0} active`, icon: '📁', accent: '#10b981', bg: 'rgba(16,185,129,0.08)' },
    { label: 'Tasks', value: stats?.total_tasks ?? 0, sub: 'across all projects', icon: '✅', accent: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Revenue', value: `$${Number(stats?.total_revenue ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`, sub: `${stats?.total_payments ?? 0} payments`, icon: '💰', accent: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
  ];

  return (
    <div className="fade-in" style={{ padding: '32px 32px 48px' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, background: '#0f172a', borderRadius: 14, padding: '16px 24px', border: '1px solid #1e293b' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>Welcome back — here&apos;s what&apos;s happening</p>
        </div>
        <div style={{ padding: '6px 14px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>
          {new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 20px 18px', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.accent, marginTop: 4 }} />
            </div>
            <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 26, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: s.accent, fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{s.label}</div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Middle row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Plans */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Subscription Plans</div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{plans.length} plans available</div>
            </div>
            <button onClick={() => router.push('/admin/plans')} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: 12, fontWeight: 600, border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer' }}>Manage</button>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plans.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No plans yet</div>}
            {plans.map((p, i) => {
              const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
              const c = colors[i % colors.length];
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: c, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>${p.price}/month</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: c, fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{p.subscribers}</div>
                    <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>subscribers</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Payments */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Recent Payments</div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Latest transactions</div>
            </div>
            <button onClick={() => router.push('/admin/payments')} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: 12, fontWeight: 600, border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer' }}>View all</button>
          </div>
          <div style={{ padding: '8px 0', maxHeight: 280, overflowY: 'auto' }}>
            {recentPayments.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No payments yet</div>}
            {recentPayments.map(pay => (
              <div key={pay.id} className="row-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', transition: 'background 0.15s' }}>
                <Avatar name={pay.user_name || '?'} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#0f172a', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pay.user_name}</div>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{pay.plan_name} · {pay.billing_cycle}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>${Number(pay.amount).toFixed(2)}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: pay.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: pay.status === 'completed' ? '#10b981' : '#ef4444' }}>
                    {pay.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Users Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Recent Users</div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Newly registered accounts</div>
          </div>
          <button onClick={() => router.push('/admin/users')} style={{ padding: '6px 14px', borderRadius: 8, background: '#f1f5f9', color: '#475569', fontSize: 12, fontWeight: 600, border: '1px solid #e2e8f0', cursor: 'pointer' }}>Manage users</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                {['User', 'Email', 'Role', 'Joined'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 && <tr><td colSpan={4} style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No users yet</td></tr>}
              {recentUsers.map(u => (
                <tr key={u.id} className="row-hover" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={u.name} size={30} />
                      <span style={{ color: '#0f172a', fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', color: '#64748b', fontSize: 13 }}>{u.email}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize', background: u.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.08)', color: u.role === 'admin' ? '#ef4444' : '#6366f1' }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', color: '#94a3b8', fontSize: 12 }}>{fmtD(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
