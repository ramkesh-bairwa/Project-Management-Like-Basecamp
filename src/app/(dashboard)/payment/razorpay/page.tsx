'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken } from '@/lib/client-auth';

interface OrderInfo {
  order_id: string; amount: number; currency: string;
  payment_id: number; key_id: string; plan_name: string;
  billing_cycle: string; test_mode: boolean;
}

const TEST_CARDS = [
  { label: 'Visa — Success', number: '4111 1111 1111 1111', expiry: '12/28', cvv: '123', result: 'success' },
  { label: 'Mastercard — Success', number: '5267 3181 8797 5449', expiry: '12/28', cvv: '123', result: 'success' },
  { label: 'Visa — Failure', number: '4000 0000 0000 0002', expiry: '12/28', cvv: '123', result: 'fail' },
];

const TEST_UPI = [
  { vpa: 'success@razorpay', label: 'Always succeeds' },
  { vpa: 'failure@razorpay', label: 'Always fails' },
];

export default function RazorpayCheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get('plan_id');
  const billingCycle = params.get('billing_cycle') || 'monthly';

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'processing' | 'success' | 'failed'>('details');
  const [tab, setTab] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [selectedCard, setSelectedCard] = useState(TEST_CARDS[0]);
  const [selectedUpi, setSelectedUpi] = useState(TEST_UPI[0]);

  useEffect(() => {
    if (!planId) { setError('No plan selected'); setLoading(false); return; }
    const token = getToken();
    fetch('/api/payment/checkout/razorpay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: Number(planId), billing_cycle: billingCycle }),
    })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setOrder(d); })
      .catch(() => setError('Failed to create order'))
      .finally(() => setLoading(false));
  }, [planId, billingCycle]);

  async function confirmPayment(shouldFail = false) {
    if (!order) return;
    setStep('processing');

    if (shouldFail) {
      await new Promise(r => setTimeout(r, 1200));
      setStep('failed');
      return;
    }

    await new Promise(r => setTimeout(r, 1500));

    if (order.test_mode) {
      // Simulated — call webhook directly without real Razorpay response
      const token = getToken();
      const res = await fetch('/api/payment/webhook/razorpay', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: order.payment_id }),
      });
      if (res.ok) { setStep('success'); setTimeout(() => router.push('/payment/success'), 1800); }
      else { setStep('failed'); }
    } else {
      // Real Razorpay modal
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const options = {
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: 'ProjectHub',
          description: `${order.plan_name} Plan`,
          order_id: order.order_id,
          theme: { color: '#6366f1' },
          modal: { ondismiss: () => setStep('details') },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            setStep('processing');
            const token = getToken();
            const res = await fetch('/api/payment/webhook/razorpay', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, payment_id: order.payment_id }),
            });
            if (res.ok) { setStep('success'); setTimeout(() => router.push('/payment/success'), 1800); }
            else { setStep('failed'); }
          },
        };
        // @ts-expect-error Razorpay global
        new window.Razorpay(options).open();
        setStep('details');
      };
      document.body.appendChild(script);
    }
  }

  const amountINR = order ? (order.amount / 100).toFixed(2) : '0.00';

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#3395ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', marginBottom: 8 }}>{error}</div>
        <button onClick={() => router.push('/plans')} style={{ padding: '10px 24px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Back to Plans</button>
      </div>
    </div>
  );

  if (step === 'success') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', maxWidth: 360, width: '100%' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 8 }}>Payment Successful!</div>
        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 4 }}>{order?.plan_name} plan activated</div>
        <div style={{ color: '#94a3b8', fontSize: 12 }}>Redirecting to dashboard...</div>
      </div>
    </div>
  );

  if (step === 'failed') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', maxWidth: 360, width: '100%' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 8 }}>Payment Failed</div>
        <div style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>The payment was declined or failed.</div>
        <button onClick={() => setStep('details')} style={{ padding: '10px 24px', borderRadius: 10, background: '#6366f1', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Try Again</button>
      </div>
    </div>
  );

  if (step === 'processing') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#3395ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>Processing Payment...</div>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>Please wait</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: order?.test_mode ? 'rgba(245,158,11,0.1)' : 'rgba(51,149,255,0.1)', border: `1px solid ${order?.test_mode ? 'rgba(245,158,11,0.25)' : 'rgba(51,149,255,0.25)'}` }}>
            <span style={{ fontSize: 14 }}>🔷</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: order?.test_mode ? '#92400e' : '#1d6fa4' }}>
              Razorpay {order?.test_mode ? 'Test Mode' : 'Live'}
            </span>
            {order?.test_mode && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 10 }}>TEST</span>}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#3395ff,#6366f1)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔷</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Razorpay Checkout</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Secure payment powered by Razorpay</div>
              </div>
            </div>
          </div>

          {/* Order summary */}
          {order && (
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{order.plan_name} Plan</div>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize', marginTop: 2 }}>{order.billing_cycle} billing</div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a' }}>₹{amountINR}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>INR</div>
              </div>
            </div>
          )}

          <div style={{ padding: '20px 24px' }}>

            {/* Test credentials */}
            {order?.test_mode && (
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span>🧪</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>Test Mode — Use test credentials</span>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {(['card', 'upi', 'netbanking'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', textTransform: 'capitalize', background: tab === t ? '#f59e0b' : 'rgba(245,158,11,0.1)', color: tab === t ? '#fff' : '#92400e' }}>
                      {t === 'netbanking' ? 'Net Banking' : t.toUpperCase()}
                    </button>
                  ))}
                </div>

                {tab === 'card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {TEST_CARDS.map(c => (
                      <label key={c.number} onClick={() => setSelectedCard(c)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: selectedCard.number === c.number ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.7)', border: `1px solid ${selectedCard.number === c.number ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.15)'}` }}>
                        <input type="radio" checked={selectedCard.number === c.number} onChange={() => setSelectedCard(c)} style={{ accentColor: '#6366f1' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{c.number}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{c.label} · Exp: {c.expiry} · CVV: {c.cvv}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: c.result === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: c.result === 'success' ? '#10b981' : '#ef4444' }}>
                          {c.result === 'success' ? '✓ Success' : '✗ Fail'}
                        </span>
                      </label>
                    ))}
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>OTP: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>1234</span></div>
                  </div>
                )}

                {tab === 'upi' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {TEST_UPI.map(u => (
                      <label key={u.vpa} onClick={() => setSelectedUpi(u)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: selectedUpi.vpa === u.vpa ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.7)', border: `1px solid ${selectedUpi.vpa === u.vpa ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.15)'}` }}>
                        <input type="radio" checked={selectedUpi.vpa === u.vpa} onChange={() => setSelectedUpi(u)} style={{ accentColor: '#6366f1' }} />
                        <div>
                          <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{u.vpa}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{u.label}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {tab === 'netbanking' && (
                  <div style={{ fontSize: 12, color: '#64748b', padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: 8 }}>
                    🏦 Select any bank in the Razorpay modal → use any test credentials to complete
                  </div>
                )}
              </div>
            )}

            {/* Pay buttons */}
            {order?.test_mode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => confirmPayment(selectedCard.result === 'fail' && tab === 'card')}
                  style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#3395ff,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <span>🔷</span>
                  {tab === 'card' && selectedCard.result === 'fail' ? 'Simulate Failed Payment' : `Pay ₹${amountINR} (Test)`}
                </button>
                {tab === 'card' && selectedCard.result !== 'fail' && (
                  <button onClick={() => confirmPayment(true)}
                    style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 600, fontSize: 13, border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                    Simulate Failed Payment
                  </button>
                )}
              </div>
            ) : (
              <button onClick={() => confirmPayment(false)}
                style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#3395ff,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span>🔷</span>
                Pay ₹{amountINR} with Razorpay
              </button>
            )}

            <button onClick={() => router.push('/plans')}
              style={{ width: '100%', padding: '10px', borderRadius: 12, background: 'transparent', color: '#94a3b8', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', marginTop: 8 }}>
              ← Back to Plans
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
              <span style={{ fontSize: 12 }}>🔒</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>256-bit SSL encrypted · Powered by Razorpay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
