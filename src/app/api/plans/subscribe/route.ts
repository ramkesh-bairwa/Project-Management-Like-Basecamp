import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { activatePlan } from '@/lib/subscription';

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
    // Free plan: keep is_org as-is (don't downgrade if already org)
    await activatePlan({
      userId: user.id, planId: plan.id, billingCycle: plan.billing_cycle, expiresAt: null,
      paymentRef: payment_ref || `FREE-${Date.now()}`, amount: 0, orgId: org_id || null, makeOrg: false,
    });

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

  // --- PAID PLAN via a real gateway: activated by that gateway's webhook after payment, never here ---
  return apiError('Paid plans must be purchased through the payment gateway', 400);
});
