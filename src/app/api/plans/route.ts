import { query } from '@/lib/db';
import { apiResponse } from '@/lib/api';

export async function GET() {
  const rows = await query<unknown[]>('SELECT * FROM plans WHERE is_active = TRUE ORDER BY price ASC');
  return apiResponse(rows);
}
