'use client';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { IconHome, IconUsers, IconTask, IconDoc } from '@/components/shell/Icons';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams();
  const pathname = usePathname();

  const tabs = [
    { href: `/projects/${id}`, label: 'Overview', icon: <IconHome size={16} /> },
    { href: `/projects/${id}/groups`, label: 'Groups', icon: <IconUsers size={16} /> },
    { href: `/projects/${id}/tasks`, label: 'Tasks', icon: <IconTask size={16} /> },
    { href: `/projects/${id}/docs`, label: 'Docs', icon: <IconDoc size={16} /> },
  ];

  return (
    <div>
      {/* Project sub-nav */}
      <div className="mb-7 -mt-2 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        <nav className="flex gap-1 min-w-max">
          {tabs.map(tab => {
            const active = tab.href === `/projects/${id}` ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href}
                className="relative flex items-center gap-2 px-3.5 h-11 text-sm font-medium transition-colors rounded-t-lg hover:bg-[var(--surface-hover)]"
                style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}>
                <span style={{ color: active ? 'var(--primary-text)' : 'inherit' }}>{tab.icon}</span>
                {tab.label}
                {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full" style={{ background: 'var(--grad-brand)' }} />}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
