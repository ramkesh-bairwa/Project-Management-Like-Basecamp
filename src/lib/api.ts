import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest } from '@/lib/auth';

export function withAuth(handler: (req: NextRequest, user: { id: number; email: string; role: string; is_org: boolean }) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return handler(req, user);
  };
}

export function apiResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
