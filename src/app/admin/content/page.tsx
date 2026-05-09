'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), {
  ssr: false,
  loading: () => <div style={{ height: 80, background: '#f8fafc', borderRadius: 8, border: '1.5px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>Loading…</div>,
});

type Row = { page: string; section: string; content_key: string; content_value: string };

const PAGES = [
  { key: 'features', label: 'Features', icon: '✅', color: '#10b981' },
  { key: 'pricing',  label: 'Pricing',  icon: '💰', color: '#f59e0b' },
  { key: 'about',    label: 'About',    icon: '🏢', color: '#6366f1' },
  { key: 'blog',     label: 'Blog',     icon: '📝', color: '#ec4899' },
  { key: 'docs',     label: 'Docs',     icon: '📚', color: '#0ea5e9' },
  { key: 'contact',  label: 'Contact',  icon: '📞', color: '#e63946' },
];

const RICH_KEYS     = new Set(['body', 'subtitle']);
const TEXTAREA_KEYS = new Set(['desc', 'bio', 'excerpt', 'a', 'points', 'features', 'articles']);

const FIELD_LABELS: Record<string, string> = {
  title: 'Title', subtitle: 'Subtitle', badge: 'Badge', body: 'Body',
  cta_text: 'CTA Button', button: 'Button', button1: 'Button 1', button2: 'Button 2',
  icon: 'Icon', desc: 'Description', points: 'Bullet Points (| separated)',
  articles: 'Articles (Title:time|...)', features: 'Features (| separated)',
  name: 'Name', role: 'Role', avatar: 'Initials', color: 'Color', bio: 'Bio',
  price: 'Price', period: 'Period', highlight: 'Most Popular (true/false)',
  q: 'Question', a: 'Answer', email: 'Email', phone: 'Phone', twitter: 'Twitter',
  hours_weekday: 'Weekday Hours', hours_saturday: 'Saturday Hours',
  teams: 'Teams', countries: 'Countries', uptime: 'Uptime', founded: 'Founded',
  city: 'City', address: 'Address', author: 'Author', date: 'Date',
  category: 'Category', excerpt: 'Excerpt', label: 'Label', cta: 'CTA',
};

function sectionLabel(s: string) {
  const map: Record<string, string> = {
    hero: 'Hero', cta: 'Call to Action', story: 'Our Story', stats: 'Stats',
    values: 'Values', team: 'Team', faq: 'FAQ', support: 'Support', info: 'Contact Info',
  };
  if (map[s]) return map[s];
  if (s.startsWith('feature'))   return `Feature ${s.replace('feature', '')}`;
  if (s.startsWith('plan'))      return `Plan ${s.replace('plan', '')}`;
  if (s.startsWith('faq'))       return `FAQ ${s.replace('faq', '')}`;
  if (s.startsWith('value'))     return `Value ${s.replace('value', '')}`;
  if (s.startsWith('member'))    return `Member ${s.replace('member', '')}`;
  if (s.startsWith('post'))      return `Post ${s.replace('post', '')}`;
  if (s.startsWith('office'))    return `Office ${s.replace('office', '')}`;
  if (s.startsWith('quicklink')) return `Quick Link ${s.replace('quicklink', '')}`;
  if (s.startsWith('section'))   return `Doc Section ${s.replace('section', '')}`;
  return s;
}

export default function AdminContentPage() {
  const [rows, setRows]             = useState<Row[]>([]);
  const [edited, setEdited]         = useState<Record<string, string>>({});
  const [activePage, setActivePage] = useState('features');
  const [saving, setSaving]         = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [toast, setToast]           = useState('');
  const [unsaved, setUnsaved]       = useState(false);

  const rk = (r: Row) => `${r.page}__${r.section}__${r.content_key}`;

  useEffect(() => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    fetch('/api/admin/page-content', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Row[]) => {
        setRows(data);
        const map: Record<string, string> = {};
        data.forEach(r => { map[rk(r)] = r.content_value ?? ''; });
        setEdited(map);
      });
  }, []);

  // Reset unsaved when page changes
  useEffect(() => { setUnsaved(false); }, [activePage]);

  const pageRows = rows.filter(r => r.page === activePage);
  const sections = [...new Set(pageRows.map(r => r.section))];

  const save = useCallback(async () => {
    setSaving(true);
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const payload = rows.filter(r => r.page === activePage).map(r => ({
      page: r.page, section: r.section, content_key: r.content_key,
      content_value: edited[rk(r)] ?? r.content_value ?? '',
    }));
    const res = await fetch('/api/admin/page-content', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) { setUnsaved(false); setToast('✓ Saved!'); setTimeout(() => setToast(''), 2000); }
    else { setToast('✗ Failed'); setTimeout(() => setToast(''), 2000); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, activePage, edited]);

  const saveSection = useCallback(async (section: string) => {
    setSavingSection(section);
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const payload = rows.filter(r => r.page === activePage && r.section === section).map(r => ({
      page: r.page, section: r.section, content_key: r.content_key,
      content_value: edited[rk(r)] ?? r.content_value ?? '',
    }));
    const res = await fetch('/api/admin/page-content', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSavingSection(null);
    if (res.ok) { setToast(`✓ ${sectionLabel(section)} saved!`); setTimeout(() => setToast(''), 2000); }
    else { setToast('✗ Failed'); setTimeout(() => setToast(''), 2000); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, activePage, edited]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [save]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pop   { 0%{opacity:0;transform:translateY(8px)} 20%{opacity:1;transform:translateY(0)} 80%{opacity:1} 100%{opacity:0} }
        input:focus, textarea:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; outline: none; }
        input, textarea { transition: border-color 0.15s, box-shadow 0.15s; }
      `}</style>

      {/* ── Sticky header ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        {/* Top row */}
        <div style={{ padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📄</div>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Content Editor</span>
            {unsaved && <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, background: '#fef9c3', padding: '2px 8px', borderRadius: 20 }}>● Unsaved</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <a href={`/${activePage}`} target="_blank" rel="noreferrer"
              style={{ padding: '6px 14px', borderRadius: 8, background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid #e2e8f0' }}>
              Preview ↗
            </a>
            <button onClick={save} disabled={saving}
              style={{ padding: '7px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.8 : 1 }}>
              {saving
                ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Saving…</>
                : '💾 Save  ⌘S'}
            </button>
          </div>
        </div>

        {/* Page tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '0 20px', borderTop: '1px solid #f1f5f9' }}>
          {PAGES.map(p => (
            <button key={p.key} onClick={() => setActivePage(p.key)}
              style={{ padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activePage === p.key ? 700 : 500, color: activePage === p.key ? p.color : '#64748b', borderBottom: activePage === p.key ? `2.5px solid ${p.color}` : '2.5px solid transparent', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' }}>
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Editor body ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
        {sections.map((section, si) => {
          const sRows = pageRows.filter(r => r.section === section);
          const activeMeta = PAGES.find(p => p.key === activePage)!;

          return (
            <div key={section} style={{ marginBottom: 32 }}>
              {/* Section label + actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ height: 1, flex: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: activeMeta.color, textTransform: 'uppercase', letterSpacing: '0.1em', background: `${activeMeta.color}10`, padding: '3px 12px', borderRadius: 20, border: `1px solid ${activeMeta.color}25` }}>
                  {sectionLabel(section)}
                </span>
                <div style={{ height: 1, flex: 1, background: '#e2e8f0' }} />
                {/* Per-section preview + save */}
                <a href={`/${activePage}`} target="_blank" rel="noreferrer"
                  style={{ padding: '4px 10px', borderRadius: 7, background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 600, textDecoration: 'none', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                  Preview ↗
                </a>
                <button onClick={() => saveSection(section)} disabled={savingSection === section}
                  style={{ padding: '4px 12px', borderRadius: 7, background: savingSection === section ? '#a5b4fc' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 11, border: 'none', cursor: savingSection === section ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {savingSection === section
                    ? <><span style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Saving…</>
                    : '💾 Save'}
                </button>
              </div>

              {/* Fields as a clean 2-col table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                {sRows.map((r, ri) => {
                  const type = RICH_KEYS.has(r.content_key) ? 'rich' : TEXTAREA_KEYS.has(r.content_key) ? 'textarea' : 'text';
                  const label = FIELD_LABELS[r.content_key] || r.content_key.replace(/_/g, ' ');
                  const val = edited[rk(r)] ?? '';
                  const isLast = ri === sRows.length - 1;

                  return (
                    <div key={r.content_key}
                      style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: isLast ? 'none' : '1px solid #f1f5f9' }}>
                      {/* Label col */}
                      <div style={{ padding: '14px 16px', background: '#fafafa', borderRight: '1px solid #f1f5f9', display: 'flex', alignItems: type === 'text' ? 'center' : 'flex-start', paddingTop: type !== 'text' ? 16 : 14 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{label}</div>
                          {type === 'rich' && <div style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 600, marginTop: 2 }}>Rich Text</div>}
                          {type === 'textarea' && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Multi-line</div>}
                        </div>
                      </div>

                      {/* Input col */}
                      <div style={{ padding: '10px 14px' }}>
                        {type === 'rich' ? (
                          <RichTextEditor value={val} onChange={v => { setEdited(p => ({ ...p, [rk(r)]: v })); setUnsaved(true); }} placeholder={`Enter ${label}…`} />
                        ) : type === 'textarea' ? (
                          <textarea value={val}
                            onChange={e => { setEdited(p => ({ ...p, [rk(r)]: e.target.value })); setUnsaved(true); }}
                            placeholder={`Enter ${label}…`} rows={3}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }} />
                        ) : (
                          <input value={val}
                            onChange={e => { setEdited(p => ({ ...p, [rk(r)]: e.target.value })); setUnsaved(true); }}
                            placeholder={`Enter ${label}…`}
                            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a', boxSizing: 'border-box' }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.startsWith('✓') ? '#0f172a' : '#ef4444', color: '#fff', padding: '10px 24px', borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', animation: 'pop 2s ease forwards', zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
