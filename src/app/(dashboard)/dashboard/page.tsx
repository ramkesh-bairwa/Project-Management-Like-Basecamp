'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/Toast';
import { readFocusStats } from '@/components/shell/FocusTimer';
import {
  IconFolder, IconTask, IconUsers, IconLink, IconBell, IconPlus, IconReport, IconChat, IconBuilding,
  IconArrowRight, IconCheck, IconCalendar, IconFlame, IconTimer, IconSparkles, IconGem, IconClock, IconTarget,
} from '@/components/shell/Icons';

interface User { name: string; email: string; plan_name: string; is_org: boolean; avatar?: string }
interface Project { id: number; name: string; status: string; priority: string; slug: string; task_count?: number; member_count?: number; description?: string; updated_at?: string }
interface Task { id: number; title: string; status: string; priority: string; due_date: string | null; project_name: string; slug: string; project_slug: string; group_name?: string }
interface Activity { id: number; type: string; title: string; body: string; created_at: string; link: string; is_read?: boolean }
interface Connection { user_id: number; name: string; email: string; avatar?: string; status?: string }

const STATUS: Record<string, { label: string; color: string }> = {
  planning: { label: 'Planning', color: '#94a3b8' },
  active: { label: 'Active', color: '#6366f1' },
  on_hold: { label: 'On hold', color: '#f59e0b' },
  completed: { label: 'Completed', color: '#10b981' },
  archived: { label: 'Archived', color: '#8b5cf6' },
  pending: { label: 'To do', color: '#94a3b8' },
  in_progress: { label: 'In progress', color: '#6366f1' },
  under_review: { label: 'Review', color: '#f59e0b' },
  qa: { label: 'QA', color: '#eab308' },
  reopened: { label: 'Reopened', color: '#f43f5e' },
};
const PRIORITY: Record<string, string> = { low: '#94a3b8', medium: '#6366f1', high: '#f59e0b', critical: '#f43f5e' };

type Bucket = 'overdue' | 'today' | 'upcoming' | 'nodate';

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function bucketOf(t: Task): Bucket {
  if (!t.due_date) return 'nodate';
  const due = startOfDay(new Date(t.due_date)).getTime();
  const today = startOfDay().getTime();
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'upcoming';
}
function dueLabel(d: string | null) {
  if (!d) return '';
  const days = Math.round((startOfDay(new Date(d)).getTime() - startOfDay().getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${-days}d overdue`;
  if (days < 7) return new Date(d).toLocaleDateString('en', { weekday: 'short' });
  return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), dd = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (dd < 7) return `${dd}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
function gradientFor(name: string) {
  const h = (name.charCodeAt(0) * 47 + (name.charCodeAt(1) || 0) * 13) % 360;
  return `linear-gradient(135deg, hsl(${h} 75% 60%), hsl(${(h + 40) % 360} 75% 50%))`;
}
const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

/** A tiny burst of confetti — pure DOM, no dependency. */
function celebrate(x: number, y: number) {
  const colors = ['#7065ff', '#ec4899', '#10b981', '#f59e0b', '#38bdf8'];
  for (let i = 0; i < 26; i++) {
    const el = document.createElement('span');
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 90;
    Object.assign(el.style, {
      position: 'fixed', left: `${x}px`, top: `${y}px`, width: '7px', height: '10px', borderRadius: '2px',
      background: colors[i % colors.length], pointerEvents: 'none', zIndex: '9999',
      transition: 'transform .8s cubic-bezier(.22,1,.36,1), opacity .8s ease',
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist + 40}px) rotate(${Math.random() * 540}deg)`;
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 900);
  }
}

function Ring({ value, size = 120, stroke = 11 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#6d5efc" /><stop offset="55%" stopColor="#a855f7" /><stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ringGrad)" strokeWidth={stroke} fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }} />
    </svg>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now(); let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState({ projects: 0, connections: 0, notifications: 0, tasks: 0, groups: 0 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [topConnections, setTopConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState<Bucket | 'all'>('all');
  const [completing, setCompleting] = useState<number | null>(null);
  const [doneToday, setDoneToday] = useState(0);
  const [focus, setFocus] = useState({ sessions: 0, minutes: 0 });
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const sync = () => { const s = readFocusStats(); setFocus({ sessions: s.sessions, minutes: s.minutes }); };
    sync();
    try {
      const d = JSON.parse(localStorage.getItem('done-today') || '{}');
      if (d.date === new Date().toISOString().slice(0, 10)) setDoneToday(d.n || 0);
    } catch { /* ignore */ }
    window.addEventListener('focus-stats', sync);
    return () => window.removeEventListener('focus-stats', sync);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    fetch('/api/users/me', { headers: h }).then(r => r.json()).then(setUser).catch(() => {});
    Promise.all([
      fetch('/api/projects', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/connections', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/notifications', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/tasks/my-tasks', { headers: h }).then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/groups', { headers: h }).then(r => r.json()).catch(() => []),
    ]).then(([p, c, n, t, g]) => {
      const accepted = Array.isArray(c) ? c.filter((x: Connection) => x.status === 'accepted') : [];
      const open = Array.isArray(t) ? t.filter((x: Task) => !['completed', 'cancelled', 'invalid'].includes(x.status)) : [];
      setCounts({
        projects: Array.isArray(p) ? p.length : 0,
        connections: accepted.length,
        notifications: Array.isArray(n) ? n.filter((x: { is_read: boolean }) => !x.is_read).length : 0,
        tasks: open.length,
        groups: Array.isArray(g) ? g.length : 0,
      });
      if (Array.isArray(p)) setProjects(p);
      setTasks(open);
      if (Array.isArray(n)) setRecentActivity(n.slice(0, 7));
      setTopConnections(accepted.slice(0, 8));
      setLoading(false);
    });
  }, []);

  const buckets = useMemo(() => {
    const b: Record<Bucket, Task[]> = { overdue: [], today: [], upcoming: [], nodate: [] };
    tasks.forEach(t => b[bucketOf(t)].push(t));
    return b;
  }, [tasks]);
  const visibleTasks = bucket === 'all' ? tasks : buckets[bucket];

  async function completeTask(t: Task, e: React.MouseEvent) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setCompleting(t.id);
    const token = localStorage.getItem('token');
    const res = await fetch('/api/tasks', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: t.id, status: 'completed' }),
    }).catch(() => null);
    if (res?.ok) {
      celebrate(rect.left + rect.width / 2, rect.top + rect.height / 2);
      setTimeout(() => {
        setTasks(prev => prev.filter(x => x.id !== t.id));
        setCounts(c => ({ ...c, tasks: Math.max(0, c.tasks - 1) }));
        setCompleting(null);
      }, 350);
      const n = doneToday + 1;
      setDoneToday(n);
      try { localStorage.setItem('done-today', JSON.stringify({ date: new Date().toISOString().slice(0, 10), n })); } catch { /* ignore */ }
      showToast('success', 'Task completed', `“${t.title}” — nice work!`, 3000);
    } else {
      setCompleting(null);
      const data = res ? await res.json().catch(() => ({})) : {};
      showToast('error', 'Could not complete task', data.error || 'Please try again.');
    }
  }

  const hour = now?.getHours() ?? 9;
  const greeting = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || '';
  const progress = doneToday + tasks.length > 0 ? doneToday / (doneToday + buckets.today.length + buckets.overdue.length || 1) : 0;
  const activeProjects = projects.filter(p => p.status === 'active').length;

  const stats = [
    { label: 'Open tasks', value: counts.tasks, icon: <IconTask />, color: '#6366f1', href: '/projects', sub: buckets.overdue.length ? `${buckets.overdue.length} overdue` : 'On track' },
    { label: 'Projects', value: counts.projects, icon: <IconFolder />, color: '#ec4899', href: '/projects', sub: `${activeProjects} active` },
    { label: 'Groups', value: counts.groups, icon: <IconUsers />, color: '#10b981', href: '/groups', sub: 'Team circles' },
    { label: 'Connections', value: counts.connections, icon: <IconLink />, color: '#f59e0b', href: '/connections', sub: 'In your network' },
  ];

  const quick = [
    { label: 'New project', icon: <IconPlus />, href: '/projects?new=1', color: '#6366f1' },
    { label: 'Daily report', icon: <IconReport />, href: '/daily-reports/create', color: '#10b981' },
    { label: 'Messages', icon: <IconChat />, href: '/chats', color: '#ec4899' },
    { label: 'Organizations', icon: <IconBuilding />, href: '/organizations', color: '#f59e0b' },
  ];

  return (
    <div className="pb-12">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="absolute inset-0 aurora" />
        <div className="absolute inset-0 dot-grid opacity-60" style={{ maskImage: 'linear-gradient(to bottom, black, transparent)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="flex flex-col lg:flex-row lg:items-end gap-8 justify-between">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 px-3 h-7 rounded-full text-xs font-medium text-muted glass" style={{ border: '1px solid var(--border)' }}>
                <IconCalendar size={13} />
                {now ? now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }) : ' '}
              </div>
              <h1 className="font-display text-3xl sm:text-[42px] leading-tight font-extrabold text-fg mt-4 tracking-tight">
                {greeting}{firstName && <>, <span className="text-gradient">{firstName}</span></>} <span className="inline-block origin-[70%_70%] hover:animate-[float_1s_ease-in-out]">👋</span>
              </h1>
              <p className="text-muted mt-2 text-[15px] max-w-xl">
                {loading ? 'Getting your day ready…'
                  : buckets.overdue.length > 0 ? <>You have <b className="text-fg">{buckets.overdue.length} overdue</b> and <b className="text-fg">{buckets.today.length} due today</b>. Let’s clear the deck.</>
                  : buckets.today.length > 0 ? <><b className="text-fg">{buckets.today.length} task{buckets.today.length > 1 ? 's' : ''}</b> due today. You’ve got this.</>
                  : tasks.length > 0 ? <>Nothing due today — a great day to get ahead on <b className="text-fg">{tasks.length} open task{tasks.length > 1 ? 's' : ''}</b>.</>
                  : 'Inbox zero on tasks. Start something new or help your team.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 animate-fade-up" style={{ animationDelay: '.08s' }}>
              {quick.map(q => (
                <Link key={q.label} href={q.href} className="btn btn-secondary group">
                  <span className="w-6 h-6 -ml-1 rounded-lg flex items-center justify-center text-white transition-transform group-hover:scale-110" style={{ background: q.color }}>
                    {q.icon && <span className="scale-[.8] flex">{q.icon}</span>}
                  </span>
                  {q.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8 stagger">
            {stats.map(s => (
              <Link key={s.label} href={s.href} className="card card-hover p-4 sm:p-5 relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-[.12] blur-2xl transition-opacity group-hover:opacity-25" style={{ background: s.color }} />
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}1f`, color: s.color }}>{s.icon}</span>
                  <IconArrowRight size={16} className="text-subtle opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </div>
                <div className="font-display text-3xl font-bold text-fg mt-4 tabular-nums">{loading ? <span className="skeleton inline-block w-12 h-8" /> : <CountUp to={s.value} />}</div>
                <div className="flex items-center justify-between mt-1 gap-2">
                  <span className="text-sm font-medium text-muted">{s.label}</span>
                  <span className="text-[11px] text-subtle truncate hidden sm:block">{!loading && s.sub}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* My work */}
          <section className="card overflow-hidden animate-fade-up">
            <div className="px-5 sm:px-6 pt-5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2"><IconTarget size={19} className="text-primary-text" /> My work</h2>
                <p className="text-xs text-subtle mt-0.5">Tasks assigned to you across every project</p>
              </div>
              <div className="flex gap-1 p-1 rounded-xl overflow-x-auto max-w-full" style={{ background: 'var(--surface-3)' }}>
                {([['all', 'All', tasks.length], ['overdue', 'Overdue', buckets.overdue.length], ['today', 'Today', buckets.today.length], ['upcoming', 'Upcoming', buckets.upcoming.length], ['nodate', 'No date', buckets.nodate.length]] as [Bucket | 'all', string, number][]).map(([k, label, n]) => (
                  <button key={k} onClick={() => setBucket(k)}
                    className="h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5"
                    style={{ background: bucket === k ? 'var(--surface)' : 'transparent', color: bucket === k ? 'var(--text)' : 'var(--text-muted)', boxShadow: bucket === k ? 'var(--shadow-sm)' : 'none' }}>
                    {label}
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center"
                      style={{ background: k === 'overdue' && n > 0 ? 'var(--danger-soft)' : 'var(--surface-3)', color: k === 'overdue' && n > 0 ? 'var(--danger)' : 'var(--text-subtle)' }}>{n}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2 sm:p-3 mt-2">
              {loading ? (
                <div className="space-y-2 p-2">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-14" />)}</div>
              ) : visibleTasks.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="mx-auto w-16 h-16 rounded-3xl flex items-center justify-center mb-4 animate-float" style={{ background: 'var(--grad-brand-soft)' }}>
                    <IconSparkles size={28} className="text-primary-text" />
                  </div>
                  <div className="font-display font-bold text-fg">{bucket === 'overdue' ? 'Nothing overdue' : 'All clear here'}</div>
                  <p className="text-sm text-subtle mt-1">{tasks.length === 0 ? 'No tasks are assigned to you right now.' : 'Pick another tab to see the rest of your work.'}</p>
                  <Link href="/projects" className="btn btn-sm btn-secondary mt-4">Browse projects <IconArrowRight size={14} /></Link>
                </div>
              ) : (
                <ul className="space-y-1">
                  {visibleTasks.slice(0, 8).map(task => {
                    const b = bucketOf(task);
                    const st = STATUS[task.status] || STATUS.pending;
                    const done = completing === task.id;
                    return (
                      <li key={task.id}
                        onClick={() => router.push(`/projects/${task.project_slug}/tasks/${task.slug || task.id}`)}
                        className="group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all hover:bg-[var(--surface-hover)]"
                        style={{ opacity: done ? 0.4 : 1, transform: done ? 'translateX(12px)' : 'none' }}>
                        <button onClick={e => completeTask(task, e)} disabled={completing !== null}
                          className="w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center transition-all hover:scale-110"
                          style={{ border: `2px solid ${done ? 'var(--success)' : PRIORITY[task.priority] || 'var(--border-strong)'}`, background: done ? 'var(--success)' : 'transparent' }}
                          title="Mark as complete" aria-label={`Complete ${task.title}`}>
                          <IconCheck size={12} strokeWidth={3} className={`text-white transition-opacity ${done ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`} style={{ color: done ? '#fff' : PRIORITY[task.priority] }} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium text-fg truncate ${done ? 'line-through' : ''}`}>{task.title}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-subtle min-w-0">
                            <span className="truncate">{task.project_name}</span>
                            {task.group_name && <><span>·</span><span className="truncate">{task.group_name}</span></>}
                          </div>
                        </div>
                        <span className="badge hidden sm:inline-flex" style={{ background: `${st.color}1a`, color: st.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />{st.label}
                        </span>
                        {task.due_date && (
                          <span className="text-xs font-medium flex items-center gap-1 flex-shrink-0 tabular-nums"
                            style={{ color: b === 'overdue' ? 'var(--danger)' : b === 'today' ? 'var(--warning-text)' : 'var(--text-subtle)' }}>
                            <IconClock size={13} />{dueLabel(task.due_date)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {visibleTasks.length > 8 && (
                <div className="text-center text-xs text-subtle pt-2 pb-1">+ {visibleTasks.length - 8} more — press <span className="kbd">⌘K</span> to search them</div>
              )}
            </div>
          </section>

          {/* Projects */}
          <section className="animate-fade-up" style={{ animationDelay: '.06s' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold text-fg flex items-center gap-2"><IconFolder size={19} className="text-primary-text" /> Recent projects</h2>
              <Link href="/projects" className="text-sm font-semibold text-primary-text hover:underline flex items-center gap-1">View all <IconArrowRight size={14} /></Link>
            </div>
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}</div>
            ) : projects.length === 0 ? (
              <Link href="/projects?new=1" className="card card-hover flex flex-col items-center justify-center text-center py-12 border-dashed" style={{ borderStyle: 'dashed' }}>
                <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-3" style={{ background: 'var(--grad-brand)' }}><IconPlus /></span>
                <span className="font-display font-bold text-fg">Create your first project</span>
                <span className="text-sm text-subtle mt-1">Organize tasks, docs and people in one place.</span>
              </Link>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4 stagger">
                {projects.slice(0, 4).map(p => {
                  const st = STATUS[p.status] || STATUS.planning;
                  return (
                    <Link key={p.id} href={`/projects/${p.slug || p.id}`} className="card card-hover p-5 group relative overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-1 opacity-80" style={{ background: gradientFor(p.name) }} />
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-display font-bold text-lg flex-shrink-0 shadow-sm transition-transform group-hover:scale-105 group-hover:-rotate-3"
                          style={{ background: gradientFor(p.name) }}>{p.name[0]?.toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-fg truncate">{p.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="badge" style={{ background: `${st.color}1a`, color: st.color }}>{st.label}</span>
                            {p.priority && <span className="badge" style={{ background: `${PRIORITY[p.priority] || '#94a3b8'}1a`, color: PRIORITY[p.priority] || '#94a3b8' }}>{p.priority}</span>}
                          </div>
                        </div>
                      </div>
                      {p.description && <p className="text-sm text-muted mt-3 line-clamp-2">{p.description.replace(/<[^>]+>/g, '')}</p>}
                      <div className="flex items-center gap-4 mt-4 pt-3 text-xs text-subtle" style={{ borderTop: '1px solid var(--border-soft)' }}>
                        <span className="flex items-center gap-1.5"><IconTask size={14} /> {p.task_count || 0} tasks</span>
                        <span className="flex items-center gap-1.5"><IconUsers size={14} /> {p.member_count || 0} members</span>
                        <IconArrowRight size={14} className="ml-auto opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-primary-text" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── Right column ────────────────────────────────── */}
        <div className="space-y-6 min-w-0">
          {/* Today's momentum */}
          <section className="card p-5 relative overflow-hidden animate-fade-up" style={{ animationDelay: '.04s' }}>
            <div className="absolute inset-0 opacity-70 pointer-events-none" style={{ background: 'var(--grad-brand-soft)' }} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-fg flex items-center gap-2"><IconFlame size={18} style={{ color: '#f97316' }} /> Today’s momentum</h2>
              </div>
              <div className="flex items-center gap-5 mt-4">
                <div className="relative flex-shrink-0">
                  <Ring value={progress} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-2xl font-extrabold text-fg tabular-nums">{Math.round(progress * 100)}%</span>
                    <span className="text-[10px] uppercase tracking-wider text-subtle font-semibold">done</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1 min-w-0">
                  <div>
                    <div className="text-2xl font-display font-bold text-fg tabular-nums">{doneToday}</div>
                    <div className="text-xs text-muted">tasks completed today</div>
                  </div>
                  <div>
                    <div className="text-2xl font-display font-bold text-fg tabular-nums">{focus.minutes}<span className="text-sm text-subtle font-medium"> min</span></div>
                    <div className="text-xs text-muted">{focus.sessions} focus session{focus.sessions === 1 ? '' : 's'}</div>
                  </div>
                </div>
              </div>
              <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }))} className="btn btn-primary w-full mt-5">
                <IconTimer size={16} /> Start a 25-min focus session
              </button>
            </div>
          </section>

          {/* Activity */}
          <section className="card p-5 animate-fade-up" style={{ animationDelay: '.08s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-fg flex items-center gap-2"><IconBell size={18} className="text-primary-text" /> Activity</h2>
              <Link href="/notifications" className="text-xs font-semibold text-primary-text hover:underline">See all</Link>
            </div>
            {loading ? (
              <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="skeleton h-12" />)}</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-6 text-sm text-subtle">No recent activity</div>
            ) : (
              <ol className="relative">
                <span className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'var(--border)' }} />
                {recentActivity.map(a => (
                  <li key={a.id}>
                    <Link href={a.link || '/notifications'} className="relative flex gap-3 py-2 rounded-xl group">
                      <span className="relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: a.type === 'task' ? '#6366f1' : a.type === 'project' ? '#10b981' : '#f59e0b' }}>
                        {a.type === 'task' ? <IconTask size={14} /> : a.type === 'project' ? <IconFolder size={14} /> : <IconBell size={14} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium text-fg line-clamp-2 group-hover:text-primary-text transition-colors">{a.title}</span>
                        <span className="block text-[11px] text-subtle mt-0.5">{timeAgo(a.created_at)}</span>
                      </span>
                      {a.is_read === false && <span className="w-2 h-2 mt-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* People */}
          <section className="card p-5 animate-fade-up" style={{ animationDelay: '.12s' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-fg flex items-center gap-2"><IconUsers size={18} className="text-primary-text" /> Your people</h2>
              <Link href="/connections" className="text-xs font-semibold text-primary-text hover:underline">Manage</Link>
            </div>
            {topConnections.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-subtle">No connections yet.</p>
                <Link href="/connections" className="btn btn-sm btn-secondary mt-3">Find teammates</Link>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {topConnections.map(c => (
                  <Link key={c.user_id} href="/connections" className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-[var(--surface-hover)] transition group" title={c.name}>
                    {c.avatar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.avatar} alt={c.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-transparent group-hover:ring-[var(--primary)] transition" />
                      : <span className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-semibold transition-transform group-hover:scale-105" style={{ background: gradientFor(c.name) }}>{initials(c.name)}</span>}
                    <span className="text-[11px] font-medium text-muted truncate w-full text-center">{c.name.split(' ')[0]}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Plan */}
          <section className="rounded-2xl p-5 relative overflow-hidden text-white animate-fade-up" style={{ background: 'var(--grad-brand)', animationDelay: '.16s', boxShadow: 'var(--shadow-glow)' }}>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-white/10 blur-xl" />
            <div className="absolute right-4 top-4 opacity-30"><IconGem size={44} /></div>
            <div className="relative">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/70">{user?.is_org ? 'Your plan' : 'Upgrade'}</div>
              <div className="font-display text-xl font-bold mt-1">{user?.is_org ? `${user.plan_name || 'Pro'} plan active` : 'Unlock Organizations'}</div>
              <p className="text-sm text-white/80 mt-1">{user?.is_org ? 'Full access to team workspaces and roles.' : 'Team workspaces, custom roles and more projects.'}</p>
              <Link href="/plans" className="btn btn-sm mt-4 bg-white/95 text-[#3b2fd9] hover:bg-white">{user?.is_org ? 'Manage plan' : 'See plans'} <IconArrowRight size={14} /></Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
