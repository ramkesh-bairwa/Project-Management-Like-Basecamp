'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken } from '@/lib/client-auth';

interface PaymentInfo {
  id: number; plan_name: string; billing_cycle: string;
  amount: number | string; sandbox_ref: string; status: string;
}

// Fake card numbers for sandbox testing
const TEST_CARDS = [
  { number: '4242 4242 4242 4242', brand: 'Visa', result: 'success' },
  { number: '4000 0000 0000 0002', brand: 'Visa (Declined)', result: 'fail' },
  { number: '5555 5555 5555 4444', brand: 'Mastercard', result: 'success' },
];

function SandboxPaymentPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const paymentId = params.get('payment_id');
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [name, setName] = useState('Test User');
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'done'>('form');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentId) return;
    const t = getToken();
    fetch(`/api/payment/info?payment_id=${paymentId}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => d.id && setInfo(d));
  }, [paymentId]);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);
    setStep('processing');
    const selectedCard = TEST_CARDS.find(c => c.number === card);

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 2000));

    if (selectedCard?.result === 'fail') {
      setError('Card declined. Please use a different card.');
      setStep('form');
      setProcessing(false);
      return;
    }

    const t = getToken();
    const res = await fetch('/api/payment/webhook/sandbox', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: Number(paymentId), action: 'confirm' }),
    });

    setProcessing(false);
    if (res.ok) {
      setStep('done');
      setTimeout(() => router.push('/payment/success'), 1500);
    } else {
      setError('Payment failed. Please try again.');
      setStep('form');
    }
  }

  async function cancel() {
    const t = getToken();
    await fetch('/api/payment/webhook/sandbox', {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: Number(paymentId), action: 'cancel' }),
    });
    router.push('/payment/cancel');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">

        {/* Sandbox badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-black text-white" style={{ background: '#f59e0b' }}>
            🧪 SANDBOX MODE — Test Payments Only
          </span>
        </div>

        <div className="bg-surface rounded-2xl shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {/* Header */}
          <div className="px-6 py-5" style={{ background: 'var(--primary)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--accent)' }}>💳</div>
              <div>
                <div className="font-black text-white">Secure Checkout</div>
                <div className="text-xs text-white/50">ProjectHub Sandbox</div>
              </div>
            </div>
          </div>

          {/* Order summary */}
          {info && (
            <div className="px-6 py-4" style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black text-sm" style={{ color: 'var(--text)' }}>{info.plan_name} Plan</div>
                  <div className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{info.billing_cycle} billing</div>
                </div>
                <div className="font-black text-lg" style={{ color: 'var(--text)' }}>${Number(info.amount).toFixed(2)}</div>
              </div>
              <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-subtle)' }}>Ref: {info.sandbox_ref}</div>
            </div>
          )}

          {step === 'processing' && (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[var(--link)] border-t-transparent animate-spin mx-auto mb-4" />
              <div className="font-black text-[var(--text)]">Processing Payment...</div>
              <div className="text-sm text-[var(--text-muted)] mt-1">Please wait</div>
            </div>
          )}

          {step === 'done' && (
            <div className="px-6 py-16 text-center">
              <div className="text-5xl mb-4">✅</div>
              <div className="font-black text-[var(--text)]">Payment Successful!</div>
              <div className="text-sm text-[var(--text-muted)] mt-1">Redirecting...</div>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={pay} className="p-6 space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm font-bold" style={{ background: 'var(--danger-soft)', color: 'var(--accent)', border: '1px solid var(--danger-soft)' }}>
                  ⚠ {error}
                </div>
              )}

              {/* Test card selector */}
              <div>
                <label className="block text-xs font-black mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Test Card</label>
                <div className="space-y-2">
                  {TEST_CARDS.map(tc => (
                    <label key={tc.number} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition"
                      style={{ background: card === tc.number ? 'var(--info-soft)' : 'var(--surface-2)', border: `1.5px solid ${card === tc.number ? 'var(--link)' : 'var(--border)'}` }}>
                      <input type="radio" name="card" value={tc.number} checked={card === tc.number}
                        onChange={() => setCard(tc.number)} className="accent-[#6366f1]" />
                      <div className="flex-1">
                        <div className="text-xs font-black font-mono" style={{ color: 'var(--text)' }}>{tc.number}</div>
                        <div className="text-xs" style={{ color: tc.result === 'fail' ? 'var(--accent)' : 'var(--success)' }}>
                          {tc.brand} — {tc.result === 'fail' ? '❌ Will decline' : '✓ Will succeed'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Card details */}
              <div>
                <label className="block text-xs font-black mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Cardholder Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Expiry</label>
                  <input value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="MM/YY" required
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>CVV</label>
                  <input value={cvv} onChange={e => setCvv(e.target.value)} placeholder="123" required
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={processing}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white hover:opacity-90 disabled:opacity-50 transition"
                  style={{ background: 'var(--accent)' }}>
                  Pay ${info?.amount != null ? Number(info.amount).toFixed(2) : '...'}
                </button>
                <button type="button" onClick={cancel}
                  className="px-4 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                  style={{ color: 'var(--text-muted)', border: '1.5px solid var(--border)' }}>
                  Cancel
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
                🔒 Sandbox — No real charges
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SandboxPaymentPage() {
  return (
    <Suspense fallback={null}>
      <SandboxPaymentPageContent />
    </Suspense>
  );
}
