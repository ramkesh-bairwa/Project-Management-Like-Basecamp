'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';
import { useToast } from '@/components/GlobalToast';

interface Project { id: number; name: string; description: string; status: string; priority: string; due_date: string; created_at: string; creator_name: string }
interface Member { id: number; name: string; email: string; role: string }
interface Stats { groups: number; tasks: number; docs: number; members: number }

const statusCfg: Record<string, { bg: string; text: string; label: string }> = {
  planning:  { bg: '#f1f5f9', text: '#475569', label: 'Planning' },
  active:    { bg: '#f0fdf9', text: '#0f766e', label: 'Active' },
  on_hold:   { bg: '#fff7ed', text: '#c2410c', label: 'On Hold' },
  completed: { bg: '#eff6ff', text: '#1d4ed8', label: 'Completed' },
  archived:  { bg: '#fef2f2', text: '#b91c1c', label: 'Archived' },
};
const avatarColors = ['#e63946','#457b9d','#2a9d8f','#f4a261','#6d6875','#e9c46a'];


function fmtDT(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = dt.getDate();
  const s = day%10===1&&day!==11?'st':day%10===2&&day!==12?'nd':day%10===3&&day!==13?'rd':'th';
  const mon = dt.toLocaleString('en',{month:'short'});
  const h = dt.getHours()%12||12, m = String(dt.getMinutes()).padStart(2,'0'), ap = dt.getHours()>=12?'PM':'AM';
  return `${day}${s} ${mon} ${dt.getFullYear()} ${h}:${m} ${ap}`;
}
function fmtD(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = dt.getDate();
  const s = day%10===1&&day!==11?'st':day%10===2&&day!==12?'nd':day%10===3&&day!==13?'rd':'th';
  return `${day}${s} ${dt.toLocaleString('en',{month:'short'})} ${dt.getFullYear()}`;
}
function fmtT(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const h = dt.getHours()%12||12, m = String(dt.getMinutes()).padStart(2,'0'), ap = dt.getHours()>=12?'PM':'AM';
  return `${h}:${m} ${ap}`;
}

export default function ProjectOverviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats>({ groups: 0, tasks: 0, docs: 0, members: 0 });
  const [myRole, setMyRole] = useState('');
  const [token, setToken] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberRole, setMemberRole] = useState('developer');
  const [addError, setAddError] = useState('');
  const [myId, setMyId] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; name: string; email: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [allOrgMembers, setAllOrgMembers] = useState<{ id: number; name: string; email: string; avatar?: string; org_name: string }[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deletingMember, setDeletingMember] = useState(false);

  useEffect(() => {
    const t = getToken();
    const uid = getTokenUserId();
    setToken(t);
    setMyId(uid);
    if (!id) return;
    const auth = { Authorization: `Bearer ${t}` };
    fetch(`/api/projects?id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => {
        if (!d || d.error) return;
        setProject(d);
        setProjectId(d.id);
        const pid = d.id;
        fetch(`/api/projects/members?project_id=${pid}`, { headers: auth })
          .then(r => r.json()).then(d => {
            if (!Array.isArray(d)) return;
            setMembers(d);
            setStats(s => ({ ...s, members: d.length }));
            const me = d.find((m: Member) => m.id === uid);
            if (me) setMyRole(me.role);
            else router.replace('/projects'); // not a member
          });
        fetch(`/api/project-groups?project_id=${pid}`, { headers: auth })
          .then(r => r.json()).then(d => Array.isArray(d) && setStats(s => ({ ...s, groups: d.length })));
        fetch(`/api/tasks?project_id=${pid}`, { headers: auth })
          .then(r => r.json()).then(d => Array.isArray(d) && setStats(s => ({ ...s, tasks: d.length })));
        fetch(`/api/documents?project_id=${pid}`, { headers: auth })
          .then(r => r.json()).then(d => Array.isArray(d) && setStats(s => ({ ...s, docs: d.length })));
      });
  }, [id]);

  function reloadMembers() {
    fetch(`/api/projects/members?project_id=${projectId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) { setMembers(d); setStats(s => ({ ...s, members: d.length })); } });
  }

  async function changeRole(userId: number, role: string) {
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    await fetch('/api/projects/members', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectId, user_id: userId, role }) });
    reloadMembers();
  }

  async function removeMember(userId: number) {
    setDeletingMember(true);
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const res = await fetch('/api/projects/members', { method: 'DELETE', headers: h, body: JSON.stringify({ project_id: projectId, user_id: userId }) });
    setDeletingMember(false);
    setMemberToDelete(null);
    if (res.ok) {
      reloadMembers();
      showSuccess('Member removed from project successfully');
    } else {
      showError('Unable to remove member. Please try again');
    }
  }

  async function openAddMember() {
    setShowAddMember(true);
    setAddError(''); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); setInviteEmail(''); setSelectedMembers([]); setMemberSearch(''); setShowMemberDropdown(false);
    
    // Load all organization members
    const orgsRes = await fetch('/api/organizations', { headers: { Authorization: `Bearer ${token}` } });
    const orgsData = await orgsRes.json();
    if (Array.isArray(orgsData) && orgsData.length > 0) {
      const allMembers: { id: number; name: string; email: string; avatar?: string; org_name: string }[] = [];
      for (const org of orgsData) {
        const membersRes = await fetch(`/api/organizations/members?org_id=${org.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const membersData = await membersRes.json();
        if (Array.isArray(membersData)) {
          membersData.forEach((m: { id: number; name: string; email: string; avatar?: string }) => {
            if (!allMembers.find(existing => existing.id === m.id) && !members.some(pm => pm.id === m.id)) {
              allMembers.push({ ...m, org_name: org.name });
            }
          });
        }
      }
      setAllOrgMembers(allMembers);
    }
    
    // Load contacts
    const res = await fetch('/api/connections', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) {
      const accepted = data
        .filter((c: { status: string }) => c.status === 'accepted')
        .map((c: { user_id: number; name: string; email: string }) => ({ id: c.user_id, name: c.name, email: c.email }));
      setSearchResults(accepted.filter(c => !members.some(m => m.id === c.id)));
    }
  }

  // Filter contacts based on search
  const filteredContacts = searchQuery.trim()
    ? searchResults.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchResults;

  async function addMember() {
    if (!selectedUser && !inviteEmail.trim() && selectedMembers.length === 0) return;
    setAddError(''); setSending(true);
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Add selected organization members
    if (selectedMembers.length > 0) {
      for (const userId of selectedMembers) {
        await fetch('/api/projects/members', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectId, user_id: userId, role: memberRole }) });
      }
      setSending(false);
      reloadMembers();
      setShowAddMember(false); setSelectedMembers([]); setMemberRole('developer');
      showSuccess(`Successfully added ${selectedMembers.length} ${selectedMembers.length === 1 ? 'member' : 'members'} to the project`);
      return;
    }

    if (inviteEmail.trim()) {
      // Send invitation by email
      const r = await fetch('/api/projects/invite', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectId, emails: [inviteEmail] }) });
      setSending(false);
      if (r.ok) {
        const data = await r.json();
        const result = data.results?.[0];
        if (result?.status === 'added' || result?.status === 'invited') {
          reloadMembers();
          setShowAddMember(false); setInviteEmail(''); setMemberRole('developer');
          showSuccess('Project invitation sent successfully');
        } else if (result?.status === 'already_member') {
          setAddError('Already a member');
        } else {
          setAddError(result?.message || 'Failed');
        }
      } else { const e2 = await r.json(); setAddError(e2.error || 'Failed'); }
      return;
    }

    // Add existing user directly
    const r = await fetch('/api/projects/members', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectId, user_id: selectedUser!.id, role: memberRole }) });
    setSending(false);
    if (r.ok) {
      reloadMembers();
      setShowAddMember(false); setSelectedUser(null); setSearchQuery(''); setMemberRole('developer');
      showSuccess('Member added to project successfully');
    } else { const e2 = await r.json(); setAddError(e2.error || 'Failed'); }
  }

  if (!project) return <div className="text-center py-20 text-[#6b7a8d]">Loading...</div>;

  const sc = statusCfg[project.status] || statusCfg.planning;
  const canManage = ['owner','admin','manager'].includes(myRole);

  const sections = [
    { href: `/projects/${id}/groups`, icon: '🗂', label: 'Groups', count: stats.groups, desc: 'Organize tasks into groups', color: '#457b9d' },
    { href: `/projects/${id}/tasks`,  icon: '✅', label: 'Tasks',  count: stats.tasks,  desc: 'All tasks & subtasks',     color: '#2a9d8f' },
    { href: `/projects/${id}/docs`,   icon: '📄', label: 'Docs',   count: stats.docs,   desc: 'Documents & files',        color: '#e9c46a' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: '#6b7a8d' }}>
        <Link href="/projects" className="hover:text-[#1d3557] transition">Projects</Link>
        <span>/</span>
        <span className="font-bold" style={{ color: '#1d3557' }}>{project.name}</span>
      </div>

      <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #d0dce8' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-black" style={{ color: '#1d3557' }}>{project.name}</h1>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
            </div>
            {project.description && <p className="text-sm" style={{ color: '#6b7a8d' }}>{project.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: '#94a3b8' }}>
              {project.due_date && <span>📅 Due {fmtD(project.due_date)}</span>}
              <span>Created {fmtD(project.created_at)}</span>
              {project.creator_name && <span>👤 {project.creator_name}</span>}
            </div>
          </div>
          {canManage && (
            <button onClick={openAddMember}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition flex-shrink-0"
              style={{ background: '#457b9d' }}>
              + Add Member
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {sections.map(s => (
          <Link key={s.href} href={s.href}
            className="bg-white rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all group"
            style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: s.color + '15' }}>{s.icon}</div>
              <span className="text-2xl font-black" style={{ color: s.color }}>{s.count}</span>
            </div>
            <div className="font-black text-base group-hover:text-[#e63946] transition" style={{ color: '#1d3557' }}>{s.label}</div>
            <div className="text-xs mt-0.5" style={{ color: '#6b7a8d' }}>{s.desc}</div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #d0dce8' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-base" style={{ color: '#1d3557' }}>Members ({members.length})</h2>
          {canManage && (
            <button onClick={openAddMember}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
              style={{ background: '#457b9d' }}>
              + Add Member
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {members.map((m, i) => {
            const isMe = m.id === myId;
            const isOwner = m.role === 'owner';
            const canEdit = canManage && !isMe && !isOwner;
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                  style={{ background: avatarColors[i % avatarColors.length] }}>
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: '#1d3557' }}>
                    {m.name}{isMe && <span className="ml-1 text-xs font-normal" style={{ color: '#94a3b8' }}>(you)</span>}
                  </div>
                  <div className="text-xs truncate" style={{ color: '#6b7a8d' }}>{m.email}</div>
                </div>
                {canEdit ? (
                  <select value={m.role} onChange={e => changeRole(m.id, e.target.value)}
                    className="text-xs font-bold px-2 py-1 rounded-lg focus:outline-none cursor-pointer flex-shrink-0"
                    style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                    {(myRole === 'owner' ? ['admin','manager','developer','designer','viewer'] : ['manager','developer','designer','viewer']).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: isOwner ? '#fef2f2' : m.role === 'admin' ? '#1d3557' : '#eff6ff', color: isOwner ? '#e63946' : m.role === 'admin' ? '#fff' : '#1d4ed8' }}>
                    {m.role}
                  </span>
                )}
                {canEdit && (
                  <button onClick={() => setMemberToDelete({ id: m.id, name: m.name })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition flex-shrink-0"
                    style={{ color: '#e63946', border: '1px solid #fecaca' }}>✕</button>
                )}
              </div>
            );
          })}
          {canManage && (
            <button onClick={openAddMember}
              className="flex items-center justify-center gap-2 rounded-xl p-3 transition hover:border-[#457b9d] hover:bg-[#eff6ff]"
              style={{ border: '2px dashed #d0dce8', color: '#457b9d' }}>
              <span className="text-lg font-black">+</span>
              <span className="text-sm font-bold">Add Member</span>
            </button>
          )}
        </div>
      </div>

      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(29,53,87,0.6)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ background: '#e63946' }}>
              <h3 className="font-black text-white text-lg">Remove Member</h3>
              <button onClick={() => setMemberToDelete(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-black flex-shrink-0"
                  style={{ background: '#e63946' }}>
                  ⚠️
                </div>
                <div className="flex-1">
                  <div className="font-bold text-base" style={{ color: '#1d3557' }}>Remove {memberToDelete.name}?</div>
                  <div className="text-sm mt-1" style={{ color: '#6b7a8d' }}>This member will lose access to this project and all its resources.</div>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}>
                <div className="text-xs font-bold" style={{ color: '#e63946' }}>⚠️ This action cannot be undone</div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => removeMember(memberToDelete.id)} disabled={deletingMember}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#e63946' }}>
                  {deletingMember ? 'Removing...' : 'Yes, Remove Member'}
                </button>
                <button onClick={() => setMemberToDelete(null)} disabled={deletingMember}
                  className="flex-1 py-3 rounded-xl font-bold text-sm hover:bg-[#f1faee] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#1d3557', border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(29,53,87,0.5)' }} onClick={() => setShowMemberDropdown(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" style={{ border: '1px solid #d0dce8' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5" style={{ background: '#457b9d' }}>
              <h3 className="font-black text-white text-lg">Add Member</h3>
              <button onClick={() => setShowAddMember(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Option 1: Select from Organization Members */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>👥 Select from Organizations</label>
                <div className="relative">
                  <button type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMemberDropdown(!showMemberDropdown);
                    }}
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none text-left flex items-center justify-between"
                    style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                    <span>{selectedMembers.length > 0 ? `${selectedMembers.length} member(s) selected` : 'Choose members...'}</span>
                    <span>{showMemberDropdown ? '▲' : '▼'}</span>
                  </button>
                  
                  {showMemberDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg" style={{ border: '1.5px solid #d0dce8', maxHeight: '300px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                      <div className="p-2 border-b" style={{ borderColor: '#d0dce8' }}>
                        <input type="text" placeholder="Search members..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                          style={{ background: '#f1faee', border: '1px solid #d0dce8' }}
                          onClick={e => e.stopPropagation()} />
                      </div>
                      <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
                        {allOrgMembers.length > 0 ? (
                          allOrgMembers
                            .filter(m => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase()) || m.org_name.toLowerCase().includes(memberSearch.toLowerCase()))
                            .map(member => {
                              const isSelected = selectedMembers.includes(member.id);
                              return (
                                <button key={member.id} type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isSelected) {
                                      setSelectedMembers(prev => prev.filter(id => id !== member.id));
                                    } else {
                                      setSelectedMembers(prev => [...prev, member.id]);
                                    }
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left"
                                  style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 overflow-hidden"
                                    style={{ background: `hsl(${(member.name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                                    {member.avatar ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                      member.name[0].toUpperCase()
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-[#1d3557] truncate">{member.name}</div>
                                    <div className="text-xs text-[#6b7a8d] truncate">{member.email} • {member.org_name}</div>
                                  </div>
                                  {isSelected && (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                                      style={{ background: '#2a9d8f' }}>✓</div>
                                  )}
                                </button>
                              );
                            })
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-[#6b7a8d]">
                            No organization members found
                          </div>
                        )}
                      </div>
                      <div className="p-2 border-t" style={{ borderColor: '#d0dce8' }}>
                        <button type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMemberDropdown(false);
                          }}
                          className="w-full py-2 rounded-lg text-sm font-bold transition hover:opacity-90"
                          style={{ background: '#2a9d8f', color: '#fff' }}>
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Selected Members Display */}
                {selectedMembers.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      {selectedMembers.map(userId => {
                        const user = allOrgMembers.find(u => u.id === userId);
                        if (!user) return null;
                        return (
                          <div key={userId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
                            style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}>
                            <span>{user.name}</span>
                            <button type="button" onClick={() => setSelectedMembers(prev => prev.filter(id => id !== userId))}
                              className="text-xs hover:opacity-70">✕</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>OR</span>
                <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
              </div>

              {/* Option 2: Invite by email */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>📧 Invite by Email</label>
                <input
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setSelectedUser(null); setSearchQuery(''); setSearchResults([]); }}
                  placeholder="Enter email address..."
                  type="email"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}
                />
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>An invitation will be sent to this email address.</p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>OR</span>
                <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
              </div>

              {/* Option 3: Select from contacts */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>👥 Select from Contacts</label>
                <div className="relative">
                  <input
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSelectedUser(null); setInviteEmail(''); }}
                    placeholder="Search contacts..."
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                    style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}
                  />
                </div>

                {filteredContacts.length > 0 && !selectedUser && (
                  <div className="mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto" style={{ border: '1.5px solid #d0dce8' }}>
                    {filteredContacts.map(u => (
                      <button key={u.id} type="button"
                        onClick={() => { setSelectedUser(u); setSearchQuery(u.name); setInviteEmail(''); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f1faee] transition text-left"
                        style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: avatarColors[u.name.charCodeAt(0) % avatarColors.length] }}>
                          {u.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate" style={{ color: '#1d3557' }}>{u.name}</div>
                          <div className="text-xs truncate" style={{ color: '#6b7a8d' }}>{u.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && !selectedUser && (
                  <div className="mt-1 rounded-xl px-4 py-3 text-sm text-center" style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#6b7a8d' }}>
                    No contacts found. Add connections first.
                  </div>
                )}

                {filteredContacts.length === 0 && searchResults.length > 0 && !selectedUser && (
                  <div className="mt-1 rounded-xl px-4 py-3 text-sm text-center" style={{ background: '#f8fafc', border: '1.5px solid #d0dce8', color: '#6b7a8d' }}>
                    No matching contacts
                  </div>
                )}

                {selectedUser && (
                  <div className="flex items-center gap-3 px-4 py-3 mt-1 rounded-xl" style={{ background: '#f0fdf9', border: '1.5px solid #2a9d8f' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: avatarColors[selectedUser.name.charCodeAt(0) % avatarColors.length] }}>
                      {selectedUser.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: '#1d3557' }}>{selectedUser.name}</div>
                      <div className="text-xs" style={{ color: '#6b7a8d' }}>{selectedUser.email}</div>
                    </div>
                    <button onClick={() => { setSelectedUser(null); setSearchQuery(''); }}
                      className="text-xs hover:text-[#e63946] transition" style={{ color: '#6b7a8d' }}>✕</button>
                  </div>
                )}
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>Assign Role</label>
                <select value={memberRole} onChange={e => setMemberRole(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                  {(myRole === 'owner' ? ['admin','manager','developer','designer','viewer'] : ['manager','developer','designer','viewer']).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {addError && <p className="text-xs font-bold" style={{ color: '#e63946' }}>⚠ {addError}</p>}
              
              <div className="flex gap-3 pt-2">
                <button onClick={addMember} disabled={(!selectedUser && !inviteEmail.trim() && selectedMembers.length === 0) || sending}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#457b9d' }}>
                  {sending ? 'Processing...' : inviteEmail.trim() ? '📧 Send Invitation' : selectedMembers.length > 0 ? `+ Add ${selectedMembers.length} Member(s)` : '+ Add Member'}
                </button>
                <button onClick={() => { setShowAddMember(false); setShowMemberDropdown(false); }} disabled={sending}
                  className="flex-1 py-3 rounded-xl font-bold text-sm hover:bg-[#f1faee] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#1d3557', border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
