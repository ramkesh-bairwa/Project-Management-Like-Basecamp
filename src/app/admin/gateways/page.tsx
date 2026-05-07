'use client';
import { useEffect, useState } from 'react';

interface Gateway {
  id: number; provider: string; display_name: string;
  is_active: boolean; is_enabled: boolean;
  config: Record<string, string>;
}

const GATEWAY_META: Record<string, {
  icon: string; color: string; bg: string; border: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
}> = {
  stripe: {
    icon: '💳', color: '#635bff', bg: 'rgba(99,91,255,0.08)', border: 'rgba(99,91,255,0.2)',
    description: 'Accept cards globally with Stripe. Supports 135+ currencies.',
    fields: [
      { key: 'publishable_key', label: 'Publishable Key', placeholder: 'pk_live_...' },
      { key: 'secret_key', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
      { key: 'webhook_secret', label: 'Webhook Secret', placeholder: 'whsec_...', secret: true },
    ],
  },
  razorpay: {
    icon: '🔷', color: '#3395ff', bg: 'rgba(51,149,255,0.08)', border: 'rgba(51,149,255,0.2)',
    description: 'Popular in India. Supports UPI, cards, netbanking, wallets.',
    fields: [
      { key: 'key_id', label: 'Key ID', placeholder: 'rzp_live_...' },
      { key: 'key_secret', label: 'Key Secret', placeholder: 'Your Razorpay secret', secret: true },
      { key: 'webhook_secret', label: 'Webhook Secret', placeholder: 'Webhook verification secret', secret: true },
    ],
  },
  paytm: {
    icon: '🔵', color: '#00baf2', bg: 'rgba(0,186,242,0.08)', border: 'rgba(0,186,242,0.2)',
    description: 'India\'s leading payment gateway. Supports UPI, wallets, cards.',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'Your Paytm MID' },
      { key: 'merchant_key', label: 'Merchant Key', placeholder: 'Your Paytm key', secret: true },
      { key: 'website', label: 'Website', placeholder: 'WEBPROD or WEBSTAGING' },
      { key: 'industry_type', label: 'Industry Type', placeholder: 'Retail' },
      { key: 'channel_id', label: 'Channel ID', placeholder: 'WEB' },
    ],
  },
  sandbox: {
    icon: '🧪', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',
    description: 'Test mode — simulates payments without real charges. Use for development.',
    fields: [],
  },
};

export default function AdminGatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('token') || '') : '';

  function load() {
    setLoading(true);
    fetch('/api/admin/gateways', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: Gateway[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          // Auto-setup if empty
          setupGateways().then(load);
          return;
        }
        setGateways(data);
        const c: Record<string, Record<string, string>> = {};
        data.forEach(g => { c[g.provider] = { ...g.config }; });
        setConfigs(c);
      })
      .finally(() => setLoading(false));
  }

  async function setupGateways() {
    setSetupLoading(true);
    await fetch('/api/payment/setup', {
      method: 'POST',
      headers: { 'x-migrate-secret': 'run-migration-now' },
    });
    setSetupLoading(false);
    showToast('✓ Gateways initialized');
  }

  useEffect(() => { load(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function setActive(provider: string) {
    setSaving(provider);
    await fetch('/api/admin/gateways', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider, set_active: true }),
    });
    setSaving(null);
    showToast(`${GATEWAY_META[provider]?.icon} ${provider} set as active gateway`);
    load();
  }

  async function saveConfig(provider: string) {
    setSaving(provider + '_config');
    await fetch('/api/admin/gateways', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider, config: configs[provider] }),
    });
    setSaving(null);
    showToast('✓ Configuration saved');
    load();
  }

  async function toggleEnabled(provider: string, current: boolean) {
    await fetch('/api/admin/gateways', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ provider, is_enabled: !current }),
    });
    load();
  }

  const activeGateway = gateways.find(g => g.is_active);

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a', background: '#f8fafc', outline: 'none', fontFamily: 'monospace' };

  return (
    <div className="fade-in" style={{ padding: '32px 32px 48px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, background: '#0f172a', color: '#f1f5f9', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid #1e293b' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, background: '#0f172a', borderRadius: 14, padding: '16px 24px', border: '1px solid #1e293b' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontWeight: 800, fontSize: 22, margin: 0 }}>Payment Gateways</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>
            Active: <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{activeGateway?.display_name || 'None'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: activeGateway?.provider === 'sandbox' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${activeGateway?.provider === 'sandbox' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeGateway?.provider === 'sandbox' ? '#f59e0b' : '#10b981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: activeGateway?.provider === 'sandbox' ? '#f59e0b' : '#10b981' }}>
              {activeGateway?.provider === 'sandbox' ? 'Test Mode' : 'Live Mode'}
            </span>
          </div>
          <button onClick={() => setupGateways().then(load)} disabled={setupLoading}
            style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, fontSize: 12, border: '1px solid rgba(245,158,11,0.3)', cursor: 'pointer', opacity: setupLoading ? 0.6 : 1 }}>
            {setupLoading ? 'Setting up...' : '🧪 Setup Gateways'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
          Only <strong style={{ color: '#0f172a' }}>one gateway</strong> can be active at a time. The active gateway is shown to users on the checkout page. Save your API keys before setting a gateway as active.
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {gateways.map(gw => {
            const meta = GATEWAY_META[gw.provider];
            if (!meta) return null;
            const isExpanded = expanded === gw.provider;
            const cfg = configs[gw.provider] || {};

            return (
              <div key={gw.provider} style={{ background: '#fff', border: `1px solid ${gw.is_active ? meta.border : '#e2e8f0'}`, borderRadius: 16, overflow: 'hidden', boxShadow: gw.is_active ? `0 0 0 2px ${meta.color}30` : '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' }}>

                {/* Gateway header row */}
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Icon */}
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {meta.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ color: '#0f172a', fontWeight: 800, fontSize: 16 }}>{gw.display_name}</span>
                      {gw.is_active && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                          ● ACTIVE
                        </span>
                      )}
                      {!gw.is_enabled && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: 'rgba(148,163,184,0.1)', color: '#94a3b8' }}>
                          DISABLED
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>{meta.description}</div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {!gw.is_active && (
                      <button onClick={() => setActive(gw.provider)} disabled={saving === gw.provider}
                        style={{ padding: '8px 16px', borderRadius: 10, background: meta.bg, color: meta.color, fontWeight: 700, fontSize: 12, border: `1px solid ${meta.border}`, cursor: 'pointer', opacity: saving === gw.provider ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                        {saving === gw.provider ? '...' : 'Set Active'}
                      </button>
                    )}
                    {meta.fields.length > 0 && (
                      <button onClick={() => setExpanded(isExpanded ? null : gw.provider)}
                        style={{ padding: '8px 16px', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: 12, border: '1px solid #e2e8f0', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {isExpanded ? 'Hide Config ↑' : 'Configure ↓'}
                      </button>
                    )}
                    <button onClick={() => toggleEnabled(gw.provider, gw.is_enabled)}
                      style={{ padding: '8px 12px', borderRadius: 10, background: gw.is_enabled ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', color: gw.is_enabled ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: 12, border: `1px solid ${gw.is_enabled ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, cursor: 'pointer' }}>
                      {gw.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>

                {/* Config form */}
                {isExpanded && meta.fields.length > 0 && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>API Configuration</div>

                      {meta.fields.map(field => (
                        <div key={field.key}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                            {field.label}
                            {field.secret && <span style={{ marginLeft: 6, fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>🔒 encrypted</span>}
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={field.secret && !showSecret[`${gw.provider}_${field.key}`] ? 'password' : 'text'}
                              value={cfg[field.key] || ''}
                              onChange={e => setConfigs(prev => ({ ...prev, [gw.provider]: { ...prev[gw.provider], [field.key]: e.target.value } }))}
                              placeholder={field.placeholder}
                              style={{ ...inputStyle, paddingRight: field.secret ? 44 : 12 }}
                            />
                            {field.secret && (
                              <button type="button"
                                onClick={() => setShowSecret(p => ({ ...p, [`${gw.provider}_${field.key}`]: !p[`${gw.provider}_${field.key}`] }))}
                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>
                                {showSecret[`${gw.provider}_${field.key}`] ? '🙈' : '👁'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Webhook URL hint */}
                      {(gw.provider === 'stripe' || gw.provider === 'razorpay') && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Webhook URL</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569', wordBreak: 'break-all' }}>
                            {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/payment/webhook/{gw.provider}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button onClick={() => saveConfig(gw.provider)} disabled={saving === gw.provider + '_config'}
                          style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', opacity: saving === gw.provider + '_config' ? 0.6 : 1 }}>
                          {saving === gw.provider + '_config' ? 'Saving...' : 'Save Configuration'}
                        </button>
                        {!gw.is_active && (
                          <button onClick={async () => { await saveConfig(gw.provider); await setActive(gw.provider); }}
                            style={{ padding: '10px 24px', borderRadius: 10, background: meta.bg, color: meta.color, fontWeight: 700, fontSize: 13, border: `1px solid ${meta.border}`, cursor: 'pointer' }}>
                            Save & Set Active
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sandbox — no config needed */}
                {isExpanded && gw.provider === 'sandbox' && (
                  <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: 'rgba(245,158,11,0.04)' }}>
                    <div style={{ fontSize: 13, color: '#92400e' }}>
                      🧪 Sandbox mode requires no configuration. Test cards are provided on the checkout page.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
