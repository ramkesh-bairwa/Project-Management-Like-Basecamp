import { query } from '@/lib/db';
import { apiResponse } from '@/lib/api';

type Row = { key: string; value: string };

export async function GET() {
  const rows = await query<Row[]>('SELECT `key`, value FROM site_settings');
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  return apiResponse(settings);
}
