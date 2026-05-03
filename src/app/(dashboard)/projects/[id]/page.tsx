'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getToken, getTokenUserId } from '@/lib/client-auth';

interface Project { id: number; name: string; description: string; status: string; priority: string; due_date: string; created_at: string }
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

export default function ProjectOverviewPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats>({ groups: 0, tasks: 0, docs: 0, members: 0 });
  const [myRole, setMyRole] = useState('');
  const [token, setToken] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('developer');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    const t = getToken();
    const uid = getTokenUserId();
    setToken(t);
    if (!id) return;
    const auth = { Authorization: `Bearer ${t}` };
    fetch(`/api/projects?id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => d && !d.error && setProject(d));
    fetch(`/api/projects/members?project_id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => {
        if (!Array.isArray(d)) return;
        setMembers(d);
        setStats(s => ({ ...s, members: d.length }));
        const me = d.find((m: Member) => m.id === uid);
        if (me) setMyRole(me.role);
      });
    fetch(`/api/project-groups?project_id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => Array.isArray(d) && setStats(s => ({ ...s, groups: d.length })));
    fetch(`/api/tasks?project_id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => Array.isArray(d) && setStats(s => ({ ...s, tasks: d.length })));
    fetch(`/api/documents?project_id=${id}`, { headers: auth })
      .then(r => r.json()).then(d => Array.isArray(d) && setStats(s => ({ ...s, docs: d.length })));
  }, [id]);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const res = await fetch(`/api/users?email=${encodeURIComponent(memberEmail)}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok || !data.id) { setAddError('User not found'); return; }
    const r2 = await fetch('/api/projects/members', { method: 'POST', headers: h, body: JSON.stringify({ project_id: Number(id), user_id: data.id, role: memberRole }) });
    if (r2.ok) {
      setMembers(m => [...m, { id: data.id, name: data.name, email: data.email, role: memberRole }]);
      setStats(s => ({ ...s, members: s.members + 1 }));
      setShowAddMember(false); setMemberEmail(''); setMemberRole('developer');
    } else {
      const e2 = await r2.json(); setAddError(e2.error || 'Failed');
    }
  }

  if (!project) return <div className="text-center py-20 text-[#6b7a8d]">Loading...</div>;

  const sc = statusCfg[project.status] || statusCfg.planning;
  const canManage = ['owner','manager'].includes(myRole);

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
              {project.due_date && <span>📅 Due {new Date(project.due_date).toLocaleDateString()}</span>}
              <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          {canManage && (
            <button onClick={() => setShowAddMember(true)}
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
        <h2 className="font-black text-base mb-4" style={{ color: '#1d3557' }}>Members ({members.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {members.map((m, i) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                style={{ background: avatarColors[i % avatarColors.length] }}>
                {m.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate" style={{ color: '#1d3557' }}>{m.name}</div>
                <div className="text-xs truncate" style={{ color: '#6b7a8d' }}>{m.email}</div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: m.role === 'owner' ? '#f0fdf9' : '#eff6ff', color: m.role === 'owner' ? '#0f766e' : '#1d4ed8' }}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg" style={{ color: '#1d3557' }}>Add Member</h3>
              <button onClick={() => { setShowAddMember(false); setAddError(''); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition" style={{ color: '#6b7a8d' }}>✕</button>
            </div>
            <form onSubmit={addMember} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>User email</label>
                <input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} required placeholder="user@example.com"
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#1d3557' }}>Role</label>
                <select value={memberRole} onChange={e => setMemberRole(e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8', color: '#1d3557' }}>
                  {['manager','developer','designer','viewer'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {addError && <p className="text-xs font-bold" style={{ color: '#e63946' }}>⚠ {addError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition" style={{ background: '#457b9d' }}>Add</button>
                <button type="button" onClick={() => { setShowAddMember(false); setAddError(''); }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition" style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
