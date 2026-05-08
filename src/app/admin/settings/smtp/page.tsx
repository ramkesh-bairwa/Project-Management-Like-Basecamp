'use client';
import { useEffect, useState } from 'react';

const SMTP_FIELDS = [
  { key: 'smtp_host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
  { key: 'smtp_port', label: 'SMTP Port', type: 'text', placeholder: '587' },
  { key: 'smtp_user', label: 'SMTP Username', type: 'text', placeholder: 'you@gmail.com' },
  { key: 'smtp_pass', label: 'SMTP Password', type: 'password', placeholder: '••••••••' },
  { key: 'smtp_from', label: 'From Address', type: 'text', placeholder: 'noreply@yourapp.com' },
];

export default function SmtpSettingsPage() {
  const [smtp, setSmtp] = useState<Record<string, string>>({});
  const [emailVerification, setEmailVerification] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [msg, setMsg] = useState('');
  const [toggleMsg, setToggleMsg] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  function getToken() {
    return localStorage.getItem('admin_token') || localStorage.getItem('token') || '';
  }

  useEffect(() => {
    fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => {
        setSmtp({
          smtp_host: d.smtp_host || '',
          smtp_port: d.smtp_port || '',
          smtp_user: d.smtp_user || '',
          smtp_pass: d.smtp_pass || '',
          smtp_from: d.smtp_from || '',
        });
        setEmailVerification(d.email_verification_enabled === '1');
      });
  }, []);

  // Save SMTP fields only
  async function saveSmtp(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(smtp),
    });
    const d = await res.json();
    setSaving(false);
    setMsg(res.ok ? 'SMTP settings saved!' : (d.error || 'Failed to save'));
  }

  // Toggle email verification independently
  async function toggleVerification() {
    const newVal = !emailVerification;
    setToggling(true); setToggleMsg('');
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_verification_enabled: newVal ? '1' : '0' }),
    });
    const d = await res.json();
    setToggling(false);
    if (res.ok) {
      setEmailVerification(newVal);
      setToggleMsg(newVal ? '✓ Email verification enabled' : '✓ Email verification disabled');
      setTimeout(() => setToggleMsg(''), 3000);
    } else {
      setToggleMsg(d.error || 'Failed to update');
    }
  }

  async function sendTest() {
    if (!testEmail) return;
    setTesting(true); setTestMsg('');
    const res = await fetch('/api/admin/settings/test-email', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testEmail }),
    });
    const d = await res.json();
    setTesting(false);
    setTestMsg(d.message || d.error || '');
  }

  return (
    <div className="fade-in" style={{ padding: '32px 32px 48px' }}>
      <div style={{ background: '#0f172a', borderRadius: 14, padding: '16px 24px', marginBottom: 28, border: '1px solid #1e293b' }}>
        <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: 0 }}>SMTP & Email</h1>
        <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>Configure outgoing email and registration verification</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Email Verification Toggle — completely standalone */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>Email Verification</div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Require users to verify email before logging in</div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{
                padding: '16px 18px', borderRadius: 12,
                background: emailVerification ? '#f0fdf4' : '#f8fafc',
                border: `2px solid ${emailVerification ? '#86efac' : '#e2e8f0'}`,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Toggle switch */}
                  <button
                    type="button"
                    onClick={toggleVerification}
                    disabled={toggling}
                    style={{
                      position: 'relative', width: 52, height: 28, borderRadius: 14,
                      background: emailVerification ? '#22c55e' : '#cbd5e1',
                      border: 'none', cursor: toggling ? 'wait' : 'pointer',
                      transition: 'background 0.25s', flexShrink: 0, padding: 0,
                    }}>
                    <span style={{
                      position: 'absolute', top: 4,
                      left: emailVerification ? 28 : 4,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.25s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      display: 'block',
                    }} />
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      Require Email Verification
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      {emailVerification
                        ? 'New users must verify their email before logging in'
                        : 'New users can log in immediately after registration'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
                    background: emailVerification ? '#dcfce7' : '#f1f5f9',
                    color: emailVerification ? '#15803d' : '#64748b',
                    minWidth: 36, textAlign: 'center',
                  }}>
                    {toggling ? '…' : emailVerification ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
              {toggleMsg && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: toggleMsg.startsWith('✓') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  color: toggleMsg.startsWith('✓') ? '#065f46' : '#991b1b',
                }}>
                  {toggleMsg}
                </div>
              )}
            </div>
          </div>

          {/* SMTP Form */}
          <form onSubmit={saveSmtp} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>SMTP Credentials</div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Used for sending verification and notification emails</div>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {SMTP_FIELDS.map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={smtp[f.key] || ''}
                    onChange={e => setSmtp(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
              {msg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.includes('saved') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: msg.includes('saved') ? '#065f46' : '#991b1b', fontSize: 13, fontWeight: 600 }}>
                  {msg}
                </div>
              )}
              <button type="submit" disabled={saving}
                style={{ width: '100%', padding: '11px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save SMTP Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ color: '#0f172a', fontWeight: 700, fontSize: 14 }}>🧪 Test SMTP Connection</div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Send a test email to verify your SMTP settings work</div>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Send Test To</label>
                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {testMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: testMsg.toLowerCase().includes('sent') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', color: testMsg.toLowerCase().includes('sent') ? '#065f46' : '#991b1b', fontSize: 13, fontWeight: 600 }}>
                  {testMsg}
                </div>
              )}
              <button type="button" onClick={sendTest} disabled={testing || !testEmail}
                style={{ padding: '10px', borderRadius: 10, background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: testing || !testEmail ? 'not-allowed' : 'pointer', opacity: testing || !testEmail ? 0.5 : 1 }}>
                {testing ? 'Sending…' : '📨 Send Test Email'}
              </button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12 }}>💡 SMTP Provider Setup</div>
            <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, background: '#fff', border: '1.5px solid #fde68a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 15 }}>📧</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>Gmail (requires App Password)</span>
              </div>
              <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  'Go to myaccount.google.com → Security',
                  'Enable 2-Step Verification (required)',
                  'Search "App passwords" in the search bar',
                  'Create a new app password → select Mail',
                  'Copy the 16-character password (no spaces)',
                  'Paste it in SMTP Password field above',
                ].map((step, i) => (
                  <li key={i} style={{ fontSize: 11, color: '#475569' }}>{step}</li>
                ))}
              </ol>
              <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#fef9c3', fontSize: 11, color: '#713f12' }}>
                <strong>Host:</strong> smtp.gmail.com &nbsp;|&nbsp; <strong>Port:</strong> 587 &nbsp;|&nbsp; <strong>User:</strong> your full Gmail address
              </div>
            </div>
            {[
              { name: 'Outlook / Office 365', host: 'smtp.office365.com', port: '587', note: 'Use your Microsoft account email & password' },
              { name: 'Mailgun', host: 'smtp.mailgun.org', port: '587', note: 'Use SMTP credentials from Mailgun dashboard' },
              { name: 'SendGrid', host: 'smtp.sendgrid.net', port: '587', note: 'Username: apikey — Password: your SendGrid API key' },
            ].map(p => (
              <div key={p.name} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#1d3557' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{p.host} : {p.port}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
