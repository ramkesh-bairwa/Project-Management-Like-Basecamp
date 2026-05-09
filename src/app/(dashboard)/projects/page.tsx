'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/client-auth';
import ConfirmModal from '@/components/ConfirmModal';
import PlanLimitBanner from '@/components/PlanLimitBanner';

interface Project { id: number; uuid: string; slug: string; name: string; description: string; status: string; priority: string; due_date: string; org_id: number | null; image: string | null }
interface ProjectMember { id: number; name: string; role: string; avatar?: string; }
interface PlanInfo { plan: string; has_plan: boolean; limits: { max_projects: number; max_members: number; max_tasks: number; max_groups: number; max_storage_gb: number }; usage: { projects: number; tasks: number; groups: number; members: number } }
interface Plan { id: number; name: string; price: number; billing_cycle: string; max_projects: number; max_groups: number; max_tasks: number; max_members: number; max_storage_gb: number; features: string[] }

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

type ViewMode = 'grid' | 'list' | 'box';

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1.5px solid #d0dce8' }}>
      {(['grid','list','box'] as ViewMode[]).map(v => (
        <button key={v} onClick={() => onChange(v)}
          className="px-3 py-1.5 text-xs font-bold transition"
          style={{ background: view === v ? '#1d3557' : '#fff', color: view === v ? '#fff' : '#6b7a8d' }}
          title={v.charAt(0).toUpperCase() + v.slice(1)}>
          {v === 'grid' ? '⊞' : v === 'list' ? '☰' : '▦'}
        </button>
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Record<number, ProjectMember[]>>({});
  const [activeMember, setActiveMember] = useState<{ member: ProjectMember; x: number; y: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [form, setForm] = useState({ name: '', description: '', priority: 'medium', visibility: 'private', due_date: '', status: 'planning', image: '' });
  const [token, setToken] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  // Plan picker modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activatingPlan, setActivatingPlan] = useState<number | null>(null);
  const [confirmFreePlan, setConfirmFreePlan] = useState<Plan | null>(null);
  const [planSuccess, setPlanSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  // Member selection
  const [availableUsers, setAvailableUsers] = useState<{ id: number; name: string; email: string; avatar?: string }[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [searchMember, setSearchMember] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    const t = getToken();
    setToken(t);
    fetch('/api/projects', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d)) return;
        setProjects(d);
        d.forEach((p: Project) => {
          fetch(`/api/projects/members?project_id=${p.id}`, { headers: { Authorization: `Bearer ${t}` } })
            .then(r => r.json())
            .then(m => Array.isArray(m) && setMembers(prev => ({ ...prev, [p.id]: m })));
        });
      });
    fetch('/api/user/plan-limits', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => d?.plan && setPlanInfo(d));
    // Pre-load plans for the picker modal
    fetch('/api/plans').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setPlans(d.map((p: Plan & { features: string | string[]; max_tasks?: number; max_groups?: number }) => ({
        ...p,
        features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : (p.features || []),
        max_tasks: p.max_tasks ?? -1,
        max_groups: p.max_groups ?? -1,
      })));
    });
    // Load available users for member selection (only connections)
    fetch('/api/connections?status=accepted', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          // Extract connected users from connections
          const connectedUsers = d.map((conn: { requester: { id: number; name: string; email: string; avatar?: string }; receiver: { id: number; name: string; email: string; avatar?: string }; requester_id: number; receiver_id: number }) => {
            // Get current user ID from token
            const currentUserId = JSON.parse(atob(t.split('.')[1])).id;
            // Return the other user in the connection
            return conn.requester_id === currentUserId ? conn.receiver : conn.requester;
          });
          setAvailableUsers(connectedUsers);
        }
      });
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

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify(form) });
    
    if (!res.ok) {
      const text = await res.text();
      let errorMsg = 'Failed to create project';
      try {
        const data = JSON.parse(text);
        errorMsg = data.error || errorMsg;
      } catch {
        errorMsg = text || errorMsg;
      }
      alert(errorMsg);
      return;
    }
    
    const data = await res.json();
    
    // Add existing members to the project
    if (selectedMembers.length > 0) {
      await Promise.all(selectedMembers.map(userId => 
        fetch('/api/projects/members', {
          method: 'POST',
          headers,
          body: JSON.stringify({ project_id: data.id, user_id: userId, role: 'developer' })
        })
      ));
    }
    
    // Send email invitations for non-existing users
    if (inviteEmails.length > 0) {
      await fetch('/api/projects/invite', {
        method: 'POST',
        headers,
        body: JSON.stringify({ project_id: data.id, emails: inviteEmails })
      });
    }
    
    setProjects(p => [...p, { ...form, id: data.id, uuid: data.uuid, slug: data.slug, org_id: null }]);
    setShowForm(false);
    setForm({ name: '', description: '', priority: 'medium', visibility: 'private', due_date: '', status: 'planning', image: '' });
    setImagePreview('');
    setSelectedMembers([]);
    setSearchMember('');
    setInviteEmails([]);
    setEmailInput('');
    setPlanInfo(prev => prev ? { ...prev, usage: { ...prev.usage, projects: prev.usage.projects + 1 } } : prev);
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

  async function activateFreePlan(plan: Plan) {
    setActivatingPlan(plan.id);
    const res = await fetch('/api/plans/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: plan.id, payment_ref: `FREE-${Date.now()}` }),
    });
    const data = await res.json();
    setActivatingPlan(null);
    if (res.ok) {
      setConfirmFreePlan(null);
      setPlanSuccess(`✅ ${plan.name} plan activated! You can now create projects.`);
      // Refresh plan info from server
      const limitsRes = await fetch('/api/user/plan-limits', { headers: { Authorization: `Bearer ${token}` } });
      const limitsData = await limitsRes.json();
      if (limitsData?.plan) setPlanInfo(limitsData);
      // Close modal and open project form
      setTimeout(() => { setShowPlanModal(false); setPlanSuccess(''); setShowForm(true); }, 1200);
    } else {
      alert(data.error || 'Failed to activate plan. Please try again.');
    }
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);
  const planLoaded = planInfo !== null;
  const noPlan = !planLoaded || !planInfo.has_plan;
  const atProjectLimit = planLoaded && planInfo.limits.max_projects !== -1 && planInfo.usage.projects >= planInfo.limits.max_projects;

  function handleNewProject() {
    if (!planLoaded) return;
    if (noPlan) { setShowPlanModal(true); return; }
    if (atProjectLimit) return;
    setShowForm(true);
  }

  return (
    <div onClick={() => setActiveMember(null)}>
      {planInfo && <PlanLimitBanner plan={planInfo.plan} limits={planInfo.limits} usage={planInfo.usage} show={['projects']} />}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {['all', 'planning', 'active', 'on_hold', 'completed', 'archived'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition"
              style={{ background: filter === f ? '#1d3557' : '#fff', color: filter === f ? '#fff' : '#6b7a8d', border: '1px solid', borderColor: filter === f ? '#1d3557' : '#d0dce8' }}>
              {f === 'all' ? `All (${projects.length})` : f.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <button onClick={handleNewProject}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white transition hover:opacity-90"
            style={{ background: !planLoaded || atProjectLimit ? '#94a3b8' : '#e63946', cursor: !planLoaded || atProjectLimit ? 'not-allowed' : 'pointer' }}
            title={!planLoaded ? 'Loading...' : noPlan ? 'Select a plan to create projects' : atProjectLimit ? `Limit reached: ${planInfo?.usage.projects}/${planInfo?.limits.max_projects} projects` : ''}>
            + New Project
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}>
          {filtered.map((p, i) => {
            const sc = statusCfg[p.status] || statusCfg.planning;
            const accent = accentColors[i % accentColors.length];
            return (
              <div key={p.id} className="relative">
                <Link href={`/projects/${p.slug || p.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f8fafc] transition group"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm group-hover:text-[#e63946] transition truncate" style={{ color: '#1d3557' }}>{p.name}</div>
                    {p.description && <div className="text-xs truncate" style={{ color: '#6b7a8d' }}>{p.description}</div>}
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: sc.bg, color: sc.text }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />{sc.label}
                  </span>
                  <span className="text-xs font-semibold capitalize flex-shrink-0" style={{ color: accent }}>{p.priority}</span>
                  {p.due_date && <span className="text-xs flex-shrink-0" style={{ color: '#6b7a8d' }}>{fmtD(p.due_date)}</span>}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(members[p.id] || []).slice(0, 3).map((m, mi) => {
                      const memberData = m as ProjectMember & { avatar?: string };
                      return (
                        <div key={m.id}
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setActiveMember({ member: m, x: rect.left, y: rect.bottom + 8 });
                          }}
                          className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-black cursor-pointer hover:scale-110 transition-transform overflow-hidden"
                          style={{
                            background: `hsl(${(m.name.charCodeAt(0) * 37) % 360}, 55%, 50%)`,
                            marginLeft: mi > 0 ? '-8px' : '0',
                            zIndex: 10 - mi,
                          }}>
                          {memberData.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={memberData.avatar} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            m.name[0].toUpperCase()
                          )}
                        </div>
                      );
                    })}
                    {(members[p.id] || []).length > 3 && (
                      <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-black"
                        style={{ background: '#94a3b8', color: '#fff', marginLeft: '-8px', zIndex: 4 }}>
                        +{(members[p.id] || []).length - 3}
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(p); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-50 flex-shrink-0"
                    style={{ color: '#e63946', border: '1px solid #fecaca' }}>🗑</button>
                </Link>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-16 text-center">
              <div className="text-5xl mb-4">📋</div>
              <div className="font-black text-[#1d3557] mb-2">No projects yet</div>
              <button onClick={handleNewProject} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#e63946' }}>Create Project</button>
            </div>
          )}
        </div>
      ) : (
      <div className={view === 'box' ? 'grid grid-cols-1 gap-5' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'}>
        {filtered.map((p, i) => {
          const sc = statusCfg[p.status] || statusCfg.planning;
          const accent = accentColors[i % accentColors.length];
          return (
            <Link key={p.id} href={`/projects/${p.slug || p.id}`}
              className={`bg-white rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all group relative${view === 'box' ? ' flex gap-5 items-start' : ''}`}
              style={{ border: '1px solid #d0dce8', boxShadow: '0 2px 8px rgba(29,53,87,0.06)' }}>
              {/* Top accent bar */}
              <div className="relative" style={{ height: '8px', background: accent }} />
              
              <div className='p-5'>
                {/* Header with icon, title and members */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Project icon */}
                  {p.image ? (
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden" style={{ border: '2px solid #d0dce8' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xl font-black"
                      style={{ background: accent }}>
                      {p.name[0].toUpperCase()}
                    </div>
                  )}
                  
                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-[#1d3557] text-base leading-snug group-hover:text-[#e63946] transition truncate">{p.name}</h3>
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full inline-flex mt-1"
                      style={{ background: sc.bg, color: sc.text }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                      {sc.label}
                    </span>
                  </div>
                  
                  {/* Member avatars - top right */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(members[p.id] || []).slice(0, 3).map((m, mi) => {
                      const memberData = m as ProjectMember & { avatar?: string };
                      return (
                        <div key={m.id}
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setActiveMember({ member: m, x: rect.left, y: rect.bottom + 8 });
                          }}
                          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-black cursor-pointer hover:scale-110 transition-transform overflow-hidden"
                          style={{
                            background: `hsl(${(m.name.charCodeAt(0) * 37) % 360}, 55%, 50%)`,
                            marginLeft: mi > 0 ? '-10px' : '0',
                            zIndex: 10 - mi,
                          }}>
                          {memberData.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={memberData.avatar} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            m.name[0].toUpperCase()
                          )}
                        </div>
                      );
                    })}
                    {(members[p.id] || []).length > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-black"
                        style={{ background: '#94a3b8', color: '#fff', marginLeft: '-10px', zIndex: 4 }}>
                        +{(members[p.id] || []).length - 3}
                      </div>
                    )}
                  </div>
                </div>
                
                {p.description && <p className="text-sm text-[#6b7a8d] mb-4 line-clamp-2">{p.description}</p>}
                
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold capitalize px-2.5 py-1 rounded-full" style={{ background: `${accent}15`, color: accent }}>{p.priority}</span>
                  <div className="flex items-center gap-3 text-[#6b7a8d]">
                    {p.due_date && <span>📅 {fmtD(p.due_date)}</span>}
                    {p.org_id && <span style={{ color: '#2a9d8f' }}>🏢 Org</span>}
                  </div>
                  <button onClick={e => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(p); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-50"
                    style={{ color: '#e63946', border: '1px solid #fecaca' }}>🗑</button>
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
            <button onClick={handleNewProject} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#e63946' }}>Create Project</button>
          </div>
        )}
      </div>
      )}

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
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Project Image</label>
                <div className="flex items-center gap-4">
                  {(imagePreview || form.image) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview || form.image} alt="preview" className="w-20 h-20 rounded-xl object-cover"
                      style={{ border: '2px solid #d0dce8' }} />
                  )}
                  <div className="flex-1">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      className="w-full py-2 rounded-lg text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                      style={{ border: '1.5px dashed #457b9d', color: '#457b9d', background: 'rgba(69,123,157,0.05)' }}>
                      {uploading ? 'Uploading…' : '📷 Choose Image'}
                    </button>
                  </div>
                </div>
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
              <div>
                <label className="block text-sm font-bold text-[#1d3557] mb-1.5">Add Members (Optional)</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="Search users or enter email..." value={searchMember} onChange={e => setSearchMember(e.target.value)}
                    className="flex-1 rounded-xl px-4 py-3 text-[#1d3557] text-sm focus:outline-none"
                    style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }} />
                  {searchMember && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchMember) && (
                    <button type="button"
                      onClick={() => {
                        const email = searchMember.toLowerCase().trim();
                        if (!inviteEmails.includes(email) && !availableUsers.some(u => u.email.toLowerCase() === email)) {
                          setInviteEmails(prev => [...prev, email]);
                          setSearchMember('');
                        }
                      }}
                      className="px-4 py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90 flex-shrink-0"
                      style={{ background: '#f59e0b' }}>
                      📧 Add Email
                    </button>
                  )}
                </div>
                {/* Selected members and invited emails */}
                {(selectedMembers.length > 0 || inviteEmails.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedMembers.map(userId => {
                      const user = availableUsers.find(u => u.id === userId);
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
                    {inviteEmails.map(email => (
                      <div key={email} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
                        style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                        <span>📧 {email}</span>
                        <button type="button" onClick={() => setInviteEmails(prev => prev.filter(e => e !== email))}
                          className="text-xs hover:opacity-70">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* User list */}
                {searchMember && (
                  <div className="rounded-xl" style={{ border: '1.5px solid #d0dce8', background: '#fff' }}>
                    {(() => {
                      const matchingUsers = availableUsers.filter(u => 
                        !selectedMembers.includes(u.id) && 
                        (u.name.toLowerCase().includes(searchMember.toLowerCase()) || u.email.toLowerCase().includes(searchMember.toLowerCase()))
                      ).slice(0, 5);
                      
                      return (
                        <div className="max-h-48 overflow-y-auto">
                          {matchingUsers.map(user => (
                            <button key={user.id} type="button"
                              onClick={() => { setSelectedMembers(prev => [...prev, user.id]); setSearchMember(''); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                                style={{ background: `hsl(${(user.name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                                {user.avatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  user.name[0].toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-[#1d3557] truncate">{user.name}</div>
                                <div className="text-xs text-[#6b7a8d] truncate">{user.email}</div>
                              </div>
                            </button>
                          ))}
                          {matchingUsers.length === 0 && (
                            <div className="px-4 py-3 text-sm text-[#6b7a8d] text-center">
                              No users found. Enter a valid email to invite.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                <p className="text-xs text-[#6b7a8d] mt-2">💡 Add existing users or enter emails to send invitations. Multiple emails can be added.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition hover:opacity-90" style={{ background: '#e63946' }}>Create Project</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-[#1d3557] transition hover:bg-[#f1faee]" style={{ border: '1.5px solid #d0dce8' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan picker modal — shown when user has no plan */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(15,23,42,0.75)' }}>
          <div className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden" style={{ maxWidth: 900, maxHeight: '90vh', border: '1px solid #d0dce8', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div className="px-8 py-6 flex items-center justify-between flex-shrink-0" style={{ background: '#1d3557' }}>
              <div>
                <div className="font-black text-white text-xl">Choose a Plan to Get Started</div>
                <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Select any plan — Free plan requires no payment</div>
              </div>
              <button onClick={() => { setShowPlanModal(false); setConfirmFreePlan(null); setPlanSuccess(''); }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition text-lg">✕</button>
            </div>

            {/* Success banner */}
            {planSuccess && (
              <div className="mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-bold text-center flex-shrink-0"
                style={{ background: '#f0fdf9', color: '#0f766e', border: '1.5px solid #99f6e4' }}>
                {planSuccess}
              </div>
            )}

            {/* Plans grid */}
            <div className="p-6 overflow-y-auto flex-1">
              {confirmFreePlan ? (
                /* Free plan confirmation */
                <div className="max-w-md mx-auto">
                  <div className="text-center mb-6">
                    <div className="text-5xl mb-3">🎉</div>
                    <div className="font-black text-xl" style={{ color: '#1d3557' }}>Activate Free Plan</div>
                    <div className="text-sm mt-1" style={{ color: '#6b7a8d' }}>No credit card required</div>
                  </div>
                  <div className="rounded-2xl p-5 mb-5" style={{ background: '#f8fafc', border: '1.5px solid #d0dce8' }}>
                    <div className="font-black text-sm mb-3" style={{ color: '#1d3557' }}>You will get:</div>
                    <ul className="space-y-2">
                      {[
                        `${confirmFreePlan.max_projects === -1 ? 'Unlimited' : confirmFreePlan.max_projects} projects`,
                        `${confirmFreePlan.max_groups === -1 ? 'Unlimited' : confirmFreePlan.max_groups} groups`,
                        `${confirmFreePlan.max_tasks === -1 ? 'Unlimited' : confirmFreePlan.max_tasks} tasks`,
                        `${confirmFreePlan.max_members === -1 ? 'Unlimited' : confirmFreePlan.max_members} members`,
                        `${confirmFreePlan.max_storage_gb}GB storage`,
                        ...confirmFreePlan.features,
                      ].map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#1d3557' }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: '#2a9d8f' }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => activateFreePlan(confirmFreePlan)} disabled={activatingPlan === confirmFreePlan.id}
                      className="flex-1 py-3 rounded-xl font-black text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                      style={{ background: '#2a9d8f' }}>
                      {activatingPlan === confirmFreePlan.id ? 'Activating...' : '✓ Activate Free Plan'}
                    </button>
                    <button onClick={() => setConfirmFreePlan(null)}
                      className="flex-1 py-3 rounded-xl font-black text-sm transition hover:bg-gray-50"
                      style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>
                      ← Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map(plan => {
                    const isFree = Number(plan.price) === 0;
                    const colors: Record<string, { bg: string; border: string; btn: string; text: string; muted: string }> = {
                      Free:       { bg: '#fff',     border: '#d0dce8', btn: '#1d3557', text: '#1d3557', muted: '#6b7a8d' },
                      Pro:        { bg: '#1d3557',  border: '#1d3557', btn: '#e63946', text: '#fff',    muted: 'rgba(255,255,255,0.55)' },
                      Business:   { bg: '#457b9d',  border: '#457b9d', btn: '#fff',    text: '#fff',    muted: 'rgba(255,255,255,0.55)' },
                      Enterprise: { bg: '#152840',  border: '#152840', btn: '#e63946', text: '#fff',    muted: 'rgba(255,255,255,0.4)' },
                    };
                    const c = colors[plan.name] || colors.Free;
                    return (
                      <div key={plan.id} className="rounded-2xl p-5 flex flex-col"
                        style={{ background: c.bg, border: `2px solid ${c.border}` }}>
                        <div className="font-black text-lg mb-1" style={{ color: c.text }}>{plan.name}</div>
                        <div className="text-3xl font-black mb-1" style={{ color: c.text }}>
                          ${plan.price}
                          {isFree
                            ? <span className="text-sm font-bold ml-1" style={{ color: c.muted }}>/forever</span>
                            : <span className="text-sm font-bold ml-1" style={{ color: c.muted }}>/{plan.billing_cycle}</span>}
                        </div>
                        <ul className="space-y-1.5 my-4 flex-1">
                          {[
                            `${plan.max_projects === -1 ? 'Unlimited' : plan.max_projects} projects`,
                            `${plan.max_groups === -1 ? 'Unlimited' : plan.max_groups} groups`,
                            `${plan.max_tasks === -1 ? 'Unlimited' : plan.max_tasks} tasks`,
                            `${plan.max_members === -1 ? 'Unlimited' : plan.max_members} members`,
                            `${plan.max_storage_gb}GB storage`,
                            ...plan.features,
                          ].map(f => (
                            <li key={f} className="flex items-center gap-1.5 text-xs" style={{ color: c.muted }}>
                              <span className="font-black text-xs" style={{ color: c.text }}>✓</span> {f}
                            </li>
                          ))}
                        </ul>
                        {isFree ? (
                          <>
                            <button
                              onClick={() => setConfirmFreePlan(plan)}
                              className="w-full py-2.5 rounded-xl font-black text-sm transition hover:opacity-90"
                              style={{ background: '#2a9d8f', color: '#fff' }}>
                              Get started free
                            </button>
                            <p className="text-xs text-center mt-1.5 font-medium" style={{ color: c.muted }}>No credit card needed</p>
                          </>
                        ) : (
                          <button
                            onClick={() => window.location.href = '/plans'}
                            className="w-full py-2.5 rounded-xl font-black text-sm transition hover:opacity-90"
                            style={{ background: c.btn, color: '#fff' }}>
                            View paid plan →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
