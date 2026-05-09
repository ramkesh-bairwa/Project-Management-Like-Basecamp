import { query } from '@/lib/db';
import { apiResponse, apiError } from '@/lib/api';

type Blog = {
  id: number; title: string; slug: string; excerpt: string; content: string;
  category: string; author: string; author_color: string; cover_color: string; created_at: string;
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [blog] = await query<Blog[]>(
    'SELECT id,title,slug,excerpt,content,category,author,author_color,cover_color,created_at FROM blogs WHERE slug=? AND published=1',
    [slug]
  );
  if (!blog) return apiError('Blog not found', 404);

  const related = await query<Blog[]>(
    'SELECT id,title,slug,excerpt,category,author,author_color,cover_color,created_at FROM blogs WHERE category=? AND slug!=? AND published=1 ORDER BY created_at DESC LIMIT 3',
    [blog.category, slug]
  );

  return apiResponse({ blog, related });
}
