import { apiResponse } from '@/lib/api';

export async function POST() {
  const res = apiResponse({ message: 'Logged out' });
  res.cookies.set('token', '', { maxAge: 0 });
  return res;
}
