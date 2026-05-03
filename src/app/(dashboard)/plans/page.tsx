'use client';
import { useEffect, useState } from 'react';

interface Plan { id: number; name: string; price: number; billing_cycle: string; max_projects: number; max_members: number; max_storage_gb: number; features: string[] }

const planStyle: Record<string, { bg: string; border: string; btnBg: string; btnText: string; textColor: string; mutedColor: string; badge?: string }> = {
  Free:       { bg: '#ffffff',  border: '#d0dce8', btnBg: '#1d3557', btnText: '#fff', textColor: '#1d3557', mutedColor: '#6b7a8d' },
  Pro:        { bg: '#1d3557',  border: '#1d3557', btnBg: '#e63946', btnText: '#fff', textColor: '#ffffff', mutedColor: 'rgba(255,255,255,0.5)', badge: 'Most Popular' },
  Business:   { bg: '#457b9d',  border: '#457b9d', btnBg: '#ffffff', btnText: '#457b9d', textColor: '#ffffff', mutedColor: 'rgba(255,255,255,0.5)' },
  Enterprise: { bg: '#152840',  border: '#152840', btnBg: '#e63946', btnText: '#fff', textColor: '#ffffff', mutedColor: 'rgba(255,255,255,0.4)' },
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<number | null>(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/plans').then(r => r.json()).then(d => {
      setPlans(d.map((p: Plan & { features: string | string[] }) => ({ ...p, features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features })));
    });
  }, []);

  async function subscribe(plan_id: number) {
    setLoading(plan_id);
    const token = localStorage.getItem('token');
    const res = await fetch('/api/plans/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id, payment_ref: `PAY-${Date.now()}` }),
    });
    const data = await res.json();
    setLoading(null);
    if (res.ok) setSuccess(data.is_org ? 'Subscribed! You can now create organizations.' : 'Plan activated!');
  }

  return (
    <div>
      <div className="text-center mb-10">
        <p className="text-[#6b7a8d] mt-2">Start free. Upgrade when your team grows.</p>
      </div>

      {success && (
        <div className="rounded-2xl px-6 py-4 mb-8 text-center font-bold" style={{ background: '#f0fdf9', color: '#0f766e', border: '1.5px solid #99f6e4' }}>{success}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {plans.map(plan => {
          const s = planStyle[plan.name] || planStyle.Free;
          return (
            <div key={plan.id} className="rounded-2xl p-6 flex flex-col relative overflow-hidden"
              style={{ background: s.bg, border: `2px solid ${s.border}`, boxShadow: '0 4px 16px rgba(29,53,87,0.1)' }}>
              {s.badge && (
                <div className="absolute top-4 right-4 text-xs font-black px-2.5 py-1 rounded-full" style={{ background: '#e63946', color: '#fff' }}>{s.badge}</div>
              )}
              <div className="mb-5">
                <div className="text-lg font-black mb-1" style={{ color: s.textColor }}>{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black" style={{ color: s.textColor }}>${plan.price}</span>
                  {plan.price > 0 && <span className="text-sm mb-1" style={{ color: s.mutedColor }}>/{plan.billing_cycle}</span>}
                </div>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {[
                  `${plan.max_projects === -1 ? 'Unlimited' : plan.max_projects} projects`,
                  `${plan.max_members === -1 ? 'Unlimited' : plan.max_members} members`,
                  `${plan.max_storage_gb}GB storage`,
                  ...(Array.isArray(plan.features) ? plan.features : []),
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: s.mutedColor }}>
                    <span className="text-xs font-black" style={{ color: s.textColor }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => subscribe(plan.id)} disabled={loading === plan.id}
                className="w-full py-3 rounded-xl font-black text-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ background: s.btnBg, color: s.btnText }}>
                {loading === plan.id ? 'Processing...' : plan.price === 0 ? 'Get started free' : `Subscribe`}
              </button>
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
    </div>
  );
}
