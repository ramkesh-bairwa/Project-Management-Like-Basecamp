import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const POST = withAuth(async (req: NextRequest, user) => {
  const { payment_id, action } = await req.json();
  if (!payment_id) return apiError('payment_id required');

  const payments = await query<{ id: number; plan_id: number; billing_cycle: string; amount: number }[]>(
    "SELECT id, plan_id, billing_cycle, amount FROM payments WHERE id=? AND user_id=? AND status='pending'",
    [payment_id, user.id]
  );
  if (!payments.length) return apiError('Payment not found', 404);
  const payment = payments[0];

  if (action === 'cancel') {
    await query("UPDATE payments SET status='failed' WHERE id=?", [payment.id]);
    return apiResponse({ message: 'Payment cancelled' });
  }

  // Confirm payment
  const ref = `sandbox_${Date.now()}`;
  await query("UPDATE payments SET status='completed', provider_ref=? WHERE id=?", [ref, payment.id]);

  // Set expiry
  const expires = new Date();
  if (payment.billing_cycle === 'monthly') expires.setMonth(expires.getMonth() + 1);
  else if (payment.billing_cycle === 'quarterly') expires.setMonth(expires.getMonth() + 3);
  else if (payment.billing_cycle === 'yearly') expires.setFullYear(expires.getFullYear() + 1);
  else expires.setFullYear(expires.getFullYear() + 100);

  // Upsert subscription
  try {
    await query(
      'INSERT INTO subscriptions (user_id, plan_id, billing_cycle, expires_at, payment_ref, amount_paid) VALUES (?,?,?,?,?,?)',
      [user.id, payment.plan_id, payment.billing_cycle, expires.toISOString(), ref, payment.amount]
    );
  } catch { /* ignore duplicate */ }

  await query(
    'UPDATE users SET plan_id=?, plan_expires_at=?, is_org=TRUE WHERE id=?',
    [payment.plan_id, expires.toISOString(), user.id]
  );

  return apiResponse({ message: 'Payment confirmed', expires_at: expires.toISOString() });
});
