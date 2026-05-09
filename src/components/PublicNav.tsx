import Link from 'next/link';

const navLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function PublicNav() {
  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#e63946,#c1121f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 16 }}>P</div>
          <span style={{ fontWeight: 900, color: '#1d3557', fontSize: 18 }}>ProjectHub</span>
        </Link>

        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} style={{ padding: '7px 14px', borderRadius: 8, color: '#6b7a8d', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              {l.label}
            </Link>
          ))}
          <div style={{ width: 1, height: 20, background: '#d0dce8', margin: '0 8px' }} />
          <Link href="/login" style={{ padding: '7px 16px', borderRadius: 8, color: '#1d3557', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Sign In</Link>
          <Link href="/register" style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 14px rgba(230,57,70,0.3)' }}>Get Started Free</Link>
        </div>
      </div>
    </nav>
  );
}
