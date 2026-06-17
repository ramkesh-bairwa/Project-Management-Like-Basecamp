'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/client-auth';

export default function NewProjectPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium', visibility: 'private', due_date: '', status: 'planning', image: '' });
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [allOrgMembers, setAllOrgMembers] = useState<{ id: number; name: string; email: string; avatar?: string; org_name: string }[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    async function loadMembers() {
      const orgsRes = await fetch('/api/organizations', { headers: { Authorization: `Bearer ${t}` } });
      const orgs = await orgsRes.json();
      if (!Array.isArray(orgs)) return;
      const all: typeof allOrgMembers = [];
      for (const org of orgs) {
        const res = await fetch(`/api/organizations/members?org_id=${org.id}`, { headers: { Authorization: `Bearer ${t}` } });
        const members = await res.json();
        if (Array.isArray(members)) {
          members.forEach((m: { id: number; name: string; email: string; avatar?: string }) => {
            if (!all.find(x => x.id === m.id)) all.push({ ...m, org_name: org.name });
          });
        }
      }
      setAllOrgMembers(all);
    }
    loadMembers();
  }, []);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/projects/image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.url) setForm(p => ({ ...p, image: data.url }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify(form) });
    if (!res.ok) {
      const text = await res.text();
      let msg = 'Failed to create project';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      setError(msg);
      setCreating(false);
      return;
    }
    const data = await res.json();

    if (selectedMembers.length > 0) {
      await Promise.all(selectedMembers.map(userId =>
        fetch('/api/projects/members', { method: 'POST', headers, body: JSON.stringify({ project_id: data.id, user_id: userId, role: 'developer' }) })
      ));
    }

    if (inviteEmails.length > 0) {
      await fetch('/api/projects/invite', { method: 'POST', headers, body: JSON.stringify({ project_id: data.id, emails: inviteEmails }) });
    }

    setCreating(false);
    router.push(`/projects/${data.slug || data.id}`);
  }

  function addEmail() {
    const em = emailInput.toLowerCase().trim();
    if (em && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) && !inviteEmails.includes(em)) {
      setInviteEmails(p => [...p, em]);
      setEmailInput('');
    }
  }

  const inputCls = 'w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none transition';
  const inputStyle = { background: '#f1faee', border: '1.5px solid #d0dce8' };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4" onClick={() => setShowMemberDropdown(false)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#f1faee] transition text-[#6b7a8d]" style={{ border: '1.5px solid #d0dce8' }}>←</button>
        <div>
          <h1 className="text-2xl font-black text-[#1d3557]">New Project</h1>
          <p className="text-sm text-[#6b7a8d] mt-0.5">Fill in the details to create your project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 space-y-5" style={{ border: '1px solid #d0dce8', boxShadow: '0 2px 12px rgba(29,53,87,0.07)' }}>
        {error && (
          <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ background: '#fef2f2', color: '#b91c1c', border: '1.5px solid #fecaca' }}>{error}</div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Project name *</label>
          <input placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
            className={inputCls} style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#457b9d'} onBlur={e => e.target.style.borderColor = '#d0dce8'} />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Description</label>
          <textarea placeholder="What is this project about?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
            className={`${inputCls} resize-none`} style={inputStyle} />
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Project Image</label>
          <div className="flex items-center gap-4">
            {(imagePreview || form.image) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview || form.image} alt="preview" className="w-20 h-20 rounded-xl object-cover" style={{ border: '2px solid #d0dce8' }} />
            )}
            <div className="flex-1">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                style={{ border: '1.5px dashed #457b9d', color: '#457b9d', background: 'rgba(69,123,157,0.05)' }}>
                {uploading ? 'Uploading…' : '📷 Choose Image'}
              </button>
            </div>
          </div>
        </div>

        {/* Priority + Visibility */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Priority</label>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className={inputCls} style={inputStyle}>
              {['low', 'medium', 'high', 'critical'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Visibility</label>
            <select value={form.visibility} onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))} className={inputCls} style={inputStyle}>
              {['private', 'team', 'public'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* Status + Due date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inputCls} style={inputStyle}>
              {['planning', 'active', 'on_hold', 'completed', 'archived'].map(v => <option key={v} value={v}>{v.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Due date</label>
            <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className={inputCls} style={inputStyle} />
          </div>
        </div>

        {/* Members */}
        <div>
          <label className="block text-sm font-bold text-[#1d3557] mb-2">Add Members <span className="font-normal text-[#6b7a8d]">(Optional)</span></label>

          {/* Org members dropdown */}
          <label className="block text-xs font-bold text-[#6b7a8d] mb-1.5">👥 Select from Organizations</label>
          <div className="relative mb-3">
            <button type="button"
              onClick={e => { e.stopPropagation(); setShowMemberDropdown(!showMemberDropdown); }}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-[#1d3557] flex items-center justify-between focus:outline-none"
              style={inputStyle}>
              <span>{selectedMembers.length > 0 ? `${selectedMembers.length} member(s) selected` : 'Choose members…'}</span>
              <span>{showMemberDropdown ? '▲' : '▼'}</span>
            </button>
            {showMemberDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg" style={{ border: '1.5px solid #d0dce8', maxHeight: 300, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div className="p-2 border-b" style={{ borderColor: '#d0dce8' }}>
                  <input type="text" placeholder="Search members..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: '#f1faee', border: '1px solid #d0dce8' }}
                    onClick={e => e.stopPropagation()} />
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
                  {allOrgMembers.filter(m => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase())).length > 0 ? (
                    allOrgMembers
                      .filter(m => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase()))
                      .map(member => {
                        const isSel = selectedMembers.includes(member.id);
                        return (
                          <button key={member.id} type="button"
                            onClick={e => { e.stopPropagation(); setSelectedMembers(p => isSel ? p.filter(id => id !== member.id) : [...p, member.id]); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left"
                            style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 overflow-hidden"
                              style={{ background: `hsl(${(member.name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                              {member.avatar
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                : member.name[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-[#1d3557] truncate">{member.name}</div>
                              <div className="text-xs text-[#6b7a8d] truncate">{member.email} • {member.org_name}</div>
                            </div>
                            {isSel && <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ background: '#2a9d8f' }}>✓</div>}
                          </button>
                        );
                      })
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-[#6b7a8d]">No members found</div>
                  )}
                </div>
                <div className="p-2 border-t" style={{ borderColor: '#d0dce8' }}>
                  <button type="button" onClick={e => { e.stopPropagation(); setShowMemberDropdown(false); }}
                    className="w-full py-2 rounded-lg text-sm font-bold hover:opacity-90 transition" style={{ background: '#2a9d8f', color: '#fff' }}>Done</button>
                </div>
              </div>
            )}
          </div>
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedMembers.map(uid => {
                const u = allOrgMembers.find(x => x.id === uid);
                if (!u) return null;
                return (
                  <span key={uid} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                    {u.name}
                    <button type="button" onClick={() => setSelectedMembers(p => p.filter(id => id !== uid))} className="text-xs hover:opacity-70">✕</button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Email invite */}
          <label className="block text-xs font-bold text-[#6b7a8d] mb-1.5">📧 Or Invite by Email</label>
          <div className="flex gap-2">
            <input type="email" placeholder="Enter email address..." value={emailInput} onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
              className="flex-1 rounded-xl px-4 py-2.5 text-[#1d3557] text-sm focus:outline-none" style={inputStyle} />
            <button type="button" onClick={addEmail}
              className="px-4 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition flex-shrink-0"
              style={{ background: '#f59e0b' }}>Add</button>
          </div>
          {inviteEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {inviteEmails.map(em => (
                <span key={em} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                  📧 {em}
                  <button type="button" onClick={() => setInviteEmails(p => p.filter(x => x !== em))} className="text-xs hover:opacity-70">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={creating}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#e63946' }}>
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {inviteEmails.length > 0 || selectedMembers.length > 0 ? 'Creating & Adding Members…' : 'Creating Project…'}
              </span>
            ) : 'Create Project'}
          </button>
          <button type="button" onClick={() => router.back()} disabled={creating}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1d3557] hover:bg-[#f1faee] transition disabled:opacity-60"
            style={{ border: '1.5px solid #d0dce8' }}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
