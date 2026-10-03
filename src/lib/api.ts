import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';
import { isUserApproved, PENDING_APPROVAL_MESSAGE } from '@/lib/verification';

export function withAuth(handler: (req: NextRequest, user: { id: number; email: string; role: string; is_org: boolean }) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Admin-panel tokens carry ids from admin_users, not users, so they skip the check
    if (user.role !== 'admin' && !(await isUserApproved(user.id))) {
      return NextResponse.json({ error: PENDING_APPROVAL_MESSAGE, code: 'ACCOUNT_PENDING' }, { status: 403 });
    }
    return handler(req, user);
  };
}

export function apiResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
