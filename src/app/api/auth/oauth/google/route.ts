import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${base}/api/auth/oauth/callback/google`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account consent',
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
