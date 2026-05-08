'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { icon: '⊞', label: 'Dashboard', path: '/admin' },
  { icon: '👥', label: 'Users', path: '/admin/users' },
  { icon: '📁', label: 'Projects', path: '/admin/projects' },
  { icon: '💎', label: 'Plans', path: '/admin/plans' },
  { icon: '💳', label: 'Payments', path: '/admin/payments' },
  { icon: '⚙️', label: 'Gateways', path: '/admin/gateways' },
];

const SETTINGS_CHILDREN = [
  { icon: '🎨', label: 'Site Settings', path: '/admin/settings/site' },
  { icon: '📧', label: 'SMTP & Email', path: '/admin/settings/smtp' },
];

interface SiteSettings { site_name?: string; site_logo_url?: string; logo_letter?: string; primary_color?: string; accent_color?: string; }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isSettingsActive = pathname?.startsWith('/admin/settings');

  useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true);
  }, [isSettingsActive]);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    if (!token) { router.push('/admin/login'); return; }
    fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setSettings(d)).catch(() => {});
  }, [pathname, router]);

  if (pathname?.startsWith('/admin/login')) return <>{children}</>;

  function logout() {
    localStorage.removeItem('admin_token');
    router.push('/admin/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        .nav-item:hover { background: rgba(255,255,255,0.06) !important; }
        .btn-ghost:hover { background: rgba(255,255,255,0.08) !important; }
        .row-hover:hover { background: #f8fafc !important; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.2s ease; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 240, background: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {settings.site_logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.site_logo_url} alt="logo" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />
            ) : (
              <div style={{ borderRadius: 10, background: `linear-gradient(135deg, ${settings.accent_color || '#e63946'}, ${settings.primary_color || '#1d3557'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, height: 36, padding: '0 8px', fontSize: (settings.logo_letter?.length || 1) > 2 ? 11 : (settings.logo_letter?.length || 1) > 1 ? 13 : 16, fontWeight: 900, color: '#fff' }}>
                {settings.logo_letter || 'P'}
              </div>
            )}
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>Admin Panel</div>
              <div style={{ color: '#475569', fontSize: 11 }}>{settings.site_name || 'ProjectHub'}</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', padding: '8px 10px 4px', textTransform: 'uppercase' }}>Overview</div>

          {NAV.map(item => {
            const active = pathname === item.path;
            return (
              <div key={item.path} className="nav-item" onClick={() => router.push(item.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: active ? 'rgba(99,102,241,0.15)' : 'transparent', transition: 'background 0.15s' }}>
                <span style={{ fontSize: 14, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#a5b4fc' : '#94a3b8' }}>{item.label}</span>
                {active && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />}
              </div>
            );
          })}

          {/* Settings group */}
          <div style={{ marginTop: 4 }}>
            <div className="nav-item" onClick={() => setSettingsOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: isSettingsActive ? 'rgba(99,102,241,0.15)' : 'transparent', transition: 'background 0.15s' }}>
              <span style={{ fontSize: 14, opacity: isSettingsActive ? 1 : 0.6 }}>🎛️</span>
              <span style={{ fontSize: 13, fontWeight: isSettingsActive ? 700 : 500, color: isSettingsActive ? '#a5b4fc' : '#94a3b8' }}>Settings</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#475569', transition: 'transform 0.2s', display: 'inline-block', transform: settingsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            </div>

            {settingsOpen && (
              <div style={{ marginLeft: 14, borderLeft: '1px solid #1e293b', paddingLeft: 8, marginBottom: 4 }}>
                {SETTINGS_CHILDREN.map(item => {
                  const active = pathname === item.path;
                  return (
                    <div key={item.path} className="nav-item" onClick={() => router.push(item.path)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 1, background: active ? 'rgba(99,102,241,0.15)' : 'transparent', transition: 'background 0.15s' }}>
                      <span style={{ fontSize: 13, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? '#a5b4fc' : '#94a3b8' }}>{item.label}</span>
                      {active && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#6366f1' }} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid #1e293b' }}>
          <button onClick={() => router.push('/dashboard')} className="btn-ghost"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s', marginBottom: 4 }}>
            <span style={{ fontSize: 14, opacity: 0.6 }}>←</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>Back to App</span>
          </button>
          <button onClick={logout} className="btn-ghost"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}>
            <span style={{ fontSize: 14, opacity: 0.6 }}>⏻</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8' }}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#ffffff' }}>
        {children}
      </main>
    </div>
  );
}
