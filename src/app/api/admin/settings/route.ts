import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

type Row = { key: string; value: string };

export const GET = withAuth(async (_req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const rows = await query<Row[]>('SELECT `key`, value FROM site_settings');
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  return apiResponse(settings);
});

export const PUT = withAuth(async (req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const body = await req.json() as Record<string, string>;
  const allowed = [
    'site_name', 'site_logo_url', 'primary_color', 'accent_color', 'secondary_color', 'logo_letter',
    'email_verification_enabled', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from',
  ];
  for (const key of allowed) {
    if (key in body) {
      await query(
        'INSERT INTO site_settings (`key`, value) VALUES (?,?) ON DUPLICATE KEY UPDATE value=?',
        [key, body[key], body[key]]
      );
    }
  }
  return apiResponse({ message: 'Settings saved' });
});
