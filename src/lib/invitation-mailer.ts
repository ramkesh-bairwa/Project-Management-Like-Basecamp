import nodemailer from 'nodemailer';
import { query } from '@/lib/db';

type SmtpSettings = {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  site_name: string;
  primary_color: string;
  accent_color: string;
  logo_letter: string;
  site_logo_url: string;
};

async function getSmtpSettings(): Promise<SmtpSettings> {
  const rows = await query<{ key: string; value: string }[]>(
    "SELECT `key`, value FROM site_settings WHERE `key` IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from','site_name','primary_color','accent_color','logo_letter','site_logo_url')"
  );
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;
  return {
    smtp_host: s.smtp_host || '',
    smtp_port: s.smtp_port || '587',
    smtp_user: s.smtp_user || '',
    smtp_pass: s.smtp_pass || '',
    smtp_from: s.smtp_from || s.smtp_user || 'noreply@example.com',
    site_name: s.site_name || 'ProjectHub',
    primary_color: s.primary_color || '#1d3557',
    accent_color: s.accent_color || '#e63946',
    logo_letter: s.logo_letter || 'P',
    site_logo_url: s.site_logo_url || '',
  };
}

function emailLayout(cfg: SmtpSettings, content: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const year = new Date().getFullYear();

  const logoHtml = cfg.site_logo_url
    ? `<img src="${cfg.site_logo_url}" alt="${cfg.site_name}" style="height:36px;width:auto;display:block;" />`
    : `<div style="display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;background:${cfg.accent_color};color:#ffffff;font-size:16px;font-weight:900;font-family:sans-serif;">${cfg.logo_letter}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${cfg.site_name}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    ${logoHtml}
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:20px;font-weight:900;color:${cfg.primary_color};letter-spacing:-0.3px;">${cfg.site_name}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Card top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:5px;background:linear-gradient(90deg,${cfg.primary_color},${cfg.accent_color});font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:40px 40px 36px;">
                    ${content}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
                © ${year} ${cfg.site_name}. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#cbd5e1;">
                <a href="${appUrl}" style="color:#94a3b8;text-decoration:none;">${appUrl.replace(/https?:\/\//, '')}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function createTransporter(cfg: SmtpSettings) {
  if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_pass) {
    throw new Error('SMTP not configured. Please set SMTP credentials in Admin → Settings.');
  }
  const port = Number(cfg.smtp_port);
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port,
    secure: port === 465,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendProjectInvitationEmail(
  toEmail: string,
  inviterEmail: string,
  projectName: string,
  loginLink: string,
  registerLink: string
) {
  const cfg = await getSmtpSettings();

  const content = `
    <!-- Icon -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,${cfg.primary_color}18,${cfg.accent_color}18);display:inline-flex;align-items:center;justify-content:center;font-size:30px;line-height:64px;text-align:center;">🚀</div>
        </td>
      </tr>
    </table>

    <!-- Heading -->
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${cfg.primary_color};text-align:center;letter-spacing:-0.5px;">
      You're Invited!
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#64748b;text-align:center;line-height:1.6;">
      Hi there! 👋<br/>
      <strong style="color:${cfg.accent_color};">${inviterEmail}</strong> has invited you to collaborate on:
    </p>

    <!-- Project Box -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:${cfg.primary_color}08;border-left:4px solid ${cfg.accent_color};padding:16px 20px;border-radius:8px;">
          <div style="font-size:18px;font-weight:700;color:${cfg.primary_color};margin-bottom:4px;">📋 ${projectName}</div>
          <div style="font-size:14px;color:#6b7a8d;">Join the team and start collaborating!</div>
        </td>
      </tr>
    </table>

    <!-- Button -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding-bottom:16px;">
          <a href="${registerLink}"
            style="display:inline-block;background:${cfg.accent_color};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.2px;">
            ✨ Create Account & Join Project
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-align:center;">Already have an account?</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <a href="${loginLink}"
            style="display:inline-block;background:#f1f5f9;color:${cfg.primary_color};font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px;border:2px solid #e2e8f0;">
            🔐 Sign In
          </a>
        </td>
      </tr>
    </table>

    <!-- Features -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr>
        <td>
          <div style="font-size:14px;font-weight:700;color:${cfg.primary_color};margin-bottom:12px;">What you can do:</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7a8d;">
                <span style="color:#2a9d8f;font-weight:700;">✓</span> Manage tasks and track progress
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7a8d;">
                <span style="color:#2a9d8f;font-weight:700;">✓</span> Collaborate with team members
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7a8d;">
                <span style="color:#2a9d8f;font-weight:700;">✓</span> Share documents and files
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7a8d;">
                <span style="color:#2a9d8f;font-weight:700;">✓</span> Real-time chat and updates
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Warning -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:#fff7ed;border-radius:10px;padding:14px 16px;border-left:3px solid #f97316;">
          <p style="margin:0;font-size:12px;color:#92400e;line-height:1.5;">
            ⏱ This invitation expires in <strong>7 days</strong>. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </td>
      </tr>
    </table>
  `;

  const transporter = await createTransporter(cfg);
  await transporter.sendMail({
    from: `"${cfg.site_name}" <${cfg.smtp_from}>`,
    to: toEmail,
    subject: `${inviterEmail} invited you to join "${projectName}" — ${cfg.site_name}`,
    html: emailLayout(cfg, content),
  });
}
