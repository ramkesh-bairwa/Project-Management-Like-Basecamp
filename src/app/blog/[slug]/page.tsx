'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PublicNav, { CtaBand, PublicFooter } from '@/components/PublicNav';

type Blog = {
  id: number; title: string; slug: string; excerpt: string; content: string;
  category: string; author: string; author_color: string; cover_color: string; created_at: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  Product: '#f43f5e', Engineering: '#6366f1', 'Tips & Tricks': '#10b981',
  Growth: '#f59e0b', 'Customer Stories': '#8b5cf6', General: '#818cf8',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function readingTime(html: string) {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

const ArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);

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

  const catColor = (cat: string) => CATEGORY_COLORS[cat] || '#6366f1';

  if (loading) return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicNav />
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton mt-6 h-10 w-full" />
        <div className="skeleton mt-3 h-10 w-2/3" />
        <div className="skeleton mt-8 h-4 w-full" />
        <div className="skeleton mt-2 h-4 w-11/12" />
        <div className="skeleton mt-2 h-4 w-4/5" />
        <div className="skeleton mt-10 h-64 w-full rounded-3xl" />
      </div>
    </div>
  );

  if (notFound || !blog) return (
    <div className="min-h-screen bg-bg text-fg">
      <PublicNav />
      <div className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 aurora" />
        <div className="relative px-4 py-32 text-center sm:px-6">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-surface text-4xl shadow-[var(--shadow-md)]">📭</div>
          <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-fg">Blog post not found</h1>
          <p className="mt-2 text-muted">It may have been moved or unpublished.</p>
          <Link href="/blog" className="group btn btn-secondary mt-7"><ArrowLeft /> Back to Blog</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <PublicNav />

      {/* Hero banner */}
      <header className="relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${blog.cover_color}, ${blog.cover_color}cc 55%, #00000066)` }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(160deg,#000,transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 animate-fade-up">
          <Link href="/blog" className="group inline-flex items-center gap-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white">
            <ArrowLeft /> Back to Blog
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-white/30 px-3 py-1" style={{ background: `${catColor(blog.category)}55` }}>{blog.category}</span>
            <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{readingTime(blog.content || '')} min read</span>
          </div>
          <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl text-balance">{blog.title}</h1>
          <p className="mt-5 text-base leading-relaxed text-white/80 sm:text-lg">{blog.excerpt}</p>
          <div className="mt-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full text-[15px] font-bold ring-2 ring-white/40" style={{ background: blog.author_color }}>{initials(blog.author)}</div>
            <div>
              <div className="text-[15px] font-semibold">{blog.author}</div>
              <div className="text-sm text-white/70">{formatDate(blog.created_at)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-14 sm:px-6">
        <article>
          <style>{`
            .blog-content { color: var(--text-muted); }
            .blog-content h2 { font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: var(--text); margin: 2.4rem 0 .8rem; letter-spacing: -0.02em; line-height: 1.25; }
            .blog-content h3 { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--text); margin: 1.8rem 0 .6rem; }
            .blog-content p  { font-size: 1.0625rem; line-height: 1.85; margin: 0 0 1.15rem; }
            .blog-content a  { color: var(--link); text-decoration: underline; text-underline-offset: 3px; }
            .blog-content ul, .blog-content ol { margin: 0 0 1.2rem; padding-left: 1.4rem; line-height: 1.8; }
            .blog-content ul { list-style: disc; } .blog-content ol { list-style: decimal; }
            .blog-content li::marker { color: var(--primary); }
            .blog-content blockquote { border-left: 3px solid var(--primary); margin: 2rem 0; padding: 1rem 1.5rem; background: var(--primary-soft); border-radius: 0 14px 14px 0; }
            .blog-content blockquote p { color: var(--text); font-style: italic; font-size: 1.1rem; margin: 0; }
            .blog-content strong { color: var(--text); }
            .blog-content img { max-width: 100%; height: auto; border-radius: 16px; margin: 1.5rem 0; }
            .blog-content pre { overflow-x: auto; background: var(--surface-3); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; font-size: .875rem; }
            .blog-content code { background: var(--surface-3); border-radius: 6px; padding: .1rem .35rem; font-size: .9em; }
            .blog-content kbd { background: var(--surface-2); border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 6px; padding: 2px 6px; font-size: 13px; font-family: ui-monospace, monospace; color: var(--text); }
          `}</style>
          <div className="blog-content" dangerouslySetInnerHTML={{ __html: blog.content || '<p>Full article coming soon.</p>' }} />
        </article>

        {/* Author card */}
        <div className="card mt-14 flex items-center gap-4 p-5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full font-bold text-white" style={{ background: blog.author_color }}>{initials(blog.author)}</div>
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wider text-subtle">Written by</div>
            <div className="font-display text-base font-bold text-fg">{blog.author}</div>
          </div>
          <Link href="/blog" className="group btn btn-secondary btn-sm ml-auto"><ArrowLeft /> All posts</Link>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-extrabold tracking-tight">More in {blog.category}</h2>
            <div className="stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map(r => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group card card-hover flex flex-col overflow-hidden">
                  <div className="h-1.5" style={{ background: catColor(r.category) }} />
                  <div className="p-5">
                    <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: catColor(r.category) }}>{r.category}</div>
                    <div className="mt-2 text-[15px] font-bold leading-snug text-fg transition-colors group-hover:text-primary-text">{r.title}</div>
                    <div className="mt-3 text-xs text-subtle">{formatDate(r.created_at)}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <CtaBand title="Ready to try ProjectHub?" subtitle="Join thousands of teams already shipping faster.">
        <Link href="/register" className="btn btn-lg bg-white text-[#2a1f7a] shadow-[var(--shadow-lg)] hover:bg-white/90">Start for Free →</Link>
      </CtaBand>

      <PublicFooter />
    </div>
  );
}
