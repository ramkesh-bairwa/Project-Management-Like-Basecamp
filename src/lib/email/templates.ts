export function getPasswordResetEmailTemplate(name: string, resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
          
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 32px;">🔒</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">Password Reset Request</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi <strong>${name}</strong>,
              </p>
              
              <p style="margin: 0 0 24px; color: #64748b; font-size: 15px; line-height: 1.6;">
                We received a request to reset your password for your ProjectHub account. Click the button below to create a new password:
              </p>

              <!-- Reset Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 16px; color: #64748b; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; word-break: break-all;">
                <a href="${resetLink}" style="color: #667eea; text-decoration: none; font-size: 13px;">${resetLink}</a>
              </div>

              <!-- Security Notice -->
              <div style="margin-top: 32px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                </p>
              </div>

              <p style="margin: 32px 0 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                Thanks,<br>
                <strong style="color: #64748b;">The ProjectHub Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} ProjectHub. All rights reserved.
                    </p>
                    <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                      This is an automated email. Please do not reply.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function getPasswordResetSuccessTemplate(name: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">
          
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 32px;">✅</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">Password Reset Successful</h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi <strong>${name}</strong>,
              </p>
              
              <p style="margin: 0 0 24px; color: #64748b; font-size: 15px; line-height: 1.6;">
                Your password has been successfully reset. You can now log in to your ProjectHub account with your new password.
              </p>

              <div style="margin: 24px 0; padding: 16px; background-color: #dcfce7; border-left: 4px solid #10b981; border-radius: 8px;">
                <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.5;">
                  <strong>🔐 Security Tip:</strong> If you didn't make this change, please contact our support team immediately.
                </p>
              </div>

              <p style="margin: 32px 0 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                Thanks,<br>
                <strong style="color: #64748b;">The ProjectHub Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} ProjectHub. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
