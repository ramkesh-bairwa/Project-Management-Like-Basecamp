'use client';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams();
  const pathname = usePathname();

  const tabs = [
    { href: `/projects/${id}`,        label: '🏠 Overview' },
    { href: `/projects/${id}/groups`, label: '🗂 Groups' },
    { href: `/projects/${id}/tasks`,  label: '✅ Tasks' },
    { href: `/projects/${id}/docs`,   label: '📄 Docs' },
  ];

  return (
    <div>
      {/* Project sub-nav */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: '#e8f0f7' }}>
        {tabs.map(tab => {
          const active = tab.href === `/projects/${id}` ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className="px-4 py-2 rounded-lg text-sm font-bold transition"
              style={{ background: active ? '#1d3557' : 'transparent', color: active ? '#fff' : '#6b7a8d' }}>
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
