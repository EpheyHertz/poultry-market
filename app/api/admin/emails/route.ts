import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// Email template generator
function generateAdminEmail({
  recipientName,
  subject,
  content,
  ctaText,
  ctaUrl,
  senderName,
}: {
  recipientName: string;
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  senderName?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poultrymarket.co.ke';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 40px; border-radius: 16px 16px 0 0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                      🐔 PoultryMarket
                    </h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                      Kenya's Premier Poultry Marketplace
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <h2 style="margin: 0 0 24px; color: #1e293b; font-size: 22px; font-weight: 600;">
                Hello ${recipientName} 👋
              </h2>
              
              <div style="color: #475569; font-size: 16px; line-height: 1.7;">
                ${content.split('\n').map(p => `<p style="margin: 0 0 16px;">${p}</p>`).join('')}
              </div>
              
              ${ctaText && ctaUrl ? `
              <table role="presentation" style="margin: 32px 0; border-collapse: collapse;">
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 8px;">
                    <a href="${ctaUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                      ${ctaText} →
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  Best regards,<br>
                  <strong style="color: #1e293b;">${senderName || 'The PoultryMarket Team'}</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px 40px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                      This email was sent from PoultryMarket Admin
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} PoultryMarket. All rights reserved.
                    </p>
                    <p style="margin: 12px 0 0;">
                      <a href="${appUrl}" style="color: #059669; text-decoration: none; font-size: 13px;">Visit PoultryMarket</a>
                      <span style="color: #cbd5e1; margin: 0 8px;">|</span>
                      <a href="${appUrl}/contact" style="color: #059669; text-decoration: none; font-size: 13px;">Contact Support</a>
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

// GET - Fetch users for email targeting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (role && role !== 'all') {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
              products: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Get role counts for stats
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      where: { isActive: true },
      _count: true,
    });

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      roleCounts: roleCounts.reduce((acc, item) => {
        acc[item.role] = typeof item._count === 'number' ? item._count : 0;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Failed to fetch users for email:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Send emails
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type, // 'individual' | 'bulk' | 'role'
      recipients, // Array of user IDs for individual/bulk
      role, // Role for role-based sending
      subject,
      content,
      ctaText,
      ctaUrl,
      senderName,
    } = body;

    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      );
    }

    let targetUsers: { id: string; name: string; email: string }[] = [];

    if (type === 'individual' || type === 'bulk') {
      if (!recipients || recipients.length === 0) {
        return NextResponse.json(
          { error: 'At least one recipient is required' },
          { status: 400 }
        );
      }

      targetUsers = await prisma.user.findMany({
        where: {
          id: { in: recipients },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    } else if (type === 'role') {
      if (!role) {
        return NextResponse.json(
          { error: 'Role is required for role-based emails' },
          { status: 400 }
        );
      }

      targetUsers = await prisma.user.findMany({
        where: {
          role: role,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: 'No valid recipients found' },
        { status: 400 }
      );
    }

    // Send emails in batches to avoid rate limiting
    const batchSize = 10;
    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < targetUsers.length; i += batchSize) {
      const batch = targetUsers.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (user) => {
          try {
            const html = generateAdminEmail({
              recipientName: user.name || 'Valued Customer',
              subject,
              content,
              ctaText,
              ctaUrl,
              senderName,
            });

            const result = await sendEmail({
              to: user.email,
              subject,
              html,
            });

            if (result.success) {
              results.success++;
            } else {
              results.failed++;
              results.errors.push(`Failed to send to ${user.email}`);
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`Error sending to ${user.email}: ${error}`);
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < targetUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Log email campaign for auditing
    console.log(`[EMAIL CAMPAIGN] Type: ${type}, Recipients: ${targetUsers.length}, Success: ${results.success}, Failed: ${results.failed}`);

    return NextResponse.json({
      message: 'Emails sent',
      total: targetUsers.length,
      success: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 5), // Only return first 5 errors
    });
  } catch (error) {
    console.error('Failed to send emails:', error);
    return NextResponse.json(
      { error: 'Failed to send emails' },
      { status: 500 }
    );
  }
}
