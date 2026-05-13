import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const POST = withAuth(async (req: NextRequest, user) => {
  const { plan_id, org_id, payment_ref, gateway } = await req.json();
  if (!plan_id) return apiError('plan_id required');

  const plans = await query<{ id: number; price: number; billing_cycle: string; name: string }[]>(
    'SELECT id, price, billing_cycle, name FROM plans WHERE id = ? AND is_active = TRUE', [plan_id]
  );
  if (!plans.length) return apiError('Plan not found', 404);

  const plan = plans[0];
  const isFree = Number(plan.price) === 0;

  // --- FREE PLAN: activate immediately, no payment record needed ---
  if (isFree) {
    try {
      await query(
        'INSERT INTO subscriptions (user_id, org_id, plan_id, expires_at, payment_ref, amount_paid) VALUES (?, ?, ?, NULL, ?, ?)',
        [user.id, org_id || null, plan_id, payment_ref || `FREE-${Date.now()}`, 0]
      );
    } catch { /* ignore if subscriptions insert fails */ }

    // Free plan: keep is_org as-is (don't downgrade if already org)
    await query(
      'UPDATE users SET plan_id = ?, plan_expires_at = NULL WHERE id = ?',
      [plan_id, user.id]
    );

    if (org_id) {
      await query('UPDATE organizations SET plan_id = ?, plan_expires_at = NULL WHERE id = ? AND owner_id = ?', [plan_id, org_id, user.id]);
    }

    return apiResponse({ message: 'Free plan activated', is_org: false }, 201);
  }

  // --- PAID PLAN via SANDBOX: create pending payment record, return payment_id ---
  if (gateway === 'sandbox' || payment_ref?.startsWith('SANDBOX-')) {
    const amount = Number(plan.price);
    const ref = `SANDBOX-${Date.now()}`;

    const result = await query<{ insertId: number }>(
      `INSERT INTO payments (user_id, plan_id, billing_cycle, amount, currency, status, provider, provider_ref, metadata)
       VALUES (?, ?, ?, ?, 'USD', 'pending', 'sandbox', ?, ?)`,
      [user.id, plan_id, plan.billing_cycle, amount, ref, JSON.stringify({ sandbox: true })]
    );

    return apiResponse({ message: 'Sandbox payment created', payment_id: result.insertId }, 201);
  }

  // --- PAID PLAN via other gateway: just record and return ---
  const expires = new Date();
  if (plan.billing_cycle === 'monthly') expires.setMonth(expires.getMonth() + 1);
  else if (plan.billing_cycle === 'yearly') expires.setFullYear(expires.getFullYear() + 1);
  else expires.setFullYear(expires.getFullYear() + 100);

  const expiresStr = expires.toISOString().slice(0, 19).replace('T', ' ');

  try {
    await query(
      'INSERT INTO subscriptions (user_id, org_id, plan_id, expires_at, payment_ref, amount_paid) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, org_id || null, plan_id, expiresStr, payment_ref || null, plan.price]
    );
  } catch { /* ignore */ }

  await query(
    'UPDATE users SET plan_id = ?, plan_expires_at = ?, is_org = TRUE WHERE id = ?',
    [plan_id, expiresStr, user.id]
  );

  return apiResponse({ message: 'Subscription activated', expires_at: expiresStr, is_org: true }, 201);
});
