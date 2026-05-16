'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User { name: string; email: string; plan_name: string; is_org: boolean; avatar?: string }
interface Project { id: number; name: string; status: string; priority: string; slug: string; task_count?: number; member_count?: number }
interface Task { id: number; title: string; status: string; priority: string; due_date: string; project_name: string; slug: string; project_slug: string }
interface Activity { id: number; type: string; title: string; body: string; created_at: string; link: string }
interface Connection { user_id: number; name: string; email: string; avatar?: string }

const tiles = [
  { href: '/projects', label: 'Projects', desc: 'Track work, set priorities, hit deadlines.', icon: '📋', bg: '#e63946', shadow: 'rgba(230,57,70,0.3)', light: false },
  { href: '/chats', label: 'Chats', desc: 'Direct messages and group conversations.', icon: '💬', bg: '#457b9d', shadow: 'rgba(69,123,157,0.3)', light: false },
  { href: '/organizations', label: 'Organizations', desc: 'Team workspaces with roles and permissions.', icon: '🏢', bg: '#2a9d8f', shadow: 'rgba(42,157,143,0.3)', light: false },
  { href: '/groups', label: 'Groups', desc: 'Focused circles for any team or topic.', icon: '👥', bg: '#e9c46a', shadow: 'rgba(233,196,106,0.3)', light: true },
  { href: '/connections', label: 'Connections', desc: 'Build and grow your professional network.', icon: '🔗', bg: '#f4a261', shadow: 'rgba(244,162,97,0.3)', light: true },
  { href: '/notifications', label: 'Notifications', desc: 'Stay on top of everything happening.', icon: '🔔', bg: '#6d6875', shadow: 'rgba(109,104,117,0.3)', light: false },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState({ projects: 0, connections: 0, notifications: 0, tasks: 0, groups: 0 });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [topConnections, setTopConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    
    // Fetch user info
    fetch('/api/users/me', { headers: h }).then(r => r.json()).then(setUser);
    
    // Fetch all data
    Promise.all([
      fetch('/api/projects', { headers: h }).then(r => r.json()),
      fetch('/api/connections', { headers: h }).then(r => r.json()),
      fetch('/api/notifications', { headers: h }).then(r => r.json()),
      fetch('/api/tasks/my-tasks', { headers: h }).then(r => r.json()).catch(() => []),
      fetch('/api/groups', { headers: h }).then(r => r.json()).catch(() => []),
    ]).then(([projects, connections, notifications, tasks, groups]) => {
      // Set counts
      setCounts({
        projects: Array.isArray(projects) ? projects.length : 0,
        connections: Array.isArray(connections) ? connections.filter((x: { status: string }) => x.status === 'accepted').length : 0,
        notifications: Array.isArray(notifications) ? notifications.filter((x: { is_read: boolean }) => !x.is_read).length : 0,
        tasks: Array.isArray(tasks) ? tasks.filter((t: Task) => t.status !== 'completed' && t.status !== 'cancelled').length : 0,
        groups: Array.isArray(groups) ? groups.length : 0,
      });
      
      // Set recent projects (top 4)
      if (Array.isArray(projects)) {
        setRecentProjects(projects.slice(0, 4));
      }
      
      // Set my tasks (top 5 pending/in-progress)
      if (Array.isArray(tasks)) {
        setMyTasks(tasks.filter((t: Task) => t.status !== 'completed' && t.status !== 'cancelled').slice(0, 5));
      }
      
      // Set recent activity from notifications
      if (Array.isArray(notifications)) {
        setRecentActivity(notifications.slice(0, 6));
      }
      
      // Set top connections (first 6)
      if (Array.isArray(connections)) {
        setTopConnections(connections.filter((c: Connection) => c.status === 'accepted').slice(0, 6));
      }
      
      setLoading(false);
    });
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statusColors: Record<string, string> = {
    planning: '#94a3b8',
    active: '#457b9d',
    on_hold: '#f4a261',
    completed: '#2a9d8f',
    archived: '#6d6875',
    pending: '#94a3b8',
    in_progress: '#457b9d',
    under_review: '#f4a261',
    qa: '#e9c46a',
  };

  const priorityColors: Record<string, string> = {
    low: '#94a3b8',
    medium: '#457b9d',
    high: '#f4a261',
    critical: '#e63946',
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div>
      {/* Hero greeting band */}
      <div style={{ background: '#1d3557' }} className="py-14 px-5 text-center">
        <p className="text-white/40 text-xs font-semibold mb-2 tracking-widest uppercase">
          {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <h1 className="text-4xl font-black text-white mb-2">
          {greeting}{user ? `, ${user.name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-white/40 text-base">What are you working on today?</p>
        <div className="flex items-center justify-center gap-10 mt-8">
          {[
            { label: 'Projects', value: counts.projects, color: '#e63946' },
            { label: 'Active Tasks', value: counts.tasks, color: '#457b9d' },
            { label: 'Groups', value: counts.groups, color: '#2a9d8f' },
            { label: 'Connections', value: counts.connections, color: '#a8dadc' },
            { label: 'Unread', value: counts.notifications, color: '#f4a261' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-white/40 text-xs mt-0.5 font-medium uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade strip */}
      {!user?.is_org && (
        <div style={{ background: '#152840' }} className="py-2.5 px-5 text-center">
          <span className="text-white/40 text-sm">
            Want team workspaces?{' '}
            <Link href="/plans" className="font-bold hover:underline" style={{ color: '#a8dadc' }}>Upgrade your plan</Link>
          </span>
        </div>
      )}

      {/* Tile grid */}
      <div className="max-w-7xl mx-auto px-5 py-12">
        
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-[#1d3557] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {tiles.map(tile => (
              <Link key={tile.href} href={tile.href}
                className="group rounded-xl p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg text-center"
                style={{ background: tile.bg, boxShadow: `0 2px 10px ${tile.shadow}` }}>
                <div className="text-3xl mb-2">{tile.icon}</div>
                <div className={`text-sm font-bold ${tile.light ? 'text-[#1d3557]' : 'text-white'}`}>{tile.label}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Recent Projects */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e2e8f0' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-[#1d3557]">📋 Recent Projects</h3>
                <Link href="/projects" className="text-sm font-bold text-[#457b9d] hover:underline">View all →</Link>
              </div>
              {recentProjects.length === 0 ? (
                <div className="text-center py-8 text-[#94a3b8]">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-sm">No projects yet. <Link href="/projects" className="text-[#457b9d] font-bold hover:underline">Create one</Link></p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map(project => (
                    <Link key={project.id} href={`/projects/${project.slug || project.id}`}
                      className="flex items-center gap-4 p-4 rounded-xl hover:bg-[#f8fafc] transition"
                      style={{ border: '1px solid #f1f5f9' }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                        style={{ background: statusColors[project.status] || '#457b9d' }}>
                        {project.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#1d3557] truncate">{project.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold capitalize"
                            style={{ background: statusColors[project.status] + '20', color: statusColors[project.status] }}>
                            {project.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-[#94a3b8]">
                            {project.task_count || 0} tasks · {project.member_count || 0} members
                          </span>
                        </div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-lg font-bold capitalize"
                        style={{ background: priorityColors[project.priority] + '20', color: priorityColors[project.priority] }}>
                        {project.priority}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* My Tasks */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e2e8f0' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-[#1d3557]">✅ My Active Tasks</h3>
                <Link href="/projects" className="text-sm font-bold text-[#457b9d] hover:underline">View all →</Link>
              </div>
              {myTasks.length === 0 ? (
                <div className="text-center py-8 text-[#94a3b8]">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-sm">No active tasks. You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myTasks.map(task => (
                    <div key={task.id}
                      onClick={() => router.push(`/projects/${task.project_slug}/tasks/${task.slug || task.id}`)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f8fafc] transition cursor-pointer"
                      style={{ border: '1px solid #f1f5f9' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: statusColors[task.status] || '#94a3b8' }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#1d3557] truncate">{task.title}</div>
                        <div className="text-xs text-[#94a3b8] mt-0.5">{task.project_name}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold capitalize"
                          style={{ background: priorityColors[task.priority] + '20', color: priorityColors[task.priority] }}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-[#f4a261]">📅</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            
            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e2e8f0' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-[#1d3557]">⚡ Activity</h3>
                <Link href="/notifications" className="text-sm font-bold text-[#457b9d] hover:underline">All →</Link>
              </div>
              {recentActivity.length === 0 ? (
                <div className="text-center py-6 text-[#94a3b8]">
                  <div className="text-3xl mb-2">🔔</div>
                  <p className="text-xs">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map(activity => (
                    <Link key={activity.id} href={activity.link || '/notifications'}
                      className="block p-3 rounded-xl hover:bg-[#f8fafc] transition"
                      style={{ border: '1px solid #f1f5f9' }}>
                      <div className="text-xs font-bold text-[#1d3557] mb-1 line-clamp-2">{activity.title}</div>
                      {activity.body && (
                        <div className="text-xs text-[#94a3b8] mb-1 line-clamp-1">{activity.body}</div>
                      )}
                      <div className="text-xs text-[#94a3b8]">{formatDate(activity.created_at)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top Connections */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e2e8f0' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-[#1d3557]">🔗 Connections</h3>
                <Link href="/connections" className="text-sm font-bold text-[#457b9d] hover:underline">All →</Link>
              </div>
              {topConnections.length === 0 ? (
                <div className="text-center py-6 text-[#94a3b8]">
                  <div className="text-3xl mb-2">👥</div>
                  <p className="text-xs">No connections yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {topConnections.map(conn => (
                    <Link key={conn.user_id} href="/connections"
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#f8fafc] transition"
                      style={{ border: '1px solid #f1f5f9' }}>
                      {conn.avatar ? (
                        <img src={conn.avatar} alt={conn.name} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: `hsl(${(conn.name.charCodeAt(0) * 37) % 360}, 55%, 50%)` }}>
                          {getInitials(conn.name)}
                        </div>
                      )}
                      <div className="text-xs font-bold text-[#1d3557] text-center truncate w-full">{conn.name.split(' ')[0]}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Plans banner */}
        <div className="mt-5 rounded-2xl p-7 flex items-center justify-between gap-6"
          style={{ background: '#1d3557', boxShadow: '0 4px 20px rgba(29,53,87,0.25)' }}>
          <div className="flex items-center gap-5">
            <div className="text-4xl">💎</div>
            <div>
              <div className="text-white font-black text-lg">
                {user?.is_org ? 'Organization Plan Active' : 'Upgrade to unlock Organizations'}
              </div>
              <div className="text-white/40 text-sm mt-0.5">
                {user?.is_org
                  ? `You are on the ${user.plan_name || 'Pro'} plan — full access enabled.`
                  : 'Pro, Business and Enterprise plans unlock team workspaces, custom roles, and more.'}
              </div>
            </div>
          </div>
          <Link href="/plans"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition hover:opacity-90"
            style={{ background: '#e63946' }}>
            {user?.is_org ? 'Manage Plan' : 'See Plans'}
          </Link>
        </div>
      </div>
    </div>
  );
}
