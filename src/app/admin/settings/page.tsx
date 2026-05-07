'use client';
import { useEffect, useState } from 'react';

const FIELDS = [
  { key: 'site_name', label: 'Site Name', type: 'text', placeholder: 'ProjectHub' },
  { key: 'logo_letter', label: 'Logo Letter (fallback)', type: 'text', placeholder: 'P', maxLength: 3 },
  { key: 'site_logo_url', label: 'Logo Image URL', type: 'url', placeholder: 'https://…/logo.png' },
  { key: 'primary_color', label: 'Primary Color (navbar/header)', type: 'color', placeholder: '#1d3557' },
  { key: 'accent_color', label: 'Accent Color (buttons/badges)', type: 'color', placeholder: '#e63946' },
  { key: 'secondary_color', label: 'Secondary Color', type: 'color', placeholder: '#457b9d' },
];

export default function AdminSettingsPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setForm(d));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setSaving(false);
    setMsg(d.message || d.error || '');
  }

  const primary = form.primary_color || '#1d3557';
  const accent = form.accent_color || '#e63946';

  return (
    <div className="fade-in" style={{ padding: '32px 32px 48px' }}>
      {/* Top bar */}
      <div style={{ background: '#0f172a', borderRadius: 14, padding: '16px 24px', marginBottom: 28, border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: 0 }}>Site Settings</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>Manage branding — logo, site name, and colors</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Form */}
        <form onSubmit={save} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Branding Fields</div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Changes apply site-wide on save</div>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {FIELDS.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {f.type === 'color' && (
                    <input type="color" value={form[f.key] || f.placeholder}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  )}
                  <input
                    type={f.type === 'color' ? 'text' : f.type}
                    value={form[f.key] || ''}
                    maxLength={f.maxLength}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none' }}
                  />
                </div>
              </div>
            ))}

            {msg && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.includes('aved') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: msg.includes('aved') ? '#065f46' : '#991b1b', fontSize: 13, fontWeight: 600 }}>
                {msg}
              </div>
            )}

            <button type="submit" disabled={saving}
              style={{ width: '100%', padding: '11px', borderRadius: 10, background: primary, color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Live preview */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'sticky', top: 24 }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Live Preview</div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Updates as you type</div>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Navbar preview */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Navbar</div>
              <div style={{ background: primary, borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                {form.site_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.site_logo_url} alt="logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <div style={{ borderRadius: 8, background: `linear-gradient(135deg, ${accent}, ${primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, minWidth: 32, height: 32, padding: '0 7px', fontSize: (form.logo_letter?.length || 1) > 2 ? 10 : (form.logo_letter?.length || 1) > 1 ? 12 : 15, letterSpacing: '0.04em' }}>
                    {form.logo_letter || 'P'}
                  </div>
                )}
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{form.site_name || 'ProjectHub'}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  {['Home', 'Projects', 'Plans'].map(l => (
                    <span key={l} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, padding: '3px 8px', borderRadius: 6 }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Buttons preview */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Buttons</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: accent, color: '#fff', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 700 }}>Accent</span>
                <span style={{ background: primary, color: '#fff', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 700 }}>Primary</span>
                <span style={{ background: form.secondary_color || '#457b9d', color: '#fff', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 700 }}>Secondary</span>
              </div>
            </div>

            {/* Logo preview */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Logo Badge</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {form.site_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.site_logo_url} alt="logo" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0' }} />
                ) : (
                  <div style={{ borderRadius: 12, background: `linear-gradient(135deg, ${accent}, ${primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, minWidth: 48, height: 48, padding: '0 10px', fontSize: (form.logo_letter?.length || 1) > 2 ? 14 : (form.logo_letter?.length || 1) > 1 ? 17 : 22, letterSpacing: '0.04em' }}>
                    {form.logo_letter || 'P'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{form.site_name || 'ProjectHub'}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Site name</div>
                </div>
              </div>
            </div>

            {/* Color swatches */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Color Palette</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Primary', primary], ['Accent', accent], ['Secondary', form.secondary_color || '#457b9d']].map(([label, color]) => (
                  <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: 36, borderRadius: 8, background: color, marginBottom: 4 }} />
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{color}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
