'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface User {
  id: number; name: string; email: string; avatar: string; bio: string;
  mobile: string; gender: string; role: string; is_org: boolean; created_at: string;
  plan_name: string; max_projects: number; max_members: number;
}

const avatarBgs = ['#f43f5e', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#eab308'];
function avatarBg(name: string) { return avatarBgs[name.charCodeAt(0) % avatarBgs.length]; }

const inputCls = 'w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none';
const inputStyle = { border: '1.5px solid var(--border)', color: 'var(--text)' };
const labelCls = 'block text-xs font-bold mb-1.5 uppercase tracking-wide';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', avatar: '', mobile: '', gender: '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [stats, setStats] = useState({ projects: 0, connections: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    fetch('/api/users/me', { headers: h }).then(r => r.json()).then((d: User) => {
      setUser(d);
      setForm({ name: d.name, bio: d.bio || '', avatar: d.avatar || '', mobile: d.mobile || '', gender: d.gender || '' });
    });
    Promise.all([
      fetch('/api/projects', { headers: h }).then(r => r.json()),
      fetch('/api/connections', { headers: h }).then(r => r.json()),
    ]).then(([p, c]) => setStats({
      projects: Array.isArray(p) ? p.length : 0,
      connections: Array.isArray(c) ? c.filter((x: { status: string }) => x.status === 'accepted').length : 0,
    }));
  }, []);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users/avatar', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.url) setForm(p => ({ ...p, avatar: data.url }));
  }

  async function save() {
    if (pwForm.next && pwForm.next !== pwForm.confirm) { setMsg('Passwords do not match'); return; }
    setSaving(true); setMsg('');
    const token = localStorage.getItem('token');
    const body: Record<string, string> = { ...form };
    if (pwForm.next) { body.current_password = pwForm.current; body.new_password = pwForm.next; }
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) {
      setUser(u => u ? { ...u, ...form } : u);
      setEditing(false);
      setPreview('');
      setPwForm({ current: '', next: '', confirm: '' });
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    } else {
      setMsg(d.error || 'Failed to save');
    }
  }

  function openEdit() {
    if (!user) return;
    setForm({ name: user.name, bio: user.bio || '', avatar: user.avatar || '', mobile: user.mobile || '', gender: user.gender || '' });
    setPwForm({ current: '', next: '', confirm: '' });
    setPreview('');
    setMsg('');
    setEditing(true);
  }

  if (!user) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
    </div>
  );

  const joined = new Date(user.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' });
  const displayAvatar = preview || form.avatar || user.avatar;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">

      {msg && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ background: msg.includes('success') ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: msg.includes('success') ? 'var(--success-text)' : 'var(--danger-text)', border: `1px solid ${msg.includes('success') ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}` }}>
          {msg}
        </div>
      )}

      {/* Profile card */}
      <div className="rounded-2xl overflow-hidden mb-6" style={{ border: '1.5px solid var(--border)', boxShadow: '0 4px 20px rgba(15,18,34,0.08)' }}>
        <div className="h-32 relative" style={{ background: 'linear-gradient(135deg, var(--primary), var(--link))' }}>
          <div className="absolute -bottom-12 left-8">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-2xl object-cover"
                style={{ border: '4px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }} />
            ) : (
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center font-black text-3xl text-white"
                style={{ background: avatarBg(user.name), border: '4px solid #fff', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                {user.name[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="bg-surface pt-16 pb-6 px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{user.name}</h1>
                {user.role === 'admin' && <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent)' }}>Admin</span>}
                {user.is_org && <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>Organization</span>}
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{user.email}</div>
              {user.mobile && <div className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>📱 {user.mobile}</div>}
              {user.gender && <div className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>⚧ {user.gender.replace('_', ' ')}</div>}
              {user.bio && <p className="text-sm mt-3 max-w-lg leading-relaxed" style={{ color: 'var(--link)' }}>{user.bio}</p>}
              <div className="text-xs mt-3 font-medium" style={{ color: 'var(--text-subtle)' }}>Member since {joined}</div>
            </div>
            <button onClick={openEdit}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition hover:opacity-90"
              style={{ background: 'var(--primary)', color: '#fff' }}>
              ✏️ Edit Profile
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6" style={{ borderTop: '1.5px solid var(--border-soft)' }}>
            {[
              { label: 'Projects', value: stats.projects, icon: '📁', color: '#f43f5e' },
              { label: 'Connections', value: stats.connections, icon: '🔗', color: '#6366f1' },
              { label: 'Plan', value: user.plan_name || 'Free', icon: '💎', color: '#10b981' },
            ].map(s => (
              <div key={s.label} className="text-center py-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-subtle)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan info */}
      <div className="rounded-2xl p-6 mb-6 flex items-center justify-between gap-4"
        style={{ background: 'var(--primary)', border: '1.5px solid #2a4a6b' }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>💎</div>
          <div>
            <div className="font-black text-white text-base">{user.plan_name || 'Free'} Plan</div>
            <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Up to {user.max_projects === -1 ? 'unlimited' : user.max_projects} projects · {user.max_members === -1 ? 'unlimited' : user.max_members} members
            </div>
          </div>
        </div>
        <Link href="/plans" className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#fff' }}>Upgrade</Link>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/projects', label: 'My Projects', icon: '📋' },
          { href: '/connections', label: 'Connections', icon: '🔗' },
          { href: '/organizations', label: 'Organizations', icon: '🏢' },
          { href: '/archive', label: 'Archive', icon: '🗃' },
        ].map(l => (
          <Link key={l.href} href={l.href}
            className="flex items-center gap-3 p-4 rounded-xl font-semibold text-sm transition hover:shadow-md hover:-translate-y-0.5"
            style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>
            <span className="text-xl">{l.icon}</span> {l.label}
          </Link>
        ))}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(15,23,42,0.7)' }}>
          <div className="bg-surface rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ border: '1.5px solid var(--border)', maxHeight: '90vh' }}>

            {/* Header */}
            <div className="px-6 py-5 flex-shrink-0" style={{ background: 'var(--primary)' }}>
              <div className="font-black text-white text-lg">Edit Profile</div>
              <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Update your profile information</div>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">

              {/* Avatar upload */}
              <div>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {displayAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={displayAvatar} alt="avatar" className="w-20 h-20 rounded-2xl object-cover"
                        style={{ border: '2px solid var(--border)' }} />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-2xl text-white"
                        style={{ background: avatarBg(form.name || user.name) }}>
                        {(form.name || user.name)[0]?.toUpperCase()}
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                        <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full py-2 rounded-lg text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                      style={{ border: '1.5px dashed var(--link)', color: 'var(--link)', background: 'rgba(99,102,241,0.05)' }}>
                      {uploading ? 'Uploading…' : '📷 Choose Photo'}
                    </button>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-subtle)' }}>JPG, PNG, WebP or GIF</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Full Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Your name" className={inputCls} style={inputStyle} />
              </div>

              {/* Email — disabled */}
              <div>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Email <span className="normal-case font-normal">(cannot be changed)</span></label>
                <input value={user.email} disabled className={inputCls}
                  style={{ ...inputStyle, background: 'var(--surface-2)', color: 'var(--text-subtle)', cursor: 'not-allowed' }} />
              </div>

              {/* Mobile */}
              <div>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Mobile</label>
                <input value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                  placeholder="+1 234 567 8900" className={inputCls} style={inputStyle} />
              </div>

              {/* Gender */}
              <div>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Gender</label>
                <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                  className={inputCls} style={inputStyle}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              {/* Bio */}
              <div>
                <label className={labelCls} style={{ color: 'var(--text-muted)' }}>Bio</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell people a bit about yourself…" rows={2}
                  className={`${inputCls} resize-none`} style={inputStyle} />
              </div>

              {/* Change password */}
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
                <div className="text-xs font-black uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Change Password <span className="font-normal normal-case">(leave blank to keep current)</span></div>
                <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="Current password" className={inputCls} style={{ ...inputStyle, background: 'var(--surface)' }} />
                <input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                  placeholder="New password" className={inputCls} style={{ ...inputStyle, background: 'var(--surface)' }} />
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Confirm new password" className={inputCls} style={{ ...inputStyle, background: 'var(--surface)' }} />
              </div>

              {msg && !msg.includes('success') && (
                <div className="px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(244,63,94,0.08)', color: 'var(--danger-text)' }}>{msg}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={save} disabled={saving || uploading}
                  className="flex-1 py-2.5 rounded-xl font-black text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--success)' }}>
                  {saving ? 'Saving…' : '✓ Save Changes'}
                </button>
                <button onClick={() => { setEditing(false); setPreview(''); }}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-black text-sm transition hover:bg-gray-50"
                  style={{ border: '1.5px solid var(--border)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
