import { query } from '@/lib/db';
import { apiResponse, apiError } from '@/lib/api';

export async function GET() {
  const rows = await query<{ provider: string; display_name: string; config: string }[]>(
    'SELECT provider, display_name, config FROM payment_gateways WHERE is_active=TRUE AND is_enabled=TRUE LIMIT 1'
  );
  if (!rows.length) return apiError('No active payment gateway', 503);

  const gw = rows[0];
  const config = typeof gw.config === 'string' ? JSON.parse(gw.config) : gw.config;

  // Only expose public/safe keys to frontend
  const publicConfig: Record<string, string> = {};
  if (gw.provider === 'stripe') publicConfig.publishable_key = config.publishable_key || '';
  if (gw.provider === 'razorpay') publicConfig.key_id = config.key_id || '';
  if (gw.provider === 'paytm') {
    publicConfig.merchant_id = config.merchant_id || '';
    publicConfig.website = config.website || '';
    publicConfig.channel_id = config.channel_id || '';
    publicConfig.industry_type = config.industry_type || '';
  }

  return apiResponse({ provider: gw.provider, display_name: gw.display_name, config: publicConfig });
}
