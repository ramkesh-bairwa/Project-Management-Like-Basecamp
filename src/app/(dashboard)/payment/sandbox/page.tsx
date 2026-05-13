'use client';
import { useEffect, useState } from 'react';
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

export default function SandboxPaymentPage() {
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f1faee' }}>
      <div className="w-full max-w-md">

        {/* Sandbox badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="px-3 py-1 rounded-full text-xs font-black text-white" style={{ background: '#f4a261' }}>
            🧪 SANDBOX MODE — Test Payments Only
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ border: '1px solid #d0dce8' }}>
          {/* Header */}
          <div className="px-6 py-5" style={{ background: '#1d3557' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: '#e63946' }}>💳</div>
              <div>
                <div className="font-black text-white">Secure Checkout</div>
                <div className="text-xs text-white/50">ProjectHub Sandbox</div>
              </div>
            </div>
          </div>

          {/* Order summary */}
          {info && (
            <div className="px-6 py-4" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-black text-sm" style={{ color: '#1d3557' }}>{info.plan_name} Plan</div>
                  <div className="text-xs capitalize" style={{ color: '#6b7a8d' }}>{info.billing_cycle} billing</div>
                </div>
                <div className="font-black text-lg" style={{ color: '#1d3557' }}>${Number(info.amount).toFixed(2)}</div>
              </div>
              <div className="text-xs mt-1 font-mono" style={{ color: '#94a3b8' }}>Ref: {info.sandbox_ref}</div>
            </div>
          )}

          {step === 'processing' && (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-[#457b9d] border-t-transparent animate-spin mx-auto mb-4" />
              <div className="font-black text-[#1d3557]">Processing Payment...</div>
              <div className="text-sm text-[#6b7a8d] mt-1">Please wait</div>
            </div>
          )}

          {step === 'done' && (
            <div className="px-6 py-16 text-center">
              <div className="text-5xl mb-4">✅</div>
              <div className="font-black text-[#1d3557]">Payment Successful!</div>
              <div className="text-sm text-[#6b7a8d] mt-1">Redirecting...</div>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={pay} className="p-6 space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm font-bold" style={{ background: '#fef2f2', color: '#e63946', border: '1px solid #fecaca' }}>
                  ⚠ {error}
                </div>
              )}

              {/* Test card selector */}
              <div>
                <label className="block text-xs font-black mb-2 uppercase tracking-wide" style={{ color: '#6b7a8d' }}>Test Card</label>
                <div className="space-y-2">
                  {TEST_CARDS.map(tc => (
                    <label key={tc.number} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition"
                      style={{ background: card === tc.number ? '#eff6ff' : '#f8fafc', border: `1.5px solid ${card === tc.number ? '#457b9d' : '#e2e8f0'}` }}>
                      <input type="radio" name="card" value={tc.number} checked={card === tc.number}
                        onChange={() => setCard(tc.number)} className="accent-[#457b9d]" />
                      <div className="flex-1">
                        <div className="text-xs font-black font-mono" style={{ color: '#1d3557' }}>{tc.number}</div>
                        <div className="text-xs" style={{ color: tc.result === 'fail' ? '#e63946' : '#2a9d8f' }}>
                          {tc.brand} — {tc.result === 'fail' ? '❌ Will decline' : '✓ Will succeed'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Card details */}
              <div>
                <label className="block text-xs font-black mb-1.5 uppercase tracking-wide" style={{ color: '#6b7a8d' }}>Cardholder Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1d3557' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black mb-1.5 uppercase tracking-wide" style={{ color: '#6b7a8d' }}>Expiry</label>
                  <input value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="MM/YY" required
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1d3557' }} />
                </div>
                <div>
                  <label className="block text-xs font-black mb-1.5 uppercase tracking-wide" style={{ color: '#6b7a8d' }}>CVV</label>
                  <input value={cvv} onChange={e => setCvv(e.target.value)} placeholder="123" required
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                    style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#1d3557' }} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={processing}
                  className="flex-1 py-3 rounded-xl font-black text-sm text-white hover:opacity-90 disabled:opacity-50 transition"
                  style={{ background: '#e63946' }}>
                  Pay ${info?.amount != null ? Number(info.amount).toFixed(2) : '...'}
                </button>
                <button type="button" onClick={cancel}
                  className="px-4 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
                  style={{ color: '#6b7a8d', border: '1.5px solid #e2e8f0' }}>
                  Cancel
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
                🔒 Sandbox — No real charges
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
