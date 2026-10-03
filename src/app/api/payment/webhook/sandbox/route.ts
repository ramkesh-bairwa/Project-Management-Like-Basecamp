import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { activatePlan, planExpiry } from '@/lib/subscription';

export const POST = withAuth(async (req: NextRequest, user) => {
  const { payment_id, action } = await req.json();
  if (!payment_id) return apiError('payment_id required');

  const payments = await query<{ id: number; plan_id: number; billing_cycle: string; amount: number }[]>(
    "SELECT id, plan_id, billing_cycle, amount FROM payments WHERE id=? AND user_id=? AND status='pending'",
    [payment_id, user.id]
  );
  if (!payments.length) return apiError('Payment not found or already processed', 404);
  const payment = payments[0];

  if (action === 'cancel') {
    await query("UPDATE payments SET status='failed' WHERE id=?", [payment.id]);
    return apiResponse({ message: 'Payment cancelled' });
  }

  // Confirm payment
  const ref = `sandbox_${Date.now()}`;
  await query("UPDATE payments SET status='completed', provider_ref=? WHERE id=?", [ref, payment.id]);

  const expiresStr = planExpiry(payment.billing_cycle);
  await activatePlan({
    userId: user.id, planId: payment.plan_id, billingCycle: payment.billing_cycle,
    expiresAt: expiresStr, paymentRef: ref, amount: Number(payment.amount),
  });

  return apiResponse({ message: 'Payment confirmed', expires_at: expiresStr });
});
