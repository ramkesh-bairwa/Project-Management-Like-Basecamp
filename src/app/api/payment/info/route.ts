import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const GET = withAuth(async (req: NextRequest, user) => {
  const payment_id = new URL(req.url).searchParams.get('payment_id');
  if (!payment_id) return apiError('payment_id required');
  const rows = await query<unknown[]>(
    `SELECT py.id, CAST(py.amount AS DECIMAL(10,2))+0.0 as amount, py.billing_cycle, py.status, py.provider_ref as sandbox_ref,
       pl.name as plan_name
     FROM payments py JOIN plans pl ON pl.id=py.plan_id
     WHERE py.id=? AND py.user_id=?`,
    [payment_id, user.id]
  );
  if (!rows.length) return apiError('Not found', 404);
  return apiResponse(rows[0]);
});
