'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Member { id: number; name: string; email: string; role: string; avatar?: string }
interface Org { id: number; name: string; slug: string; description: string; owner_id: number }
interface UserResult { id: number; name: string; email: string; avatar?: string }

const DEFAULT_ROLES = ['owner','admin','manager','hr','project_admin','sales','developer','designer','viewer','member'];
const roleColors: Record<string, string> = {
  owner: '#e63946', admin: '#457b9d', manager: '#2a9d8f', hr: '#f4a261',
  project_admin: '#6d6875', sales: '#e9c46a', developer: '#1d3557', designer: '#a8dadc',
  viewer: '#94a3b8', member: '#64748b',
};
function roleColor(r: string) { return roleColors[r] || '#94a3b8'; }

export default function OrgSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allRoles, setAllRoles] = useState<string[]>(DEFAULT_ROLES);
  const [newRole, setNewRole] = useState('');
  const [addingRole, setAddingRole] = useState(false);
  const [myRole, setMyRole] = useState('');
  const [tab, setTab] = useState<'members' | 'roles'>('members');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [selectedRole, setSelectedRole] = useState('member');
  const [addingMember, setAddingMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/organizations?id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => d?.id && setOrg(d));
    loadMembers();
    fetch(`/api/organizations/roles?org_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => d?.roles && setAllRoles(d.roles));
  }, [id]);

  function loadMembers() {
    fetch(`/api/organizations/members?org_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => {
        if (!Array.isArray(d)) return;
        setMembers(d);
        fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(me => {
            const m = d.find((x: Member) => x.id === me.id);
            if (m) setMyRole(m.role);
          });
      });
  }

  const canManage = ['owner', 'admin'].includes(myRole);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSearching(false);
      if (Array.isArray(data)) {
        const memberIds = members.map(m => m.id);
        setSearchResults(data.filter((u: UserResult) => !memberIds.includes(u.id)).slice(0, 6));
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, members]);

  function closeAddMember() {
    setShowAddMember(false);
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
    setInviteEmail('');
    setSelectedRole('member');
  }

  async function addMember() {
    if (!selectedUser && !inviteEmail.trim()) return;
    setAddingMember(true); setError('');

    if (inviteEmail.trim()) {
      // Always invite by email — no DB check
      const res = await fetch('/api/organizations/invite', {
        method: 'POST', headers,
        body: JSON.stringify({ org_id: id, email: inviteEmail.trim(), role: selectedRole }),
      });
      const data = await res.json();
      setAddingMember(false);
      if (res.ok) {
        setSuccess(`Invitation sent to ${inviteEmail.trim()}`);
        closeAddMember();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to send invitation');
      }
      return;
    }

    // Add existing user directly by selecting from search
    const res = await fetch('/api/organizations/members', {
      method: 'POST', headers,
      body: JSON.stringify({ org_id: id, user_id: selectedUser!.id, role: selectedRole }),
    });
    const data = await res.json();
    setAddingMember(false);
    if (res.ok) {
      setMembers(prev => [...prev, { ...selectedUser!, role: selectedRole }]);
      closeAddMember();
      setSuccess('Member added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(data.error || 'Failed to add member');
    }
  }

  async function updateMemberRole(userId: number, role: string) {
    setError(''); setSuccess('');
    const res = await fetch('/api/organizations/members', {
      method: 'POST', headers,
      body: JSON.stringify({ org_id: id, user_id: userId, role }),
    });
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m));
      setSuccess('Role updated');
      setTimeout(() => setSuccess(''), 2000);
    } else {
      const d = await res.json();
      setError(d.error || 'Failed');
    }
  }

  async function addRole(e: React.FormEvent) {
    e.preventDefault();
    if (!newRole.trim()) return;
    setAddingRole(true); setError('');
    const res = await fetch('/api/organizations/roles', {
      method: 'POST', headers,
      body: JSON.stringify({ org_id: id, name: newRole }),
    });
    const d = await res.json();
    setAddingRole(false);
    if (res.ok) {
      setAllRoles(prev => [...new Set([...prev, d.name])]);
      setNewRole('');
      setSuccess('Role added');
      setTimeout(() => setSuccess(''), 2000);
    } else {
      setError(d.error || 'Failed');
    }
  }

  async function deleteRole(name: string) {
    setError('');
    const res = await fetch(`/api/organizations/roles?org_id=${id}&name=${encodeURIComponent(name)}`, {
      method: 'DELETE', headers,
    });
    if (res.ok) {
      setAllRoles(prev => prev.filter(r => r !== name));
    } else {
      const d = await res.json();
      setError(d.error || 'Failed');
    }
  }

  async function removeMember(userId: number) {
    await fetch('/api/organizations/members', {
      method: 'DELETE', headers,
      body: JSON.stringify({ org_id: id, user_id: userId }),
    });
    setMembers(prev => prev.filter(m => m.id !== userId));
  }

  if (!org) return <div className="p-8 text-center text-[#6b7a8d]">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-[#1d3557]">⚙️ {org.name} — Settings</h2>
        <p className="text-sm text-[#6b7a8d] mt-1">Manage members, roles and permissions</p>
      </div>

      {error && <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>⚠️ {error}</div>}
      {success && <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium" style={{ background: '#f0fdf9', color: '#0f766e', border: '1px solid #99f6e4' }}>✅ {success}</div>}

      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['members', 'roles'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-xl font-bold text-sm capitalize transition"
              style={{ background: tab === t ? '#1d3557' : '#fff', color: tab === t ? '#fff' : '#6b7a8d', border: '1.5px solid', borderColor: tab === t ? '#1d3557' : '#d0dce8' }}>
              {t === 'members' ? `👥 Members (${members.length})` : '🏷️ Roles'}
            </button>
          ))}
        </div>
        {tab === 'members' && canManage && (
          <button onClick={() => setShowAddMember(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
            style={{ background: '#e63946' }}>
            + Add Member
          </button>
        )}
      </div>

      {/* Members tab */}
      {tab === 'members' && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}>
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-4"
              style={{ borderBottom: i < members.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 overflow-hidden"
                style={{ background: `hsl(${(m.name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                {m.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                  : m.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[#1d3557] truncate">{m.name}</div>
                <div className="text-xs text-[#6b7a8d] truncate">{m.email}</div>
              </div>
              {canManage ? (
                <select value={m.role} onChange={e => updateMemberRole(m.id, e.target.value)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none"
                  style={{ background: `${roleColor(m.role)}18`, color: roleColor(m.role), border: `1.5px solid ${roleColor(m.role)}40` }}>
                  {allRoles.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: `${roleColor(m.role)}18`, color: roleColor(m.role) }}>
                  {m.role.replace(/_/g, ' ')}
                </span>
              )}
              {canManage && m.role !== 'owner' && (
                <button onClick={() => removeMember(m.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition flex-shrink-0"
                  style={{ color: '#e63946', border: '1px solid #fecaca' }}>✕</button>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">👥</div>
              <div className="font-bold text-[#1d3557] mb-1">No members yet</div>
              {canManage && (
                <button onClick={() => setShowAddMember(true)}
                  className="mt-2 px-4 py-2 rounded-xl font-bold text-sm text-white hover:opacity-90 transition"
                  style={{ background: '#e63946' }}>+ Add First Member</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Roles tab */}
      {tab === 'roles' && (
        <div>
          {canManage && (
            <form onSubmit={addRole} className="flex gap-3 mb-6">
              <div className="flex-1">
                <input value={newRole} onChange={e => setNewRole(e.target.value)}
                  placeholder="Role name e.g. qa_engineer, intern, support"
                  className="w-full rounded-xl px-4 py-3 text-sm text-[#1d3557] focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
                <p className="text-xs text-[#94a3b8] mt-1 px-1">Use underscores for spaces. This creates a role label, not a member.</p>
              </div>
              <button type="submit" disabled={addingRole}
                className="px-5 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition disabled:opacity-60 self-start"
                style={{ background: '#2a9d8f' }}>
                {addingRole ? '…' : '+ Add Role'}
              </button>
            </form>
          )}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}>
            {allRoles.map((r, i) => {
              const isDefault = DEFAULT_ROLES.includes(r);
              return (
                <div key={r} className="flex items-center gap-4 px-5 py-3.5"
                  style={{ borderBottom: i < allRoles.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: roleColor(r) }} />
                  <span className="flex-1 text-sm font-bold text-[#1d3557] capitalize">{r.replace(/_/g, ' ')}</span>
                  {isDefault ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#f1f5f9', color: '#94a3b8' }}>default</span>
                  ) : canManage ? (
                    <button onClick={() => deleteRole(r)}
                      className="text-xs px-3 py-1 rounded-lg font-bold hover:bg-red-50 transition"
                      style={{ color: '#e63946', border: '1px solid #fecaca' }}>Delete</button>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: '#f0fdf9', color: '#2a9d8f' }}>custom</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ background: '#1d3557' }}>
              <div className="font-black text-white text-lg">Add Member</div>
              <button onClick={closeAddMember}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition">✕</button>
            </div>

            <div className="p-6 space-y-4">

              {/* Option 1: Invite by email */}
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">📧 Invite by Email</label>
                <div className="flex gap-2">
                  <input
                    value={inviteEmail}
                    onChange={e => { setInviteEmail(e.target.value); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); }}
                    placeholder="Enter email address..."
                    type="email"
                    className="flex-1 rounded-xl px-4 py-3 text-sm text-[#1d3557] focus:outline-none"
                    style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }}
                  />
                </div>
                <p className="text-xs text-[#94a3b8] mt-1">An invitation email will be sent regardless of whether they have an account.</p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                <span className="text-xs font-bold text-[#94a3b8]">OR</span>
                <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
              </div>

              {/* Option 2: Search existing users */}
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">🔍 Search Existing Users</label>
                <div className="relative">
                  <input
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSelectedUser(null); setInviteEmail(''); }}
                    placeholder="Type name or email..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-[#1d3557] focus:outline-none"
                    style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }}
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#457b9d] border-t-transparent animate-spin" />
                  )}
                </div>

                {searchResults.length > 0 && !selectedUser && (
                  <div className="mt-1 rounded-xl overflow-hidden" style={{ border: '1.5px solid #d0dce8' }}>
                    {searchResults.map(u => (
                      <button key={u.id} type="button"
                        onClick={() => { setSelectedUser(u); setSearchQuery(u.name); setSearchResults([]); setInviteEmail(''); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f1faee] transition text-left"
                        style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: `hsl(${(u.name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                          {u.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-[#1d3557] truncate">{u.name}</div>
                          <div className="text-xs text-[#6b7a8d] truncate">{u.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedUser && (
                  <div className="flex items-center gap-3 px-4 py-3 mt-1 rounded-xl" style={{ background: '#f0fdf9', border: '1.5px solid #99f6e4' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: `hsl(${(selectedUser.name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                      {selectedUser.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#1d3557]">{selectedUser.name}</div>
                      <div className="text-xs text-[#6b7a8d]">{selectedUser.email}</div>
                    </div>
                    <button onClick={() => { setSelectedUser(null); setSearchQuery(''); }}
                      className="text-xs text-[#6b7a8d] hover:text-[#e63946] transition">✕</button>
                  </div>
                )}
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Assign Role</label>
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-[#1d3557] focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }}>
                  {allRoles.filter(r => r !== 'owner').map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={addMember} disabled={(!selectedUser && !inviteEmail.trim()) || addingMember}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition disabled:opacity-50"
                  style={{ background: '#e63946' }}>
                  {addingMember ? 'Processing…' : inviteEmail.trim() ? '📧 Send Invitation' : '+ Add Member'}
                </button>
                <button onClick={closeAddMember}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1d3557] hover:bg-[#f1faee] transition"
                  style={{ border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
