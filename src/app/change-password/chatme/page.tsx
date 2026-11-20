'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthShell, {
  Alert, AuthHeading, Icon, PasswordField, StatusIcon, StrengthMeter, SubmitButton,
  type BrandContent,
} from '@/components/auth/AuthShell';

const brand: BrandContent = {
  eyebrow: 'ChatMe · Security',
  title: <>Keep your account<br /><span className="text-gradient">secure.</span></>,
  subtitle: 'A strong, unique password is the simplest way to protect your conversations and your team.',
  preview: 'security',
  features: ['Secure password encryption', 'Instant password update', 'Email confirmation', 'No downtime for your team'],
};

export default function ChangePasswordChatMe() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/chatme'), 2000);
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell brand={brand} productName="ChatMe">
      <Link href="/chatme" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-fg transition">
        <Icon.ArrowLeft size={15} />Back to ChatMe
      </Link>

      {success ? (
        <div className="text-center">
          <StatusIcon tone="success"><Icon.CheckCircle size={30} /></StatusIcon>
          <h1 className="font-display text-[1.6rem] font-extrabold text-fg">Password Changed!</h1>
          <p className="mt-3 text-[14.5px] text-muted">Your password has been updated successfully</p>
          <p className="mt-2 text-[12.5px] text-subtle">Redirecting to ChatMe...</p>
        </div>
      ) : (
        <>
          <AuthHeading title="Change Password" subtitle="Update your ChatMe account password." />

          {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PasswordField
              label="Current Password" icon={<Icon.Key size={17} />}
              show={showCurrent} onToggleShow={() => setShowCurrent(!showCurrent)}
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password" required autoComplete="current-password"
            />
            <div>
              <PasswordField
                label="New Password" show={showNew} onToggleShow={() => setShowNew(!showNew)}
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password" required autoComplete="new-password"
                hint="Minimum 6 characters"
              />
              <StrengthMeter password={newPassword} />
            </div>
            <PasswordField
              label="Confirm New Password" show={showConfirm} onToggleShow={() => setShowConfirm(!showConfirm)}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password" required autoComplete="new-password"
            />
            <SubmitButton loading={loading} loadingText="Updating Password..." className="mt-2">Change Password</SubmitButton>
          </form>
        </>
      )}

      <div className="mt-8 pt-6 border-t border-line text-center text-[13px] text-muted">
        Need Projects access?{' '}
        <Link href="/change-password/projects" className="font-semibold text-primary-text hover:underline underline-offset-4">Change Projects password</Link>
      </div>
    </AuthShell>
  );
}
