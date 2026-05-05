'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/client-auth';
import ConfirmModal from '@/components/ConfirmModal';

interface Project { id: number; uuid: string; slug: string; name: string; description: string; status: string; priority: string; due_date: string; org_id: number | null }
interface ProjectMember { id: number; name: string; role: string; }

const statusCfg: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  planning:  { dot: '#94a3b8', label: 'Planning',  bg: '#f1f5f9', text: '#475569' },
  active:    { dot: '#2a9d8f', label: 'Active',    bg: '#f0fdf9', text: '#0f766e' },
  on_hold:   { dot: '#f4a261', label: 'On Hold',   bg: '#fff7ed', text: '#c2410c' },
  completed: { dot: '#457b9d', label: 'Completed', bg: '#eff6ff', text: '#1d4ed8' },
  archived:  { dot: '#e63946', label: 'Archived',  bg: '#fef2f2', text: '#b91c1c' },
};

const accentColors = ['#e63946','#457b9d','#2a9d8f','#e9c46a','#f4a261','#6d6875'];


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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Record<number, ProjectMember[]>>({});
  const [activeMember, setActiveMember] = useState<{ member: ProjectMember; x: number; y: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium', visibility: 'private', due_date: '', status: 'planning' });

  const [token, setToken] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    fetch('/api/projects', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) return;
        setProjects(d);
        // Fetch members for all projects in parallel
        d.forEach((p: Project) => {
          fetch(`/api/projects/members?project_id=${p.id}`, { headers: { Authorization: `Bearer ${t}` } })
            .then(r => r.json())
            .then(m => Array.isArray(m) && setMembers(prev => ({ ...prev, [p.id]: m })));
        });
      });
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { setProjects(p => [...p, { ...form, id: data.id, uuid: data.uuid, slug: data.slug, org_id: null }]); setShowForm(false); setForm({ name: '', description: '', priority: 'medium', visibility: 'private', due_date: '', status: 'planning' }); }
  }

  async function deleteProject() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/projects?id=${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleting(false);
    setDeleteTarget(null);
    setProjects(p => p.filter(x => x.id !== deleteTarget.id));
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  return (
    <div onClick={() => setActiveMember(null)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 flex-wrap">
          {['all', 'planning', 'active', 'on_hold', 'completed', 'archived'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition"
              style={{ background: filter === f ? '#1d3557' : '#fff', color: filter === f ? '#fff' : '#6b7a8d', border: '1px solid', borderColor: filter === f ? '#1d3557' : '#d0dce8' }}>
              {f === 'all' ? `All (${projects.length})` : f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white transition hover:opacity-90"
          style={{ background: '#e63946' }}>
          + New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p, i) => {
          const sc = statusCfg[p.status] || statusCfg.planning;
          const accent = accentColors[i % accentColors.length];
          return (
            <Link key={p.id} href={`/projects/${p.slug || p.id}`}
              className="bg-white rounded-2xl overflow-visible hover:-translate-y-0.5 hover:shadow-lg transition-all group relative"
              style={{ border: '1px solid #d0dce8', boxShadow: '0 2px 8px rgba(29,53,87,0.06)' }}>
              {/* Top accent bar with overlapping member avatars */}
              <div className="relative h-2 rounded-t-2xl" style={{ background: accent }}>
                {(members[p.id] || []).slice(0, 5).map((m, mi) => (
                  <div key={m.id}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setActiveMember({ member: m, x: rect.left, y: rect.bottom + 8 });
                    }}
                    className="absolute -bottom-3.5 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-black cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      left: `${10 + mi * 18}px`,
                      background: `hsl(${(m.name.charCodeAt(0) * 37) % 360}, 55%, 50%)`,
                      zIndex: 10 - mi,
                    }}>
                    {m.name[0].toUpperCase()}
                  </div>
                ))}
                {(members[p.id] || []).length > 5 && (
                  <div
                    onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                    className="absolute -bottom-3.5 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-black"
                    style={{ left: `${10 + 5 * 18}px`, background: '#94a3b8', color: '#fff', zIndex: 4 }}>
                    +{(members[p.id] || []).length - 5}
                  </div>
                )}
              </div>
              <div className="p-5 pt-7">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-black text-[#1d3557] text-base leading-snug group-hover:text-[#e63946] transition">{p.name}</h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: sc.bg, color: sc.text }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                      {sc.label}
                    </span>
                    <button onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(p); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-50"
                      style={{ color: '#e63946', border: '1px solid #fecaca' }}>🗑</button>
                  </div>
                </div>
                {p.description && <p className="text-sm text-[#6b7a8d] mb-4 line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between text-xs text-[#6b7a8d]">
                  <span className="font-semibold capitalize" style={{ color: accent }}>{p.priority}</span>
                  <div className="flex items-center gap-3">
                    {p.due_date && <span>{fmtD(p.due_date)}</span>}
                    {p.org_id && <span style={{ color: '#2a9d8f' }}>🏢 Org</span>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 bg-white rounded-2xl p-16 text-center" style={{ border: '2px dashed #d0dce8' }}>
            <div className="text-5xl mb-4">📋</div>
            <div className="font-black text-[#1d3557] mb-2">No projects yet</div>
            <div className="text-[#6b7a8d] text-sm mb-6">Create your first project to get started</div>
            <button onClick={() => setShowForm(true)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#e63946' }}>Create Project</button>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Project"
          message={`Delete "${deleteTarget.name}"? All tasks, groups and documents will be removed.`}
          onConfirm={deleteProject}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Member info popup */}
      {activeMember && (
        <div
          className="fixed z-[200] bg-white rounded-2xl shadow-2xl p-4"
          style={{ top: activeMember.y, left: activeMember.x, minWidth: 200, border: '1.5px solid #d0dce8' }}
          onClick={e => e.stopPropagation()}>
          {/* Avatar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-black flex-shrink-0"
              style={{ background: `hsl(${(activeMember.member.name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
              {activeMember.member.name[0].toUpperCase()}
            </div>
            <div>
              <div className="font-black text-sm" style={{ color: '#1d3557' }}>{activeMember.member.name}</div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize"
                style={{
                  background: activeMember.member.role === 'owner' ? '#fef2f2' : activeMember.member.role === 'manager' ? '#eff6ff' : '#f0fdf9',
                  color: activeMember.member.role === 'owner' ? '#e63946' : activeMember.member.role === 'manager' ? '#457b9d' : '#2a9d8f'
                }}>
                {activeMember.member.role}
              </span>
            </div>
            <button onClick={() => setActiveMember(null)}
              className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center hover:bg-gray-100 transition text-xs"
              style={{ color: '#94a3b8' }}>✕</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(29,53,87,0.5)' }}>
          <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl" style={{ border: '1px solid #d0dce8' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-[#1d3557]">New Project</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b7a8d] hover:bg-[#f1faee] transition text-lg">✕</button>
            </div>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Project name *</label>
                <input placeholder="e.g. Website Redesign" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none transition"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }}
                  onFocus={e => e.target.style.borderColor = '#457b9d'} onBlur={e => e.target.style.borderColor = '#d0dce8'} />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Description</label>
                <textarea placeholder="What is this project about?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none transition resize-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                    style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }}>
                    {['low','medium','high','critical'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Visibility</label>
                  <select value={form.visibility} onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}
                    className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                    style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }}>
                    {['private','team','public'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Due date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                  style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90" style={{ background: '#e63946' }}>Create Project</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1d3557] transition hover:bg-[#f1faee]" style={{ border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
