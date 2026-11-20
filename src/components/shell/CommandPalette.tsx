'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { applyTheme } from '@/lib/theme';
import {
  IconHome, IconFolder, IconReport, IconBuilding, IconUsers, IconLink, IconGem, IconChat, IconSpark,
  IconBell, IconSearch, IconPlus, IconUser, IconArchive, IconSun, IconMoon, IconMonitor, IconKeyboard,
  IconTask, IconTimer, IconArrowRight, IconShield,
} from './Icons';

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon: React.ReactNode;
  color?: string;
  run: () => void;
};

interface Project { id: number; name: string; slug?: string; status?: string }
interface Task { id: number; title: string; slug?: string; project_slug?: string | number; project_name?: string; status?: string; priority?: string }

/** Lightweight fuzzy score: contiguous matches and word-starts score higher. */
function score(text: string, q: string) {
  if (!q) return 1;
  const t = text.toLowerCase();
  const query = q.toLowerCase();
  const idx = t.indexOf(query);
  if (idx === 0) return 100;
  if (idx > 0) return 80 - Math.min(idx, 40) + (t[idx - 1] === ' ' ? 15 : 0);
  let ti = 0; let s = 0;
  for (const ch of query) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return 0;
    s += found === ti ? 3 : 1;
    ti = found + 1;
  }
  return s;
}

const PRIORITY_DOT: Record<string, string> = { critical: '#f43f5e', high: '#f59e0b', medium: '#6366f1', low: '#94a3b8' };

export default function CommandPalette({ isAdmin, onShowShortcuts, onToggleFocus }: {
  isAdmin: boolean;
  onShowShortcuts: () => void;
  onToggleFocus: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => { setOpen(false); setQ(''); setActive(0); }, []);

  // Open with ⌘K / Ctrl+K, or from anywhere via a custom event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('open-command-palette', onOpen);
    };
  }, []);

  // Lazy-load searchable data the first time the palette opens
  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 10);
    if (loaded) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/projects', { headers: h }).then(r => (r.ok ? r.json() : [])).catch(() => []),
      fetch('/api/tasks/my-tasks?limit=150', { headers: h }).then(r => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([p, t]) => {
      if (Array.isArray(p)) setProjects(p);
      if (Array.isArray(t)) setTasks(t);
      setLoaded(true);
    });
  }, [open, loaded]);

  const go = useCallback((href: string) => { close(); router.push(href); }, [close, router]);

  const items = useMemo<Item[]>(() => {
    const nav: Item[] = [
      { id: 'n-home', group: 'Navigate', label: 'Home', hint: 'G H', icon: <IconHome />, run: () => go('/dashboard'), keywords: 'dashboard' },
      { id: 'n-projects', group: 'Navigate', label: 'Projects', hint: 'G P', icon: <IconFolder />, run: () => go('/projects') },
      { id: 'n-reports', group: 'Navigate', label: 'Daily Reports', hint: 'G R', icon: <IconReport />, run: () => go('/daily-reports'), keywords: 'standup' },
      { id: 'n-chats', group: 'Navigate', label: 'Messages', hint: 'G M', icon: <IconChat />, run: () => go('/chats'), keywords: 'chat dm' },
      { id: 'n-chatme', group: 'Navigate', label: 'ChatMe', icon: <IconSpark />, run: () => go('/chatme') },
      { id: 'n-orgs', group: 'Navigate', label: 'Organizations', hint: 'G O', icon: <IconBuilding />, run: () => go('/organizations'), keywords: 'team workspace' },
      { id: 'n-groups', group: 'Navigate', label: 'Groups', icon: <IconUsers />, run: () => go('/groups') },
      { id: 'n-conn', group: 'Navigate', label: 'Connections', icon: <IconLink />, run: () => go('/connections'), keywords: 'people network' },
      { id: 'n-notif', group: 'Navigate', label: 'Notifications', hint: 'G N', icon: <IconBell />, run: () => go('/notifications') },
      { id: 'n-plans', group: 'Navigate', label: 'Plans & Billing', icon: <IconGem />, run: () => go('/plans'), keywords: 'upgrade subscription' },
      { id: 'n-profile', group: 'Navigate', label: 'Profile', icon: <IconUser />, run: () => go('/profile'), keywords: 'account settings' },
      { id: 'n-archive', group: 'Navigate', label: 'Archive', icon: <IconArchive />, run: () => go('/archive') },
    ];
    if (isAdmin) nav.push({ id: 'n-admin', group: 'Navigate', label: 'Admin Panel', icon: <IconShield />, run: () => go('/admin') });

    const actions: Item[] = [
      { id: 'a-new-project', group: 'Actions', label: 'Create new project', hint: 'C', icon: <IconPlus />, run: () => go('/projects?new=1'), keywords: 'add start' },
      { id: 'a-new-report', group: 'Actions', label: 'Write today’s daily report', icon: <IconReport />, run: () => go('/daily-reports/create'), keywords: 'standup log' },
      { id: 'a-focus', group: 'Actions', label: 'Start / stop focus timer', hint: 'F', icon: <IconTimer />, run: () => { close(); onToggleFocus(); }, keywords: 'pomodoro timer deep work' },
      { id: 'a-shortcuts', group: 'Actions', label: 'Keyboard shortcuts', hint: '?', icon: <IconKeyboard />, run: () => { close(); onShowShortcuts(); }, keywords: 'help keys' },
      { id: 't-light', group: 'Theme', label: 'Light theme', icon: <IconSun />, run: () => { applyTheme('light'); close(); }, keywords: 'appearance mode' },
      { id: 't-dark', group: 'Theme', label: 'Dark theme', icon: <IconMoon />, run: () => { applyTheme('dark'); close(); }, keywords: 'appearance mode night' },
      { id: 't-system', group: 'Theme', label: 'System theme', icon: <IconMonitor />, run: () => { applyTheme('system'); close(); }, keywords: 'appearance auto' },
    ];

    const proj: Item[] = projects.map(p => ({
      id: `p-${p.id}`, group: 'Projects', label: p.name, hint: p.status?.replace('_', ' '),
      icon: <span className="w-[18px] h-[18px] rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: `hsl(${(p.name.charCodeAt(0) * 47) % 360} 70% 55%)` }}>{p.name[0]?.toUpperCase()}</span>,
      run: () => go(`/projects/${p.slug || p.id}`),
    }));

    const tsk: Item[] = tasks.map(t => ({
      id: `t-${t.id}`, group: 'My tasks', label: t.title, hint: t.project_name, keywords: `${t.status} ${t.priority}`,
      icon: <IconTask style={{ color: PRIORITY_DOT[t.priority || 'medium'] }} />,
      run: () => go(`/projects/${t.project_slug}/tasks/${t.slug || t.id}`),
    }));

    return [...actions, ...nav, ...proj, ...tsk];
  }, [projects, tasks, isAdmin, go, close, onShowShortcuts, onToggleFocus]);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) {
      // Default view: actions + navigation + a few recent projects/tasks
      return items.filter(i => i.group === 'Actions' || i.group === 'Navigate'
        || (i.group === 'Projects' && items.filter(x => x.group === 'Projects').indexOf(i) < 4)
        || (i.group === 'My tasks' && items.filter(x => x.group === 'My tasks').indexOf(i) < 4));
    }
    return items
      .map(i => ({ i, s: Math.max(score(i.label, query), score(`${i.keywords || ''} ${i.hint || ''}`, query) * 0.6) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map(x => x.i);
  }, [items, q]);

  // Group while keeping the ranked order of first appearance
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const r of results) {
      if (!map.has(r.group)) map.set(r.group, []);
      map.get(r.group)!.push(r);
    }
    return [...map.entries()];
  }, [results]);
  const flat = useMemo(() => grouped.flatMap(([, list]) => list), [grouped]);

  useEffect(() => { setActive(0); }, [q]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); flat[active]?.run(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  if (!open) return null;

  let idx = -1;
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[12vh]" onMouseDown={close}>
      <div className="absolute inset-0 animate-fade-in" style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }} />
      <div
        className="relative w-full max-w-[640px] rounded-2xl overflow-hidden animate-scale-in"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
        onMouseDown={e => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Command palette"
      >
        <div className="flex items-center gap-3 px-4 h-14" style={{ borderBottom: '1px solid var(--border)' }}>
          <IconSearch size={19} className="text-subtle flex-shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, tasks, pages or type a command…"
            className="flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-subtle"
            style={{ boxShadow: 'none', border: 'none' }}
          />
          <span className="kbd">Esc</span>
        </div>

        <div ref={listRef} className="max-h-[56vh] overflow-y-auto p-2">
          {flat.length === 0 && (
            <div className="py-14 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-primary-soft text-primary-text"><IconSearch /></div>
              <div className="text-sm font-semibold text-fg">No results for “{q}”</div>
              <div className="text-xs text-subtle mt-1">Try a project name, a task, or “dark”.</div>
            </div>
          )}
          {grouped.map(([group, list]) => (
            <div key={group} className="mb-1">
              <div className="px-3 pt-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle">{group}</div>
              {list.map(item => {
                idx++;
                const i = idx;
                const isActive = i === active;
                return (
                  <button
                    key={item.id}
                    data-idx={i}
                    onMouseMove={() => setActive(i)}
                    onClick={item.run}
                    className="w-full flex items-center gap-3 px-3 h-11 rounded-xl text-left transition-colors"
                    style={{ background: isActive ? 'var(--primary-soft)' : 'transparent' }}
                  >
                    <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg"
                      style={{ color: isActive ? 'var(--primary-text)' : 'var(--text-muted)', background: isActive ? 'transparent' : 'var(--surface-3)' }}>
                      {item.icon}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-sm font-medium" style={{ color: isActive ? 'var(--primary-text)' : 'var(--text)' }}>{item.label}</span>
                    {item.hint && (
                      /^[A-Z?](\s[A-Z])?$/.test(item.hint)
                        ? <span className="flex gap-1">{item.hint.split(' ').map(k => <span key={k} className="kbd">{k}</span>)}</span>
                        : <span className="text-xs text-subtle truncate max-w-[40%] capitalize">{item.hint}</span>
                    )}
                    {isActive && <IconArrowRight size={15} className="text-primary-text flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 h-10 text-[11px] text-subtle" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
            <span className="flex items-center gap-1"><span className="kbd">↵</span> open</span>
          </div>
          <span className="flex items-center gap-1"><span className="kbd">⌘</span><span className="kbd">K</span> toggle</span>
        </div>
      </div>
    </div>
  );
}
