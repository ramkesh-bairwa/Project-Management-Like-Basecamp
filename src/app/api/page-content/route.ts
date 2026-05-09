import { query } from '@/lib/db';
import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/api';

type Row = { page: string; section: string; content_key: string; content_value: string };

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page');
  const rows = await query<Row[]>(
    page
      ? 'SELECT page, section, content_key, content_value FROM page_content WHERE page = ?'
      : 'SELECT page, section, content_key, content_value FROM page_content',
    page ? [page] : []
  );
  // Shape: { section: { key: value } }
  const result: Record<string, Record<string, string>> = {};
  for (const r of rows) {
    if (!result[r.section]) result[r.section] = {};
    result[r.section][r.content_key] = r.content_value;
  }
  return apiResponse(result);
}
