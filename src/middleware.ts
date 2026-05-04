import { NextRequest, NextResponse } from 'next/server';

// Auth is handled by server.js — this middleware just passes everything through
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
