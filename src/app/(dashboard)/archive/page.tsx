'use client';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/client-auth';

interface ArchivedProject  { id: number; name: string; description: string; status: string; priority: string; deleted_at: string; }
interface ArchivedGroup    { id: number; name: string; description: string; color: string; deleted_at: string; project_name: string; project_id: number; }
interface ArchivedTask     { id: number; title: string; description: string; status: string; priority: string; deleted_at: string; project_name: string; project_id: number; group_name: string; group_color: string; }
interface ArchivedComment  { id: number; content: string; entity_type: string; deleted_at: string; user_name: string; task_title: string; project_name: string; }

const priorityColors: Record<string, string> = { low: '#94a3b8', medium: '#457b9d', high: '#f4a261', critical: '#e63946' };
const statusColors:   Record<string, string> = { todo: '#94a3b8', in_progress: '#457b9d', in_review: '#f4a261', done: '#2a9d8f', cancelled: '#e63946', planning: '#94a3b8', active: '#2a9d8f', on_hold: '#f4a261', completed: '#457b9d', archived: '#e63946' };

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TABS = [
  { key: 'projects', label: 'Projects',  icon: '📋' },
  { key: 'groups',   label: 'Groups',    icon: '🗂' },
  { key: 'tasks',    label: 'Tasks',     icon: '✅' },
  { key: 'comments', label: 'Comments',  icon: '💬' },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function ArchivePage() {
  const [token, setToken] = useState('');
  const [tab, setTab] = useState<TabKey>('projects');
  const [data, setData] = useState<{ projects: ArchivedProject[]; groups: ArchivedGroup[]; tasks: ArchivedTask[]; comments: ArchivedComment[] }>({ projects: [], groups: [], tasks: [], comments: [] });
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    fetch('/api/archive', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  async function restore(type: string, id: number) {
    const key = `${type}-${id}`;
    setRestoring(key);
    await fetch('/api/archive', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    });
    setRestoring(null);
    // Remove from local state
    setData(prev => ({
      ...prev,
      [`${type}s`]: (prev[`${type}s` as keyof typeof prev] as { id: number }[]).filter(x => x.id !== id),
    }));
  }

  const counts = { projects: data.projects.length, groups: data.groups.length, tasks: data.tasks.length, comments: data.comments.length };
  const total = counts.projects + counts.groups + counts.tasks + counts.comments;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🗃</span>
          <h1 className="text-2xl font-black" style={{ color: '#1d3557' }}>Archive</h1>
          {total > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: '#e63946' }}>{total} items</span>
          )}
        </div>
        <p className="text-sm" style={{ color: '#6b7a8d' }}>Deleted items are kept here. You can restore them anytime.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: '#e8f0f7' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition relative"
            style={{ background: tab === t.key ? '#1d3557' : 'transparent', color: tab === t.key ? '#fff' : '#6b7a8d' }}>
            {t.icon} {t.label}
            {counts[t.key] > 0 && (
              <span className="text-xs font-black px-1.5 py-0.5 rounded-full ml-0.5"
                style={{ background: tab === t.key ? 'rgba(255,255,255,0.2)' : '#d0dce8', color: tab === t.key ? '#fff' : '#1d3557' }}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-sm" style={{ color: '#6b7a8d' }}>Loading archive...</div>
        </div>
      ) : (
        <>
          {/* PROJECTS */}
          {tab === 'projects' && (
            <Section empty={data.projects.length === 0} label="projects">
              {data.projects.map(p => (
                <Card key={p.id}
                  title={p.name}
                  subtitle={p.description}
                  deletedAt={p.deleted_at}
                  badges={[
                    { label: p.status.replace('_', ' '), color: statusColors[p.status] },
                    { label: p.priority, color: priorityColors[p.priority] },
                  ]}
                  onRestore={() => restore('project', p.id)}
                  restoring={restoring === `project-${p.id}`}
                />
              ))}
            </Section>
          )}

          {/* GROUPS */}
          {tab === 'groups' && (
            <Section empty={data.groups.length === 0} label="groups">
              {data.groups.map(g => (
                <Card key={g.id}
                  title={g.name}
                  subtitle={g.description}
                  deletedAt={g.deleted_at}
                  accent={g.color}
                  badges={[{ label: `📋 ${g.project_name}`, color: '#457b9d' }]}
                  onRestore={() => restore('group', g.id)}
                  restoring={restoring === `group-${g.id}`}
                />
              ))}
            </Section>
          )}

          {/* TASKS */}
          {tab === 'tasks' && (
            <Section empty={data.tasks.length === 0} label="tasks">
              {data.tasks.map(t => (
                <Card key={t.id}
                  title={t.title}
                  subtitle={t.description}
                  deletedAt={t.deleted_at}
                  badges={[
                    { label: t.status.replace('_', ' '), color: statusColors[t.status] },
                    { label: t.priority, color: priorityColors[t.priority] },
                    ...(t.group_name ? [{ label: t.group_name, color: t.group_color || '#457b9d' }] : []),
                    { label: `📋 ${t.project_name}`, color: '#6b7a8d' },
                  ]}
                  onRestore={() => restore('task', t.id)}
                  restoring={restoring === `task-${t.id}`}
                />
              ))}
            </Section>
          )}

          {/* COMMENTS */}
          {tab === 'comments' && (
            <Section empty={data.comments.length === 0} label="comments">
              {data.comments.map(c => (
                <Card key={c.id}
                  title={`"${c.content.length > 80 ? c.content.substring(0, 80) + '…' : c.content}"`}
                  subtitle={c.task_title ? `On task: ${c.task_title}` : undefined}
                  deletedAt={c.deleted_at}
                  badges={[
                    ...(c.project_name ? [{ label: `📋 ${c.project_name}`, color: '#6b7a8d' }] : []),
                  ]}
                  onRestore={() => restore('comment', c.id)}
                  restoring={restoring === `comment-${c.id}`}
                />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ children, empty, label }: { children: React.ReactNode; empty: boolean; label: string }) {
  if (empty) return (
    <div className="bg-white rounded-2xl p-16 text-center" style={{ border: '2px dashed #d0dce8' }}>
      <div className="text-4xl mb-3">🗃</div>
      <div className="font-black text-base mb-1" style={{ color: '#1d3557' }}>No deleted {label}</div>
      <div className="text-sm" style={{ color: '#6b7a8d' }}>Deleted {label} will appear here</div>
    </div>
  );
  return <div className="space-y-3">{children}</div>;
}

function Card({ title, subtitle, deletedAt, accent, badges, onRestore, restoring }: {
  title: string; subtitle?: string; deletedAt: string; accent?: string;
  badges: { label: string; color: string }[];
  onRestore: () => void; restoring: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 flex items-start gap-4"
      style={{ border: '1px solid #d0dce8', borderLeft: accent ? `4px solid ${accent}` : '1px solid #d0dce8' }}>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm mb-1 truncate" style={{ color: '#1d3557' }}>{title}</div>
        {subtitle && <div className="text-xs mb-2 truncate" style={{ color: '#6b7a8d' }}>{subtitle}</div>}
        <div className="flex items-center gap-1.5 flex-wrap">
          {badges.map((b, i) => (
            <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-full capitalize text-white"
              style={{ background: b.color }}>
              {b.label}
            </span>
          ))}
          <span className="text-xs ml-auto flex-shrink-0" style={{ color: '#94a3b8' }}>
            🗑 {timeAgo(deletedAt)}
          </span>
        </div>
      </div>
      <button onClick={onRestore} disabled={restoring}
        className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:opacity-90 disabled:opacity-50"
        style={{ background: '#f0fdf9', color: '#0f766e', border: '1.5px solid #99f6e4' }}>
        {restoring ? '...' : '↩ Restore'}
      </button>
    </div>
  );
}
