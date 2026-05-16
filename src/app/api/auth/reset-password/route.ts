import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/api';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/email/mailer';
import { getPasswordResetSuccessTemplate } from '@/lib/email/templates';

interface User {
  id: number;
  email: string;
  name: string;
}

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return apiError('Token and password are required', 400);
    }

    if (password.length < 6) {
      return apiError('Password must be at least 6 characters', 400);
    }

    // Find user with valid reset token
    const users = await query<User[]>(
      'SELECT id, email, name FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );

    if (!users || users.length === 0) {
      return apiError('Invalid or expired reset token', 400);
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Successful - ProjectHub',
        html: getPasswordResetSuccessTemplate(user.name),
      });
      console.log(`Password reset confirmation sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return apiResponse({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    return apiError('Failed to reset password', 500);
  }
}
