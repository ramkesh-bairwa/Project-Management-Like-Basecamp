import { NextRequest } from 'next/server';
import { withAuth, apiResponse, apiError } from '@/lib/api';
import { sendTestEmail } from '@/lib/mailer';

export const POST = withAuth(async (req: NextRequest, user) => {
  if (user.role !== 'admin') return apiError('Admin only', 403);
  const { to } = await req.json();
  if (!to) return apiError('Recipient email required');

  try {
    await sendTestEmail(to);
    return apiResponse({ message: `Test email sent to ${to}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send';
    return apiError(msg);
  }
});
