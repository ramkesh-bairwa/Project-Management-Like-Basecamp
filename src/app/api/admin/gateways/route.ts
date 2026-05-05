import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (_req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const rows = await query<{ id: number; provider: string; is_active: boolean; is_enabled: boolean; display_name: string; config: string }[]>(
    'SELECT id, provider, is_active, is_enabled, display_name, config FROM payment_gateways ORDER BY id ASC'
  );
  return apiResponse(rows.map(r => ({ ...r, config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config })));
});

// PUT — update config or set active gateway
export const PUT = withAuth(async (req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const { provider, config, set_active, is_enabled } = await req.json();
  if (!provider) return apiError('provider required');

  if (set_active) {
    // Deactivate all, then activate selected
    await query('UPDATE payment_gateways SET is_active=FALSE');
    await query('UPDATE payment_gateways SET is_active=TRUE WHERE provider=?', [provider]);
  }

  if (config !== undefined) {
    await query('UPDATE payment_gateways SET config=? WHERE provider=?', [JSON.stringify(config), provider]);
  }

  if (is_enabled !== undefined) {
    await query('UPDATE payment_gateways SET is_enabled=? WHERE provider=?', [is_enabled ? 1 : 0, provider]);
  }

  return apiResponse({ message: 'Gateway updated' });
});
