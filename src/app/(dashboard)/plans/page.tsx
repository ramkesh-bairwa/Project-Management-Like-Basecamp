'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: number; name: string; price: number; billing_cycle: string;
  max_projects: number; max_members: number; max_tasks: number;
  max_groups: number; max_storage_gb: number; features: string[];
}
interface Gateway { provider: string; display_name: string; config: Record<string, string> }

const planColors: Record<string, { bg: string; border: string; btn: string; text: string; muted: string; badge?: string }> = {
  Free:       { bg: '#ffffff', border: '#d0dce8', btn: '#2a9d8f', text: '#1d3557', muted: '#6b7a8d' },
  Pro:        { bg: '#1d3557', border: '#1d3557', btn: '#e63946', text: '#ffffff', muted: 'rgba(255,255,255,0.55)', badge: 'Most Popular' },
  Business:   { bg: '#457b9d', border: '#457b9d', btn: '#ffffff', text: '#ffffff', muted: 'rgba(255,255,255,0.55)' },
  Enterprise: { bg: '#152840', border: '#152840', btn: '#e63946', text: '#ffffff', muted: 'rgba(255,255,255,0.4)' },
};

const gatewayIcon: Record<string, string> = { stripe: '💳', razorpay: '🔷', paytm: '🔵', sandbox: '🧪' };

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch('/api/plans').then(r => r.json()).then(d => {
      if (!Array.isArray(d)) return;
      setPlans(d.map((p: Plan & { features: string | string[]; max_tasks?: number; max_groups?: number }) => ({
        ...p,
        price: Number(p.price),
        features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : (p.features || []),
        max_tasks: p.max_tasks ?? -1,
        max_groups: p.max_groups ?? -1,
      })));
    });
    fetch('/api/payment/gateways').then(r => r.json()).then(d => { if (!d.error) setGateway(d); });
  }, []);

  async function activateFreePlan(plan: Plan) {
    setConfirming(true);
    const token = localStorage.getItem('token');
    const res = await fetch('/api/plans/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: plan.id, payment_ref: `FREE-${Date.now()}` }),
    });
    const data = await res.json();
    setConfirming(false);
    if (res.ok) {
      setConfirmPlan(null);
      setSuccess('🎉 Free plan activated! You can now create projects.');
    } else {
      alert(data.error || 'Failed to activate plan. Please try again.');
    }
  }

  async function subscribePaid(plan: Plan) {
    const provider = gateway?.provider || 'sandbox';
    setLoading(plan.id);
    const token = localStorage.getItem('token');

    if (provider === 'sandbox') {
      const res = await fetch('/api/plans/subscribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id, payment_ref: `SANDBOX-${Date.now()}`, gateway: 'sandbox' }),
      });
      const data = await res.json();
      setLoading(null);
      if (res.ok && data.payment_id) router.push(`/payment/sandbox?payment_id=${data.payment_id}`);
      else if (res.ok) setSuccess('Plan activated!');
      return;
    }
    if (provider === 'stripe') {
      const res = await fetch('/api/payment/checkout/stripe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const data = await res.json();
      setLoading(null);
      if (data.url) window.location.href = data.url;
      return;
    }
    if (provider === 'razorpay') {
      router.push(`/payment/razorpay?plan_id=${plan.id}&billing_cycle=monthly`);
      setLoading(null);
      return;
    }
    setLoading(null);
  }

  return (
    <div>
      <div className="text-center mb-8">
        <p className="text-[#6b7a8d]">Choose a plan — Free plan requires no payment or credit card.</p>
      </div>

      {/* Gateway badge — only for paid plans */}
      {gateway && plans.some(p => Number(p.price) > 0) && (
        <div className="flex justify-center mb-6">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 20, background: gateway.provider === 'sandbox' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${gateway.provider === 'sandbox' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
            <span>{gatewayIcon[gateway.provider]}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: gateway.provider === 'sandbox' ? '#92400e' : '#065f46' }}>
              Paid plans via {gateway.display_name}
            </span>
            {gateway.provider === 'sandbox' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 10 }}>TEST MODE</span>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-2xl px-6 py-4 mb-8 text-center font-bold" style={{ background: '#f0fdf9', color: '#0f766e', border: '1.5px solid #99f6e4' }}>
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {plans.map(plan => {
          const isFree = Number(plan.price) === 0;
          const c = planColors[plan.name] || planColors.Free;
          const features = [
            `${plan.max_projects === -1 ? 'Unlimited' : plan.max_projects} projects`,
            `${plan.max_groups === -1 ? 'Unlimited' : plan.max_groups} groups`,
            `${plan.max_tasks === -1 ? 'Unlimited' : plan.max_tasks} tasks`,
            `${plan.max_members === -1 ? 'Unlimited' : plan.max_members} members`,
            `${plan.max_storage_gb}GB storage`,
            ...plan.features,
          ];
          return (
            <div key={plan.id} className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
              style={{ background: c.bg, border: `2px solid ${c.border}`, boxShadow: '0 4px 16px rgba(29,53,87,0.08)' }}>
              {c.badge && (
                <div className="absolute top-4 right-4 text-xs font-black px-2.5 py-1 rounded-full" style={{ background: '#e63946', color: '#fff' }}>{c.badge}</div>
              )}

              {/* Price */}
              <div className="mb-5">
                <div className="text-lg font-black mb-1" style={{ color: c.text }}>{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black" style={{ color: c.text }}>${plan.price}</span>
                  <span className="text-sm mb-1 font-bold" style={{ color: c.muted }}>
                    {isFree ? '/forever' : `/${plan.billing_cycle}`}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: c.muted }}>
                    <span className="text-xs font-black" style={{ color: c.text }}>✓</span> {f}
                  </li>
                ))}
              </ul>

              {/* Button — completely separate for free vs paid */}
              {isFree ? (
                <>
                  <button
                    onClick={() => setConfirmPlan(plan)}
                    className="w-full py-3 rounded-xl font-black text-sm text-white transition hover:opacity-90"
                    style={{ background: '#2a9d8f' }}>
                    Get started free
                  </button>
                  <p className="text-xs text-center mt-2 font-medium" style={{ color: c.muted }}>No credit card required</p>
                </>
              ) : (
                <button
                  onClick={() => subscribePaid(plan)}
                  disabled={loading === plan.id}
                  className="w-full py-3 rounded-xl font-black text-sm transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: c.btn, color: plan.name === 'Business' ? '#457b9d' : '#fff' }}>
                  {loading === plan.id ? 'Processing...' : (
                    <span className="flex items-center justify-center gap-2">
                      {gateway && <span>{gatewayIcon[gateway.provider]}</span>}
                      Pay with {gateway?.display_name || 'Card'}
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl p-6 flex items-start gap-5" style={{ background: '#f1faee', border: '1.5px solid #d0dce8' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#e8f4f8' }}>🏢</div>
        <div>
          <div className="font-black text-[#1d3557] mb-1">Become an Organization</div>
          <div className="text-[#6b7a8d] text-sm leading-relaxed">
            Any paid plan (Pro, Business, or Enterprise) unlocks organization features — create team workspaces, invite members with custom roles, and manage org-wide projects.
          </div>
        </div>
      </div>

      {/* Free plan confirmation modal */}
      {confirmPlan && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ background: 'rgba(15,23,42,0.7)' }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}>
            {/* Header */}
            <div className="px-6 py-5" style={{ background: '#1d3557' }}>
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-black text-white text-xl">Activate Free Plan</div>
              <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>No payment or credit card required</div>
            </div>
            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-sm mb-4 font-medium" style={{ color: '#1d3557' }}>
                You're activating the <strong>Free plan</strong>. Here's what you get:
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  `${confirmPlan.max_projects === -1 ? 'Unlimited' : confirmPlan.max_projects} projects`,
                  `${confirmPlan.max_groups === -1 ? 'Unlimited' : confirmPlan.max_groups} groups`,
                  `${confirmPlan.max_tasks === -1 ? 'Unlimited' : confirmPlan.max_tasks} tasks`,
                  `${confirmPlan.max_members === -1 ? 'Unlimited' : confirmPlan.max_members} members`,
                  `${confirmPlan.max_storage_gb}GB storage`,
                  ...confirmPlan.features,
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#1d3557' }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ background: '#2a9d8f' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs mb-5" style={{ color: '#6b7a8d' }}>
                You can upgrade to a paid plan anytime to unlock higher limits.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => activateFreePlan(confirmPlan)}
                  disabled={confirming}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: '#2a9d8f' }}>
                  {confirming ? 'Activating...' : '✓ Activate Free Plan'}
                </button>
                <button
                  onClick={() => setConfirmPlan(null)}
                  disabled={confirming}
                  className="flex-1 py-3 rounded-xl font-black text-sm transition hover:bg-gray-50"
                  style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
