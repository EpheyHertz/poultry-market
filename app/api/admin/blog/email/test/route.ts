import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendCampaignTest } from '@/lib/email/campaigns';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const { to, subject, content, previewText, ctaLabel, ctaUrl, imageUrl, senderName } = body;

        if (!to || typeof to !== 'string') {
            return NextResponse.json({ error: 'Recipient address (to) is required.' }, { status: 400 });
        }
        if (!subject || typeof subject !== 'string') {
            return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
        }
        if (!content || typeof content !== 'string') {
            return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
        }

        const result = await sendCampaignTest({
            to,
            subject,
            content,
            previewText,
            ctaLabel,
            ctaUrl,
            imageUrl,
            senderName,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Test email failed to send.' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Test email sent to ${to}`,
        });
    } catch (error) {
        console.error('Test campaign send error:', error);
        return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
    }
}
