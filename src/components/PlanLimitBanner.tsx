'use client';
import Link from 'next/link';

interface Limits {
  max_projects: number; max_members: number; max_tasks: number; max_groups: number; max_storage_gb: number;
}
interface Usage {
  projects: number; tasks: number; groups: number; members: number;
}

interface Props {
  plan: string;
  limits: Limits;
  usage: Usage;
  show?: ('projects' | 'tasks' | 'groups' | 'members')[];
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  if (max === -1) return null;
  const pct = Math.min(100, Math.round((used / max) * 100));
  const color = pct >= 100 ? '#f43f5e' : pct >= 80 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-xs font-bold w-16 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold flex-shrink-0" style={{ color }}>
        {used}/{max}
      </span>
    </div>
  );
}

export default function PlanLimitBanner({ plan, limits, usage, show = ['projects', 'tasks', 'groups', 'members'] }: Props) {
  const atLimit =
    (show.includes('projects') && limits.max_projects !== -1 && usage.projects >= limits.max_projects) ||
    (show.includes('tasks') && limits.max_tasks !== -1 && usage.tasks >= limits.max_tasks) ||
    (show.includes('groups') && limits.max_groups !== -1 && usage.groups >= limits.max_groups) ||
    (show.includes('members') && limits.max_members !== -1 && usage.members >= limits.max_members);

  const nearLimit =
    (show.includes('projects') && limits.max_projects !== -1 && usage.projects / limits.max_projects >= 0.8) ||
    (show.includes('tasks') && limits.max_tasks !== -1 && usage.tasks / limits.max_tasks >= 0.8) ||
    (show.includes('groups') && limits.max_groups !== -1 && usage.groups / limits.max_groups >= 0.8) ||
    (show.includes('members') && limits.max_members !== -1 && usage.members / limits.max_members >= 0.8);

  if (!nearLimit && !atLimit) return null;

  return (
    <div className="rounded-2xl p-4 mb-5 flex items-center gap-4 flex-wrap"
      style={{ background: atLimit ? 'var(--danger-soft)' : 'var(--warning-soft)', border: `1.5px solid ${atLimit ? 'var(--danger-soft)' : 'var(--warning-soft)'}` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-black" style={{ color: atLimit ? 'var(--accent)' : 'var(--warning-text)' }}>
            {atLimit ? '🚫 Plan limit reached' : '⚠️ Approaching plan limit'}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--primary)', color: '#fff' }}>
            {plan}
          </span>
        </div>
        <div className="space-y-1.5">
          {show.includes('projects') && <UsageBar label="Projects" used={usage.projects} max={limits.max_projects} />}
          {show.includes('groups') && <UsageBar label="Groups" used={usage.groups} max={limits.max_groups} />}
          {show.includes('tasks') && <UsageBar label="Tasks" used={usage.tasks} max={limits.max_tasks} />}
          {show.includes('members') && <UsageBar label="Members" used={usage.members} max={limits.max_members} />}
        </div>
      </div>
      <Link href="/plans"
        className="px-4 py-2 rounded-xl text-sm font-black text-white hover:opacity-90 transition flex-shrink-0"
        style={{ background: 'var(--accent)' }}>
        Upgrade Plan →
      </Link>
    </div>
  );
}
