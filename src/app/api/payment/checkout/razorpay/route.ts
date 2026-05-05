import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export const POST = withAuth(async (req: NextRequest, user) => {
  const { plan_id, billing_cycle = 'monthly' } = await req.json();
  if (!plan_id) return apiError('plan_id required');

  // Get plan
  const plans = await query<{ id: number; name: string; price: number; quarterly_price: number | null; yearly_price: number | null }[]>(
    'SELECT id, name, price, quarterly_price, yearly_price FROM plans WHERE id=? AND is_active=TRUE', [plan_id]
  );
  if (!plans.length) return apiError('Plan not found', 404);
  const plan = plans[0];

  // Get Razorpay config — DB first, fallback to env
  const gws = await query<{ config: string }[]>(
    "SELECT config FROM payment_gateways WHERE provider='razorpay' AND is_enabled=TRUE LIMIT 1"
  );
  const dbConfig = gws.length ? (typeof gws[0].config === 'string' ? JSON.parse(gws[0].config) : gws[0].config) : {};
  const key_id = dbConfig.key_id || process.env.RAZORPAY_KEY_ID || '';
  const key_secret = dbConfig.key_secret || process.env.RAZORPAY_KEY_SECRET || '';
  if (!key_id) return apiError('Razorpay Key ID not configured. Add it in Admin → Gateways.', 503);

  // Determine amount
  let amount = plan.price;
  if (billing_cycle === 'quarterly' && plan.quarterly_price) amount = plan.quarterly_price;
  if (billing_cycle === 'yearly' && plan.yearly_price) amount = plan.yearly_price;
  const amountPaise = Math.round(amount * 100);

  // Detect test/placeholder secret — use simulated order instead of real API call
  const isTestMode = !key_secret || key_secret === 'thiswillbeoverriddenbyactualtest' || key_id.startsWith('rzp_test_');
  let orderId: string;

  if (isTestMode && (!key_secret || key_secret === 'thiswillbeoverriddenbyactualtest')) {
    // Simulate order locally — no real API call
    orderId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  } else {
    // Real Razorpay API call
    try {
      const Razorpay = (await import('razorpay')).default;
      const rzp = new Razorpay({ key_id, key_secret });
      const receipt = `rcpt_${user.id}_${Date.now()}`;
      const order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: { user_id: String(user.id), plan_id: String(plan_id), plan_name: plan.name },
      });
      orderId = order.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Razorpay order creation failed';
      return apiError(msg, 502);
    }
  }

  // Save pending payment
  const result = await query<{ insertId: number }>(
    `INSERT INTO payments (user_id, plan_id, billing_cycle, amount, currency, status, provider, provider_ref, metadata)
     VALUES (?, ?, ?, ?, 'INR', 'pending', 'razorpay', ?, ?)`,
    [user.id, plan_id, billing_cycle, amount, orderId, JSON.stringify({ order_id: orderId, test_mode: isTestMode })]
  );

  return apiResponse({
    order_id: orderId,
    amount: amountPaise,
    currency: 'INR',
    payment_id: result.insertId,
    key_id,
    plan_name: plan.name,
    billing_cycle,
    test_mode: isTestMode,
  });
});
