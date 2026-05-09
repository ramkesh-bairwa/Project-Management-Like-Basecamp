'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';

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
  const [contacts, setContacts] = useState<{ user_id: number; name: string; email: string }[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<{ user_id: number; name: string; email: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addTab, setAddTab] = useState<'contacts'|'email'>('contacts');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);

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
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    await fetch('/api/projects/members', { method: 'DELETE', headers: h, body: JSON.stringify({ project_id: projectId, user_id: userId }) });
    reloadMembers();
  }

  async function openAddMember() {
    setShowAddMember(true);
    setAddError(''); setSelectedContact(null); setContactSearch(''); setShowDropdown(false); setAddTab('contacts'); setInviteEmail('');
    const res = await fetch('/api/connections', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) {
      const accepted = data
        .filter((c: { status: string }) => c.status === 'accepted')
        .map((c: { user_id: number; name: string; email: string }) => ({ user_id: c.user_id, name: c.name, email: c.email }));
      setContacts(accepted);
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setSending(true);
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    if (addTab === 'contacts') {
      if (!selectedContact) { setAddError('Please select a contact'); setSending(false); return; }
      const r = await fetch('/api/projects/members', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectId, user_id: selectedContact.user_id, role: memberRole }) });
      setSending(false);
      if (r.ok) {
        reloadMembers();
        setShowAddMember(false); setSelectedContact(null); setContactSearch(''); setMemberRole('developer');
      } else { const e2 = await r.json(); setAddError(e2.error || 'Failed'); }
    } else {
      if (!inviteEmail) { setAddError('Enter an email'); setSending(false); return; }
      // Send invitation (works for both existing and new users)
      const r = await fetch('/api/projects/invite', { method: 'POST', headers: h, body: JSON.stringify({ project_id: projectId, emails: [inviteEmail] }) });
      setSending(false);
      if (r.ok) {
        const data = await r.json();
        const result = data.results?.[0];
        if (result?.status === 'added' || result?.status === 'invited') {
          reloadMembers();
          setShowAddMember(false); setInviteEmail(''); setMemberRole('developer');
        } else if (result?.status === 'already_member') {
          setAddError('Already a member');
        } else {
          setAddError(result?.message || 'Failed');
        }
      } else { const e2 = await r.json(); setAddError(e2.error || 'Failed'); }
    }
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
                  <button onClick={() => removeMember(m.id)}
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

      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg" style={{ color: '#1d3557' }}>Add Member</h3>
              <button onClick={() => setShowAddMember(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition" style={{ color: '#6b7a8d' }}>✕</button>
            </div>
            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden mb-5" style={{ border: '1.5px solid #d0dce8' }}>
              {(['contacts','email'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => { setAddTab(tab); setAddError(''); }}
                  className="flex-1 py-2 text-sm font-bold transition"
                  style={{ background: addTab === tab ? '#457b9d' : '#f8fafc', color: addTab === tab ? '#fff' : '#6b7a8d' }}>
                  {tab === 'contacts' ? '👥 From Contacts' : '✉️ By Email'}
                </button>
              ))}
            </div>
            <form onSubmit={addMember} className="space-y-4">
              {addTab === 'contacts' ? (
              <div className="relative">
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>Search contact by name</label>
                {selectedContact ? (
                  <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: '#f0fdf9', border: '1.5px solid #2a9d8f' }}>
                    <div>
                      <span className="text-sm font-bold" style={{ color: '#1d3557' }}>{selectedContact.name}</span>
                      <span className="text-xs ml-2" style={{ color: '#6b7a8d' }}>{selectedContact.email}</span>
                    </div>
                    <button type="button" onClick={() => { setSelectedContact(null); setContactSearch(''); }}
                      className="text-xs font-bold" style={{ color: '#e63946' }}>✕</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={contactSearch}
                      onChange={e => { setContactSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Type a name..."
                      className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                      style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}
                    />
                    {showDropdown && (
                      <div className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-lg" style={{ border: '1px solid #d0dce8', background: '#fff' }}>
                        {contacts.filter(c =>
                          !members.some(m => m.id === c.user_id) &&
                          c.name.toLowerCase().includes(contactSearch.toLowerCase())
                        ).length === 0 ? (
                          <div className="px-4 py-3 text-sm" style={{ color: '#6b7a8d' }}>
                            {contacts.length === 0 ? 'No contacts found' : 'No matching contacts'}
                          </div>
                        ) : (
                          contacts
                            .filter(c =>
                              !members.some(m => m.id === c.user_id) &&
                              c.name.toLowerCase().includes(contactSearch.toLowerCase())
                            )
                            .map(c => (
                              <button key={c.user_id} type="button"
                                onMouseDown={() => { setSelectedContact(c); setShowDropdown(false); setContactSearch(''); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f1faee] transition">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                                  style={{ background: '#457b9d' }}>{c.name[0]}</div>
                                <div>
                                  <div className="text-sm font-bold" style={{ color: '#1d3557' }}>{c.name}</div>
                                  <div className="text-xs" style={{ color: '#6b7a8d' }}>{c.email}</div>
                                </div>
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              ) : (
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>User email</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="user@example.com"
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              </div>
              )}
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>Role</label>
                <select value={memberRole} onChange={e => setMemberRole(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                  {(myRole === 'owner' ? ['admin','manager','developer','designer','viewer'] : ['manager','developer','designer','viewer']).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {addError && <p className="text-xs font-bold" style={{ color: '#e63946' }}>⚠ {addError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={sending} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: '#457b9d' }}>
                  {sending ? (addTab === 'email' ? 'Sending...' : 'Adding...') : (addTab === 'contacts' ? 'Add' : 'Invite')}
                </button>
                <button type="button" onClick={() => setShowAddMember(false)} disabled={sending}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition disabled:opacity-60 disabled:cursor-not-allowed" style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
