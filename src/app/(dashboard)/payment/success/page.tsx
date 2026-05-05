'use client';
import { useRouter } from 'next/navigation';

export default function PaymentSuccessPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f1faee' }}>
      <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm w-full" style={{ border: '1px solid #d0dce8' }}>
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: '#1d3557' }}>Payment Successful!</h1>
        <p className="text-sm mb-6" style={{ color: '#6b7a8d' }}>Your plan has been activated. You can now enjoy all the features.</p>
        <button onClick={() => router.push('/dashboard')}
          className="w-full py-3 rounded-xl font-black text-sm text-white hover:opacity-90 transition"
          style={{ background: '#2a9d8f' }}>
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}
