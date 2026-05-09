import { query } from '@/lib/db';
import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api';

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

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category');

  const blogs = category && category !== 'All'
    ? await query<Blog[]>('SELECT id,title,slug,excerpt,category,author,author_color,cover_color,created_at FROM blogs WHERE published=1 AND category=? ORDER BY created_at DESC', [category])
    : await query<Blog[]>('SELECT id,title,slug,excerpt,category,author,author_color,cover_color,created_at FROM blogs WHERE published=1 ORDER BY created_at DESC');

  const categories = await query<{ category: string }[]>(
    'SELECT DISTINCT category FROM blogs WHERE published=1 ORDER BY category'
  );

  return apiResponse({ blogs, categories: ['All', ...categories.map(c => c.category)] });
}
