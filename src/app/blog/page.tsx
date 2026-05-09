'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';

type Blog = {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  author_color: string;
  cover_color: string;
  created_at: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  Product:           '#e63946',
  Engineering:       '#457b9d',
  'Tips & Tricks':   '#2a9d8f',
  Growth:            '#f4a261',
  'Customer Stories':'#6d6875',
  General:           '#a8dadc',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [active, setActive] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = active === 'All' ? '/api/blogs' : `/api/blogs?category=${encodeURIComponent(active)}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setBlogs(d.blogs ?? []);
        if (d.categories?.length) setCategories(d.categories);
      })
      .finally(() => setLoading(false));
  }, [active]);

  const featured = blogs[0];
  const rest = blogs.slice(1);
  const catColor = (cat: string) => CATEGORY_COLORS[cat] || '#457b9d';

  return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f8fafc', color: '#1d3557' }}>
      <PublicNav />

      {/* Hero */}
      <section style={{ padding: '64px 24px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(230,57,70,0.08)', border: '1px solid rgba(230,57,70,0.2)', color: '#e63946', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Blog</div>
        <h1 style={{ fontSize: 48, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1.5px' }}>Stories, tips &amp; updates</h1>
        <p style={{ fontSize: 17, color: '#6b7a8d', margin: 0 }}>Product news, engineering deep-dives and team productivity tips.</p>
      </section>

      {/* Category Filter */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 40px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c} onClick={() => setActive(c)} style={{
            padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: active === c ? 'none' : '1px solid #e2e8f0',
            background: active === c ? (c === 'All' ? '#1d3557' : catColor(c)) : '#fff',
            color: active === c ? '#fff' : '#6b7a8d',
            transition: 'all 0.2s',
          }}>{c}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: 15 }}>Loading blogs…</div>
        ) : blogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: 15 }}>No blogs found in this category.</div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <div style={{ background: `linear-gradient(135deg,${featured.cover_color},${featured.cover_color}cc)`, borderRadius: 24, padding: '48px', marginBottom: 40, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -80, right: -60, pointerEvents: 'none' }} />
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: `${catColor(featured.category)}33`, border: `1px solid ${catColor(featured.category)}55`, color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{featured.category}</div>
                <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.5px', maxWidth: 620, lineHeight: 1.2 }}>{featured.title}</h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px', maxWidth: 560, lineHeight: 1.7 }}>{featured.excerpt}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: featured.author_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>{initials(featured.author)}</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{featured.author}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{formatDate(featured.created_at)}</div>
                  </div>
                  <Link href={`/blog/${featured.slug}`} style={{ marginLeft: 'auto', padding: '10px 22px', borderRadius: 10, background: '#e63946', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Read More →</Link>
                </div>
              </div>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
                {rest.map(post => (
                  <div key={post.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Color bar */}
                    <div style={{ height: 6, background: catColor(post.category) }} />
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, background: `${catColor(post.category)}15`, color: catColor(post.category), fontSize: 11, fontWeight: 700, marginBottom: 14, alignSelf: 'flex-start' }}>{post.category}</div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1d3557', margin: '0 0 10px', lineHeight: 1.4, flex: 1 }}>{post.title}</h3>
                      <p style={{ fontSize: 13, color: '#6b7a8d', margin: '0 0 20px', lineHeight: 1.6 }}>{post.excerpt}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: post.author_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{initials(post.author)}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1d3557' }}>{post.author}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(post.created_at)}</div>
                        </div>
                        <Link href={`/blog/${post.slug}`} style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#e63946', textDecoration: 'none' }}>Read →</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <footer style={{ background: '#0f1f35', padding: '24px', textAlign: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>© 2025 ProjectHub · <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link></span>
      </footer>
    </div>
  );
}
