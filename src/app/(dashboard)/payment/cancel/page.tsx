'use client';
import { useRouter } from 'next/navigation';

export default function PaymentCancelPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="bg-surface rounded-2xl p-10 text-center shadow-2xl max-w-sm w-full" style={{ border: '1px solid var(--border)' }}>
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>Payment Cancelled</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Your payment was cancelled. No charges were made.</p>
        <button onClick={() => router.push('/plans')}
          className="w-full py-3 rounded-xl font-black text-sm text-white hover:opacity-90 transition"
          style={{ background: 'var(--accent)' }}>
          Back to Plans
        </button>
      </div>
    </div>
  );
}
