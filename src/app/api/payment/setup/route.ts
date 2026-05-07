import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-migrate-secret');
  if (secret !== 'run-migration-now') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const conn = await pool.getConnection();
  const results: string[] = [];

  try {
    // Create table if not exists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS payment_gateways (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT FALSE,
        is_enabled BOOLEAN DEFAULT TRUE,
        config JSON DEFAULT ('{}'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    results.push('✓ payment_gateways table ready');

    // Seed gateways
    const gateways = [
      { provider: 'sandbox',  display_name: 'Sandbox (Test Mode)', is_active: true,  is_enabled: true  },
      { provider: 'stripe',   display_name: 'Stripe',              is_active: false, is_enabled: false },
      { provider: 'razorpay', display_name: 'Razorpay',            is_active: false, is_enabled: false },
    ];

    for (const gw of gateways) {
      await conn.execute(
        `INSERT INTO payment_gateways (provider, display_name, is_active, is_enabled, config)
         VALUES (?, ?, ?, ?, '{}')
         ON DUPLICATE KEY UPDATE display_name=VALUES(display_name)`,
        [gw.provider, gw.display_name, gw.is_active, gw.is_enabled]
      );
      results.push(`✓ Gateway seeded: ${gw.provider}${gw.is_active ? ' (ACTIVE)' : ''}`);
    }

    // Create payments table if not exists
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        billing_cycle ENUM('monthly','quarterly','yearly','lifetime') DEFAULT 'monthly',
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        status ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
        provider ENUM('stripe','razorpay','sandbox') DEFAULT 'sandbox',
        provider_ref VARCHAR(255),
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
      )
    `);
    results.push('✓ payments table ready');

  } catch (err) {
    results.push(`✗ Error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    conn.release();
  }

  return NextResponse.json({ results });
}
