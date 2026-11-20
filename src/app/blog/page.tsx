'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicNav, { CtaBand, PageHero, PublicFooter } from '@/components/PublicNav';

type Blog = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  author_color: string;
  cover_color: string;
  created_at: string;
};

const CATEGORY_COLORS: Record<string, string> = {
  Product:           '#f43f5e',
  Engineering:       '#6366f1',
  'Tips & Tricks':   '#10b981',
  Growth:            '#f59e0b',
  'Customer Stories':'#8b5cf6',
  General:           '#818cf8',
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
  const catColor = (cat: string) => CATEGORY_COLORS[cat] || '#6366f1';

  return (
    <div className="min-h-screen overflow-x-clip bg-bg text-fg">
      <PublicNav />

      <PageHero eyebrow="Blog" title={<>Stories, tips <span className="text-gradient">&amp; updates</span></>} subtitle="Product news, engineering deep-dives and team productivity tips." />

      {/* Category filter */}
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map(c => {
            const on = active === c;
            return (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${on ? 'border-transparent text-white shadow-[var(--shadow-md)]' : 'border-line bg-surface text-muted hover:border-[var(--border-strong)] hover:text-fg'}`}
                style={on ? { background: c === 'All' ? 'var(--grad-brand)' : catColor(c) } : undefined}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        {loading ? (
          <div className="space-y-6">
            <div className="skeleton h-72 w-full rounded-[28px]" />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="card p-6">
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton mt-4 h-5 w-full" />
                  <div className="skeleton mt-2 h-5 w-3/4" />
                  <div className="skeleton mt-5 h-3 w-full" />
                  <div className="skeleton mt-2 h-3 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="card mx-auto max-w-md p-12 text-center">
            <div className="text-4xl">📭</div>
            <p className="mt-3 text-muted">No blogs found in this category.</p>
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="group relative mb-10 block overflow-hidden rounded-[28px] p-7 text-white shadow-[var(--shadow-lg)] transition-transform duration-300 hover:-translate-y-1 sm:p-12"
                style={{ background: `linear-gradient(135deg, ${featured.cover_color}, ${featured.cover_color}cc 60%, #00000055)` }}
              >
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(120deg,transparent_30%,#000)]" />
                <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/15 blur-3xl transition-transform duration-700 group-hover:scale-125" />
                <div className="relative max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">Featured</span>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${catColor(featured.category)}55` }}>{featured.category}</span>
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl text-balance">{featured.title}</h2>
                  <p className="mt-4 text-[15px] leading-relaxed text-white/80">{featured.excerpt}</p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold ring-2 ring-white/40" style={{ background: featured.author_color }}>{initials(featured.author)}</div>
                    <div>
                      <div className="text-sm font-semibold">{featured.author}</div>
                      <div className="text-xs text-white/70">{formatDate(featured.created_at)}</div>
                    </div>
                    <span className="btn ml-auto bg-white text-[#2a1f7a] shadow-[var(--shadow-md)] group-hover:bg-white/90">
                      Read more
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {rest.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group card card-hover flex flex-col overflow-hidden">
                    <div className="relative h-36 overflow-hidden" style={{ background: `linear-gradient(135deg, ${post.cover_color || catColor(post.category)}, ${catColor(post.category)})` }}>
                      <div aria-hidden className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:16px_16px] transition-transform duration-700 group-hover:scale-110" />
                      <span className="absolute left-4 top-4 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{post.category}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="font-display text-lg font-bold leading-snug text-fg transition-colors group-hover:text-primary-text">{post.title}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                      <div className="mt-auto flex items-center gap-2.5 pt-6">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: post.author_color }}>{initials(post.author)}</div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-fg">{post.author}</div>
                          <div className="text-[11px] text-subtle">{formatDate(post.created_at)}</div>
                        </div>
                        <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary-text">
                          Read
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <CtaBand title="Ready to ship faster?" subtitle="Join thousands of teams already using ProjectHub.">
        <Link href="/register" className="btn btn-lg bg-white text-[#2a1f7a] shadow-[var(--shadow-lg)] hover:bg-white/90">Start for Free →</Link>
      </CtaBand>

      <PublicFooter />
    </div>
  );
}
