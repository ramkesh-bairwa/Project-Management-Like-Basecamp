import { query } from '@/lib/db';

function toSqlDate(d: Date) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

// NULL = never expires (free/lifetime plans)
export function planExpiry(billingCycle: string | null | undefined, isFree = false): string | null {
  if (isFree) return null;
  const expires = new Date();
  if (billingCycle === 'monthly') expires.setMonth(expires.getMonth() + 1);
  else if (billingCycle === 'quarterly') expires.setMonth(expires.getMonth() + 3);
  else if (billingCycle === 'yearly') expires.setFullYear(expires.getFullYear() + 1);
  else return null;
  return toSqlDate(expires);
}

// Makes planId the user's one active plan: closes their previous active
// subscriptions, records the new one, and points users.plan_id at it.
export async function activatePlan(opts: {
  userId: number;
  planId: number;
  billingCycle: string;
  expiresAt: string | null;
  paymentRef: string;
  amount: number;
  orgId?: number | null;
  makeOrg?: boolean;
}) {
  const { userId, planId, billingCycle, expiresAt, paymentRef, amount, orgId = null, makeOrg = true } = opts;

  await query(
    "UPDATE subscriptions SET status='expired' WHERE user_id=? AND status='active'",
    [userId]
  );
  await query(
    `INSERT INTO subscriptions (user_id, org_id, plan_id, billing_cycle, status, expires_at, payment_ref, amount_paid)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
    [userId, orgId, planId, billingCycle, expiresAt, paymentRef, amount]
  );
  await query(
    makeOrg
      ? 'UPDATE users SET plan_id=?, plan_expires_at=?, is_org=TRUE WHERE id=?'
      : 'UPDATE users SET plan_id=?, plan_expires_at=? WHERE id=?',
    [planId, expiresAt, userId]
  );
  if (orgId) {
    await query(
      'UPDATE organizations SET plan_id=?, plan_expires_at=? WHERE id=? AND owner_id=?',
      [planId, expiresAt, orgId, userId]
    );
  }
}
