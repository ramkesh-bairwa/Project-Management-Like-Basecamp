'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';

type Blog = {
  id: number; title: string; slug: string; excerpt: string; content: string;
  category: string; author: string; author_color: string; cover_color: string; created_at: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  Product: '#e63946', Engineering: '#457b9d', 'Tips & Tricks': '#2a9d8f',
  Growth: '#f4a261', 'Customer Stories': '#6d6875', General: '#a8dadc',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [related, setRelated] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/blogs/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); return; }
        setBlog(d.blog);
        setRelated(d.related ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const catColor = (cat: string) => CATEGORY_COLORS[cat] || '#457b9d';

  if (loading) return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f8fafc' }}>
      <PublicNav />
      <div style={{ textAlign: 'center', padding: '120px 24px', color: '#94a3b8', fontSize: 15 }}>Loading…</div>
    </div>
  );

  if (notFound || !blog) return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f8fafc' }}>
      <PublicNav />
      <div style={{ textAlign: 'center', padding: '120px 24px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1d3557', margin: '0 0 12px' }}>Blog post not found</h1>
        <Link href="/blog" style={{ color: '#e63946', fontWeight: 700, textDecoration: 'none' }}>← Back to Blog</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f8fafc', color: '#1d3557' }}>
      <PublicNav />

      {/* Hero banner */}
      <div style={{ background: `linear-gradient(135deg,${blog.cover_color},${blog.cover_color}cc)`, padding: '64px 24px 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -120, right: -80, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <Link href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}>← Back to Blog</Link>
          <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: `${catColor(blog.category)}33`, border: `1px solid ${catColor(blog.category)}66`, color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 20 }}>{blog.category}</div>
          <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', margin: '0 0 20px', lineHeight: 1.2, letterSpacing: '-1px' }}>{blog.title}</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px', lineHeight: 1.7 }}>{blog.excerpt}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: blog.author_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>{initials(blog.author)}</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{blog.author}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{formatDate(blog.created_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 80px', display: 'grid', gridTemplateColumns: '1fr', gap: 48 }}>
        <article>
          <style>{`
            .blog-content h2 { font-size: 24px; font-weight: 800; color: #1d3557; margin: 36px 0 12px; letter-spacing: -0.5px; }
            .blog-content h3 { font-size: 18px; font-weight: 700; color: #1d3557; margin: 28px 0 10px; }
            .blog-content p  { font-size: 16px; color: #475569; line-height: 1.85; margin: 0 0 18px; }
            .blog-content blockquote { border-left: 4px solid #e63946; margin: 28px 0; padding: 16px 24px; background: rgba(230,57,70,0.04); border-radius: 0 12px 12px 0; }
            .blog-content blockquote p { color: #1d3557; font-style: italic; font-size: 17px; margin: 0; }
            .blog-content strong { color: #1d3557; }
            .blog-content kbd { background: #f1f5f9; border: 1px solid #d0dce8; border-radius: 4px; padding: 2px 6px; font-size: 13px; font-family: monospace; }
          `}</style>
          <div className="blog-content" dangerouslySetInnerHTML={{ __html: blog.content || '<p>Full article coming soon.</p>' }} />
        </article>

        {/* Related posts */}
        {related.length > 0 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 24px', letterSpacing: '-0.5px' }}>More in {blog.category}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              {related.map(r => (
                <Link key={r.slug} href={`/blog/${r.slug}`} style={{ textDecoration: 'none', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 5, background: catColor(r.category) }} />
                  <div style={{ padding: '18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: catColor(r.category), marginBottom: 8 }}>{r.category}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1d3557', lineHeight: 1.4, marginBottom: 10 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{formatDate(r.created_at)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg,#1d3557,#2a4a73)', borderRadius: 20, padding: '36px', textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 10px' }}>Ready to try ProjectHub?</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px' }}>Join thousands of teams already shipping faster.</p>
          <Link href="/register" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 12, background: '#e63946', color: '#fff', fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>Start for Free →</Link>
        </div>
      </div>

      <footer style={{ background: '#0f1f35', padding: '24px', textAlign: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>© 2025 ProjectHub · <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link></span>
      </footer>
    </div>
  );
}
