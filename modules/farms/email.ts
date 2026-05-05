import { sendEmail } from '@/lib/email';

function resolveAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://poultrymarket.co.ke';
}

export interface FarmInvitationEmailPayload {
  farmName: string;
  inviterName: string;
  invitedEmail: string;
  roleName: string;
  token: string;
  farmId: string;
}

export function generateFarmInvitationEmail(payload: FarmInvitationEmailPayload) {
  const baseUrl = resolveAppUrl().replace(/\/$/, '');
  const acceptUrl = `${baseUrl}/accept-invitation?token=${encodeURIComponent(payload.token)}&farmId=${encodeURIComponent(payload.farmId)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>You've been invited to join ${payload.farmName}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;background:#f4f7fb;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:36px;background:linear-gradient(135deg,#0f766e 0%,#0ea5e9 100%);color:#ffffff;">
                <h1 style="margin:0;font-size:28px;line-height:1.2;">You're invited to join ${payload.farmName}</h1>
                <p style="margin:12px 0 0;font-size:16px;opacity:0.9;">${payload.inviterName} invited you as a ${payload.roleName}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">Hello,</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">You were invited to collaborate on <strong>${payload.farmName}</strong>. Your access level is <strong>${payload.roleName}</strong>, which determines what you can see and manage inside the workspace.</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;">Click the button below to accept the invitation. If you do not have an account yet, you can sign up first and then accept the invite using the same link.</p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${acceptUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;">Accept invitation</a>
                </div>
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;word-break:break-all;">
                  <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Invitation link</p>
                  <p style="margin:0;font-size:14px;color:#0f172a;">${acceptUrl}</p>
                </div>
                <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">This invitation expires in 7 days. If you were not expecting this email, you can safely ignore it.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `You have been invited to join ${payload.farmName}`,
    `Invited by: ${payload.inviterName}`,
    `Role: ${payload.roleName}`,
    `Accept invitation: ${acceptUrl}`,
    'This invitation expires in 7 days.',
  ].join('\n');

  return { html, text, acceptUrl };
}

export async function sendFarmInvitationEmail(payload: FarmInvitationEmailPayload) {
  const email = generateFarmInvitationEmail(payload);

  return sendEmail({
    to: payload.invitedEmail,
    subject: `Invitation to join ${payload.farmName}`,
    html: email.html,
    text: email.text,
  });
}
