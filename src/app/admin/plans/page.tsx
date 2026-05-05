'use client';
import { useEffect, useState } from 'react';

interface Plan {
  id: number; name: string; price: number; quarterly_price: number | null;
  yearly_price: number | null; billing_cycle: string; max_projects: number;
  max_members: number; max_tasks: number; max_storage_gb: number;
  features: string | string[]; is_active: boolean; subscribers: number; sort_order: number;
}

const empty: { name: string; price: number; quarterly_price: number | string; yearly_price: number | string; billing_cycle: string; max_projects: number; max_members: number; max_tasks: number; max_storage_gb: number; features: string; is_active: boolean; sort_order: number } = { name: '', price: 0, quarterly_price: '', yearly_price: '', billing_cycle: 'monthly', max_projects: -1, max_members: -1, max_tasks: -1, max_storage_gb: 5, features: '', is_active: true, sort_order: 0 };

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);

  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('token') || '') : '';

  function load() {
    setLoading(true);
    fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPlans(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(empty); setEditId(null); setModal('create'); }
  function openEdit(p: Plan) {
    const feats = Array.isArray(p.features) ? p.features.join('\n') : (typeof p.features === 'string' ? JSON.parse(p.features || '[]').join('\n') : '');
    setForm({ name: p.name, price: p.price, quarterly_price: p.quarterly_price ?? '', yearly_price: p.yearly_price ?? '', billing_cycle: p.billing_cycle, max_projects: p.max_projects, max_members: p.max_members, max_tasks: p.max_tasks, max_storage_gb: p.max_storage_gb, features: feats, is_active: p.is_active, sort_order: p.sort_order });
    setEditId(p.id); setModal('edit');
  }

  async function save() {
    setSaving(true);
    const features = String(form.features).split('\n').map(s => s.trim()).filter(Boolean);
    const body: Record<string, unknown> = { name: form.name, price: form.price, quarterly_price: form.quarterly_price === '' ? null : Number(form.quarterly_price), yearly_price: form.yearly_price === '' ? null : Number(form.yearly_price), billing_cycle: form.billing_cycle, max_projects: form.max_projects, max_members: form.max_members, max_tasks: form.max_tasks, max_storage_gb: form.max_storage_gb, features, is_active: form.is_active, sort_order: form.sort_order };
    if (editId) body.id = editId;
    await fetch('/api/admin/plans', { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    setSaving(false); setModal(null); load();
  }

  async function toggleActive(p: Plan) {
    const features = Array.isArray(p.features) ? p.features : (() => { try { return JSON.parse(p.features as string || '[]'); } catch { return []; } })();
    await fetch('/api/admin/plans', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: p.id, name: p.name, price: p.price, quarterly_price: p.quarterly_price, yearly_price: p.yearly_price, billing_cycle: p.billing_cycle, max_projects: p.max_projects, max_members: p.max_members, max_tasks: p.max_tasks, max_groups: 0, max_storage_gb: p.max_storage_gb, features, is_active: !p.is_active, sort_order: p.sort_order }) });
    load();
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none' };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' };
  const planColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

  return (
    <div className="fade-in" style={{ padding: '32px 32px 48px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, background: '#0f172a', borderRadius: 14, padding: '16px 24px', border: '1px solid #1e293b' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: 0 }}>Plans</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>Manage subscription plans</p>
        </div>
        <button onClick={openCreate} style={{ padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + New Plan
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {plans.map((p, i) => {
            const c = planColors[i % planColors.length];
            const feats: string[] = Array.isArray(p.features) ? p.features : (() => { try { return JSON.parse(p.features as string || '[]'); } catch { return []; } })();
            return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', opacity: p.is_active ? 1 : 0.6 }}>
                <div style={{ height: 4, background: c }} />
                <div style={{ padding: '20px 20px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 16 }}>{p.name}</div>
                      <div style={{ color: c, fontWeight: 700, fontSize: 22, marginTop: 2 }}>${p.price}<span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>/mo</span></div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: c, fontWeight: 800, fontSize: 20 }}>{p.subscribers}</div>
                      <div style={{ color: '#94a3b8', fontSize: 11 }}>subscribers</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {[
                      { label: 'Projects', value: p.max_projects === -1 ? '∞' : p.max_projects },
                      { label: 'Members', value: p.max_members === -1 ? '∞' : p.max_members },
                      { label: 'Tasks', value: p.max_tasks === -1 ? '∞' : p.max_tasks },
                      { label: 'Storage', value: `${p.max_storage_gb}GB` },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                        <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                        <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {feats.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      {feats.slice(0, 3).map((f, fi) => (
                        <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ color: c, fontSize: 12 }}>✓</span>
                          <span style={{ color: '#64748b', fontSize: 12 }}>{f}</span>
                        </div>
                      ))}
                      {feats.length > 3 && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>+{feats.length - 3} more</div>}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(p)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontWeight: 600, fontSize: 12, border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => toggleActive(p)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: p.is_active ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', color: p.is_active ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: 12, border: `1px solid ${p.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, cursor: 'pointer' }}>
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ color: '#0f172a', fontWeight: 800, fontSize: 18 }}>{modal === 'create' ? 'New Plan' : 'Edit Plan'}</div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Plan Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Pro" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Monthly Price ($)</label>
                  <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Yearly Price ($)</label>
                  <input type="number" value={form.yearly_price} onChange={e => setForm(p => ({ ...p, yearly_price: e.target.value }))} placeholder="Optional" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Max Projects (-1 = ∞)</label>
                  <input type="number" value={form.max_projects} onChange={e => setForm(p => ({ ...p, max_projects: Number(e.target.value) }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Max Members (-1 = ∞)</label>
                  <input type="number" value={form.max_members} onChange={e => setForm(p => ({ ...p, max_members: Number(e.target.value) }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Max Tasks (-1 = ∞)</label>
                  <input type="number" value={form.max_tasks} onChange={e => setForm(p => ({ ...p, max_tasks: Number(e.target.value) }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Storage (GB)</label>
                  <input type="number" value={form.max_storage_gb} onChange={e => setForm(p => ({ ...p, max_storage_gb: Number(e.target.value) }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Features (one per line)</label>
                <textarea value={form.features as string} onChange={e => setForm(p => ({ ...p, features: e.target.value }))} rows={4} placeholder="Unlimited projects&#10;Priority support&#10;API access" style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="is_active" style={{ ...labelStyle, margin: 0, cursor: 'pointer' }}>Active (visible to users)</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving || !form.name ? 0.6 : 1 }}>
                {saving ? 'Saving...' : modal === 'create' ? 'Create Plan' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
