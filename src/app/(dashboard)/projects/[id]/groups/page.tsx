'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';
import ConfirmModal from '@/components/ConfirmModal';
import PlanLimitBanner from '@/components/PlanLimitBanner';

interface Group { id: number; uuid: string; slug: string; name: string; description: string; color: string; task_count: number; member_count: number; created_by_name: string; created_at: string; }
interface Member { id: number; name: string; role: string; email: string }
interface PlanInfo { plan: string; limits: { max_projects: number; max_members: number; max_tasks: number; max_groups: number; max_storage_gb: number }; usage: { projects: number; tasks: number; groups: number; members: number } }

const avatarBgs = ['#f43f5e', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#eab308'];

type ViewMode = 'grid' | 'list' | 'box';

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
      {(['grid','list','box'] as ViewMode[]).map(v => (
        <button key={v} onClick={() => onChange(v)}
          className="px-3 py-1.5 text-xs font-bold transition"
          style={{ background: view === v ? 'var(--primary)' : 'var(--surface)', color: view === v ? '#fff' : 'var(--text-muted)' }}
          title={v.charAt(0).toUpperCase() + v.slice(1)}>
          {v === 'grid' ? '⊞' : v === 'list' ? '☰' : '▦'}
        </button>
      ))}
    </div>
  );
}

export default function ProjectGroupsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myRole, setMyRole] = useState('');
  const [token, setToken] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectMembers, setProjectMembers] = useState<Member[]>([]);
  const [myId, setMyId] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);

  // member dropdown (project members)
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);



  // invite by email
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    const t = getToken();
    const uid = getTokenUserId();
    setToken(t);
    if (!id) return;
    const auth = { Authorization: `Bearer ${t}` };
    fetch(`/api/projects?id=${id}`, { headers: auth })
      .then(r => r.json()).then(proj => {
        if (!proj?.id) return;
        const pid = proj.id;
        setProjectId(pid);
        setProjectName(proj.name || '');
        fetch(`/api/project-groups?project_id=${pid}`, { headers: auth })
          .then(r => r.json()).then(d => Array.isArray(d) && setGroups(d));
        fetch(`/api/projects/members?project_id=${pid}`, { headers: auth })
          .then(r => r.json()).then(d => {
            if (!Array.isArray(d)) return;
            setProjectMembers(d);
            const me = d.find((m: Member) => m.id === uid);
            if (me) setMyRole(me.role);
            setMyId(uid);
            setLoaded(true);
          });
        fetch('/api/user/plan-limits', { headers: auth })
          .then(r => r.json()).then(d => d?.plan && setPlanInfo(d));
      });
  }, [id]);

  // close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function loadGroups() {
    if (!projectId) return;
    fetch(`/api/project-groups?project_id=${projectId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => Array.isArray(d) && setGroups(d));
  }

  function toggleMember(m: Member) {
    setSelectedMembers(prev =>
      prev.find(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m]
    );
    setMemberSearch('');
  }

  function removeMember(uid: number) {
    setSelectedMembers(prev => prev.filter(x => x.id !== uid));
  }

  function addInviteEmail() {
    const email = inviteInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInviteError('Invalid email address'); return; }
    if (inviteEmails.includes(email)) { setInviteError('Already added'); return; }
    setInviteEmails(prev => [...prev, email]);
    setInviteInput('');
    setInviteError('');
  }

  function removeInviteEmail(email: string) {
    setInviteEmails(prev => prev.filter(e => e !== email));
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    const res = await fetch('/api/project-groups', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...form, project_id: projectId })
    });
    if (res.ok) {
      const data = await res.json();
      // Add selected project members
      for (const m of selectedMembers) {
        await fetch('/api/project-groups/members', {
          method: 'POST',
          headers,
          body: JSON.stringify({ group_id: data.id, user_id: m.id, role: 'member' })
        });
      }
      // Send email invitations
      for (const email of inviteEmails) {
        await fetch('/api/project-groups/invite', {
          method: 'POST',
          headers,
          body: JSON.stringify({ group_id: data.id, email })
        });
      }
      loadGroups();
      setShowForm(false);
      setForm({ name: '', description: '', color: '#6366f1' });
      setSelectedMembers([]);
      setInviteEmails([]);
      setInviteInput('');
      setSaving(false);
      setPlanInfo(prev => prev ? { ...prev, usage: { ...prev.usage, groups: prev.usage.groups + 1 } } : prev);
      router.push(`/projects/${id}/groups/${data.slug || data.id}`);
    } else {
      const err = await res.json();
      setSaving(false);
      alert(err.error || 'Failed to create group');
    }
  }

  async function deleteGroup(e: React.MouseEvent, g: Group) {
    e.stopPropagation();
    setDeleteTarget(g);
  }

  async function confirmDeleteGroup() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/project-groups?id=${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    setDeleting(false);
    setDeleteTarget(null);
    loadGroups();
  }

  const canManage = true;
  const atGroupLimit = planInfo ? (planInfo.limits.max_groups !== -1 && planInfo.usage.groups >= planInfo.limits.max_groups) : false;

  // filtered members for dropdown (exclude self + already selected)
  const selectedIds = new Set(selectedMembers.map(m => m.id));
  const filteredMembers = projectMembers.filter(m =>
    m.id !== myId &&
    !selectedIds.has(m.id) &&
    (memberSearch === '' ||
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        <Link href="/projects" className="hover:text-[var(--text)]">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="hover:text-[var(--text)]">Overview</Link>
        <span>/</span>
        <span className="font-bold" style={{ color: 'var(--text)' }}>Groups</span>
      </div>

      {planInfo && <PlanLimitBanner plan={planInfo.plan} limits={planInfo.limits} usage={planInfo.usage} show={['groups']} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          {projectName && <div className="text-xs font-bold mb-0.5" style={{ color: 'var(--link)' }}>📁 {projectName}</div>}
          <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Groups ({groups.length})</h2>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          {canManage && (
            <button onClick={() => !atGroupLimit && (setShowForm(v => !v), setSelectedMembers([]), setInviteEmails([]), setInviteInput(''))}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: showForm ? '#6b7a8d' : atGroupLimit ? '#94a3b8' : 'var(--accent)', cursor: atGroupLimit ? 'not-allowed' : 'pointer' }}
              title={atGroupLimit ? `Limit reached: ${planInfo?.usage.groups}/${planInfo?.limits.max_groups} groups` : ''}>
              {showForm ? '✕ Cancel' : '+ New Group'}
            </button>
          )}
        </div>
      </div>

      {/* Create group form */}
      {showForm && (
        <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)' }}>
          <h3 className="font-black text-base mb-4" style={{ color: 'var(--text)' }}>Create New Group</h3>
          <form onSubmit={createGroup} className="space-y-4">

            {/* Basic fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                placeholder="Group name *" autoFocus
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)"
                className="rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
              <div className="flex items-center gap-3 rounded-xl px-4 py-2" style={{ background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
                <label className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Color</label>
                <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border-0 flex-shrink-0" />
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{form.color}</span>
              </div>
            </div>

            {/* Add members from project — custom searchable dropdown */}
            {projectMembers.filter(m => m.id !== myId).length > 0 && (
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
                  Add Members
                  {selectedMembers.length > 0 && (
                    <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--link)' }}>
                      {selectedMembers.length} selected
                    </span>
                  )}
                </label>

                {/* Selected chips */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedMembers.map((m, i) => (
                      <span key={m.id} className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full text-xs font-bold text-white"
                        style={{ background: avatarBgs[i % avatarBgs.length] }}>
                        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-xs">
                          {m.name[0].toUpperCase()}
                        </span>
                        {m.name}
                        <button type="button" onClick={() => removeMember(m.id)}
                          className="ml-0.5 opacity-70 hover:opacity-100 leading-none">×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown trigger */}
                <div className="relative" ref={dropRef}>
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-text"
                    style={{ background: 'var(--surface)', border: `1.5px solid ${dropdownOpen ? 'var(--link)' : 'var(--border)'}` }}
                    onClick={() => { setDropdownOpen(true); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      value={memberSearch}
                      onChange={e => { setMemberSearch(e.target.value); setDropdownOpen(true); }}
                      onFocus={() => setDropdownOpen(true)}
                      placeholder="Search project members…"
                      className="flex-1 text-sm bg-transparent focus:outline-none"
                      style={{ color: 'var(--text)' }}
                    />
                    {memberSearch && (
                      <button type="button" onClick={() => { setMemberSearch(''); setDropdownOpen(false); }}
                        className="text-[var(--text-subtle)] hover:text-[var(--text)] text-base leading-none">×</button>
                    )}
                  </div>

                  {/* Dropdown list */}
                  {dropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface rounded-xl shadow-xl z-30 overflow-hidden"
                      style={{ border: '1.5px solid var(--border)', maxHeight: 220, overflowY: 'auto' }}>
                      {filteredMembers.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-[var(--text-subtle)]">
                          {memberSearch ? `No members matching "${memberSearch}"` : 'All members already added'}
                        </div>
                      ) : (
                        <>
                          {filteredMembers.map((m, i) => (
                            <button type="button" key={m.id}
                              onClick={() => { toggleMember(m); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition text-left"
                              style={{ borderBottom: i < filteredMembers.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                                style={{ background: avatarBgs[i % avatarBgs.length] }}>
                                {m.name[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-[var(--text)] truncate">{m.name}</div>
                                <div className="text-xs text-[var(--text-muted)] truncate">{m.email}</div>
                              </div>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                                style={{ background: 'var(--info-soft)', color: 'var(--link)' }}>{m.role}</span>
                            </button>
                          ))}
                          <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
                            <button type="button"
                              onClick={() => setDropdownOpen(false)}
                              className="w-full py-2 rounded-lg text-sm font-bold transition hover:opacity-90"
                              style={{ background: 'var(--success)', color: '#fff' }}>
                              Done
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invite by email */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>
                Invite by Email
                {inviteEmails.length > 0 && (
                  <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--success)' }}>
                    {inviteEmails.length} invite{inviteEmails.length > 1 ? 's' : ''}
                  </span>
                )}
              </label>

              {/* Email chips */}
              {inviteEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {inviteEmails.map(email => (
                    <span key={email} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'var(--success-soft)', color: 'var(--success-text)', border: '1px solid var(--success-soft)' }}>
                      ✉️ {email}
                      <button type="button" onClick={() => removeInviteEmail(email)}
                        className="opacity-60 hover:opacity-100 leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteInput}
                  onChange={e => { setInviteInput(e.target.value); setInviteError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInviteEmail(); } }}
                  placeholder="Enter email and press Enter or Add"
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--surface)', border: `1.5px solid ${inviteError ? 'var(--accent)' : 'var(--border)'}`, color: 'var(--text)' }}
                />
                <button type="button" onClick={addInviteEmail}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition flex-shrink-0"
                  style={{ background: 'var(--success-soft)', color: 'var(--success-text)', border: '1.5px solid var(--success-soft)' }}>
                  + Add
                </button>
              </div>
              {inviteError && <p className="text-xs mt-1 font-bold" style={{ color: 'var(--accent)' }}>{inviteError}</p>}
              <p className="text-xs mt-1" style={{ color: 'var(--text-subtle)' }}>Invitations will be sent after the group is created.</p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
                style={{ background: 'var(--accent)' }}>
                {saving ? 'Creating…' : `Create Group${selectedMembers.length + inviteEmails.length > 0 ? ` (${selectedMembers.length + inviteEmails.length} member${selectedMembers.length + inviteEmails.length > 1 ? 's' : ''})` : ''}`}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setSelectedMembers([]); setInviteEmails([]); setInviteInput(''); }}
                className="px-4 py-2.5 rounded-xl text-sm font-bold transition hover:bg-[var(--surface-3)]"
                style={{ color: 'var(--text-muted)' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups grid */}
      {groups.length === 0 ? (
        <div className="rounded-2xl p-16 text-center" style={{ border: '2px dashed var(--border)', background: 'var(--surface)' }}>
          <div className="text-5xl mb-3">🗂</div>
          <div className="font-black text-lg mb-1" style={{ color: 'var(--text)' }}>No groups yet</div>
          <div className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Groups help organize tasks by team or feature</div>
          {canManage && (
            <button onClick={() => setShowForm(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90"
              style={{ background: 'var(--accent)' }}>
              + Create First Group
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        <div className="bg-surface rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {groups.map((group, i) => (
            <div key={group.id}
              onClick={() => router.push(`/projects/${id}/groups/${group.slug || group.id}`)}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface-2)] transition cursor-pointer"
              style={{ borderBottom: i < groups.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: group.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{group.name}</div>
                {group.description && <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{group.description}</div>}
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{group.task_count} tasks</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>👥 {group.member_count}</span>
              {canManage && (
                <button onClick={e => deleteGroup(e, group)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition hover:bg-red-50 flex-shrink-0"
                  style={{ color: 'var(--accent)', border: '1px solid var(--danger-soft)' }}>🗑</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={view === 'box' ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
          {groups.map(group => (
            <div key={group.id}
              onClick={() => router.push(`/projects/${id}/groups/${group.slug || group.id}`)}
              className="bg-surface rounded-2xl p-5 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all group relative"
              style={{ border: '1px solid var(--border)', borderTop: `4px solid ${group.color}` }}>

              {canManage && (
                <button onClick={e => deleteGroup(e, group)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-xs transition hover:bg-red-50"
                  style={{ color: 'var(--accent)', border: '1px solid var(--danger-soft)' }}>🗑</button>
              )}

              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                  style={{ background: group.color }}>
                  {group.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-base truncate" style={{ color: 'var(--text)' }}>{group.name}</div>
                  {group.description && <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{group.description}</div>}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{group.task_count}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>tasks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>👥</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{group.member_count}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>members</span>
                </div>
                <div className="ml-auto text-xs font-bold" style={{ color: group.color }}>Open →</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Group"
          message={`Delete "${deleteTarget.name}"? All tasks inside will be removed.`}
          onConfirm={confirmDeleteGroup}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
