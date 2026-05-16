import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/api';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/lib/email/mailer';
import { getPasswordResetSuccessTemplate } from '@/lib/email/templates';

interface User {
  id: number;
  email: string;
  name: string;
  password: string;
}

interface JWTPayload {
  id: number;
  email: string;
}

export async function POST(req: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return apiError('Unauthorized', 401);
    }

    // Verify token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JWTPayload;
    } catch (error) {
      return apiError('Invalid token', 401);
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return apiError('Current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return apiError('New password must be at least 6 characters', 400);
    }

    // Get user from database
    const users = await query<User[]>(
      'SELECT id, email, name, password FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!users || users.length === 0) {
      return apiError('User not found', 404);
    }

    const user = users[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return apiError('Current password is incorrect', 400);
    }

    // Check if new password is same as current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return apiError('New password must be different from current password', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, user.id]
    );

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Changed Successfully - ProjectHub',
        html: getPasswordResetSuccessTemplate(user.name),
      });
      console.log(`Password change confirmation sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return apiResponse({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return apiError('Failed to change password', 500);
  }
}
