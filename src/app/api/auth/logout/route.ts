import { NextResponse } from 'next/server';
import { apiResponse } from '@/lib/api';

export async function POST() {
  const res = apiResponse({ message: 'Logged out' });
  res.cookies.set('token', '', { maxAge: 0 });
  return res;
}

export async function GET() {
  const res = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  res.cookies.set('token', '', { maxAge: 0 });
  return res;
}
