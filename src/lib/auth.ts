import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const SECRET = process.env.JWT_SECRET || 'fallback_secret';

export interface JWTPayload {
  id: number;
  email: string;
  role: string;
  is_org: boolean;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, SECRET) as JWTPayload;
}

export function getTokenFromRequest(req: NextRequest): JWTPayload | null {
  try {
    const auth = req.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : req.cookies.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}
