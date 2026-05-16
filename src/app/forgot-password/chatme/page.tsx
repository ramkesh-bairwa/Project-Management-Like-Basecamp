'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordChatMe() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        alert('Failed to send reset email');
      }
    } catch (error) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl mb-6">💬</div>
            <h1 className="text-5xl font-black mb-4">ChatMe</h1>
            <p className="text-xl text-white/80 mb-8">Reset your password to get back to chatting</p>
          </div>
          <div className="space-y-4">
            {['🔒 Secure password reset', '📧 Email verification', '⚡ Quick recovery'].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">{feature.split(' ')[0]}</div>
                <span className="font-medium">{feature.substring(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Forgot Password</h2>
            <p className="text-gray-600">Enter your email to receive a reset link</p>
          </div>

          {sent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-lg font-bold text-green-900 mb-2">Check your email!</h3>
              <p className="text-sm text-green-700 mb-4">We've sent a password reset link to <strong>{email}</strong></p>
              <Link href="/login/chatme" className="text-sm font-bold text-purple-600 hover:underline">Back to login</Link>
            </div>
          ) : loading ? (
            <div className="text-center py-12">
              <div className="inline-block relative">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Sending reset link...</p>
              <p className="mt-2 text-sm text-gray-500">Please wait while we send the email</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <div className="text-center">
                <Link href="/login/chatme" className="text-sm font-bold text-purple-600 hover:underline">
                  ← Back to login
                </Link>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Need Projects access?{' '}
              <Link href="/forgot-password/projects" className="font-bold text-red-600 hover:underline">
                Reset Projects password
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
