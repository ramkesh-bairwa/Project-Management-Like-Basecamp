import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const POST = withAuth(async (req: NextRequest, user) => {
  const { plan_id, org_id, payment_ref } = await req.json();
  if (!plan_id) return apiError('plan_id required');

  const plans = await query<{ id: number; price: number; billing_cycle: string }[]>(
    'SELECT id, price, billing_cycle FROM plans WHERE id = ? AND is_active = TRUE', [plan_id]
  );
  if (!plans.length) return apiError('Plan not found', 404);

  const plan = plans[0];
  const now = new Date();
  const expires = new Date(now);
  if (plan.billing_cycle === 'monthly') expires.setMonth(expires.getMonth() + 1);
  else if (plan.billing_cycle === 'yearly') expires.setFullYear(expires.getFullYear() + 1);
  else expires.setFullYear(expires.getFullYear() + 100);

  await query(
    'INSERT INTO subscriptions (user_id, org_id, plan_id, expires_at, payment_ref, amount_paid) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, org_id || null, plan_id, expires, payment_ref || null, plan.price]
  );

  // Update user plan and mark as org if paid plan
  const isOrg = plan.price > 0;
  await query('UPDATE users SET plan_id = ?, plan_expires_at = ?, is_org = ? WHERE id = ?', [plan_id, expires, isOrg, user.id]);

  if (org_id) {
    await query('UPDATE organizations SET plan_id = ?, plan_expires_at = ? WHERE id = ? AND owner_id = ?', [plan_id, expires, org_id, user.id]);
  }

  return apiResponse({ message: 'Subscription activated', expires_at: expires, is_org: isOrg }, 201);
});
