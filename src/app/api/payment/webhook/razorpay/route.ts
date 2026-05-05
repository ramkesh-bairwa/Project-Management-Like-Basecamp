import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const POST = withAuth(async (req: NextRequest, user) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id } = await req.json();

  if (!payment_id) return apiError('payment_id required');

  // Get pending payment
  const payments = await query<{ id: number; plan_id: number; billing_cycle: string; amount: number; provider_ref: string; metadata: string }[]>(
    "SELECT id, plan_id, billing_cycle, amount, provider_ref, metadata FROM payments WHERE id=? AND user_id=? AND status='pending'",
    [payment_id, user.id]
  );
  if (!payments.length) return apiError('Payment not found', 404);
  const payment = payments[0];

  const meta = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata || '{}') : (payment.metadata || {});
  const isTestMode = meta.test_mode === true || (payment.provider_ref || '').startsWith('order_test_');

  if (!isTestMode) {
    // Real payment — verify Razorpay signature
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return apiError('Missing payment verification fields');
    }
    const gws = await query<{ config: string }[]>(
      "SELECT config FROM payment_gateways WHERE provider='razorpay' AND is_enabled=TRUE LIMIT 1"
    );
    const dbConfig = gws.length ? (typeof gws[0].config === 'string' ? JSON.parse(gws[0].config) : gws[0].config) : {};
    const key_secret = dbConfig.key_secret || process.env.RAZORPAY_KEY_SECRET || '';
    if (!key_secret) return apiError('Razorpay not configured', 503);

    const expectedSig = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expectedSig !== razorpay_signature) return apiError('Invalid payment signature', 400);
  }

  const finalPaymentId = razorpay_payment_id || `test_pay_${Date.now()}`;

  // Mark payment completed
  await query(
    "UPDATE payments SET status='completed', provider_ref=? WHERE id=?",
    [finalPaymentId, payment.id]
  );

  // Activate subscription
  const expires = new Date();
  if (payment.billing_cycle === 'monthly') expires.setMonth(expires.getMonth() + 1);
  else if (payment.billing_cycle === 'quarterly') expires.setMonth(expires.getMonth() + 3);
  else if (payment.billing_cycle === 'yearly') expires.setFullYear(expires.getFullYear() + 1);
  else expires.setFullYear(expires.getFullYear() + 100);

  await query(
    'INSERT INTO subscriptions (user_id, plan_id, billing_cycle, status, expires_at, payment_ref, amount_paid) VALUES (?,?,?,?,?,?,?)',
    [user.id, payment.plan_id, payment.billing_cycle, 'active', expires.toISOString(), finalPaymentId, payment.amount]
  );

  await query(
    'UPDATE users SET plan_id=?, plan_expires_at=?, is_org=TRUE WHERE id=?',
    [payment.plan_id, expires.toISOString(), user.id]
  );

  return apiResponse({ message: 'Payment verified and plan activated', expires_at: expires.toISOString() });
});
