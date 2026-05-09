import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

type Row = { page: string; section: string; content_key: string; content_value: string };

export const GET = withAuth(async (_req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const rows = await query<Row[]>('SELECT page, section, content_key, content_value FROM page_content ORDER BY page, section, content_key');
  return apiResponse(rows);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const body = await req.json() as { page: string; section: string; content_key: string; content_value: string }[];
  for (const item of body) {
    await query(
      'INSERT INTO page_content (page, section, content_key, content_value) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE content_value=?',
      [item.page, item.section, item.content_key, item.content_value, item.content_value]
    );
  }
  return apiResponse({ message: 'Content saved' });
});
