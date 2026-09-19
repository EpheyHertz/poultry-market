import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isValidEmail, normalizeEmail, normalizeName } from '@/lib/email/address';
import { sendMail } from '@/lib/email/client';
import { renderCampaignEmail } from '@/lib/email/templates';
import { absoluteUrl } from '@/lib/email/config';
import { getEmailSettings } from '@/lib/email/settings';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const rawEmail = String(body.to || '').trim();
        const email = normalizeEmail(rawEmail);

        if (!isValidEmail(email)) {
            return NextResponse.json({ error: 'Please enter a valid recipient email address.' }, { status: 400 });
        }

        const subject = String(body.subject || '').trim();
        const content = String(body.content || '').trim();

        if (!subject || !content) {
            return NextResponse.json({ error: 'Subject and content are required.' }, { status: 400 });
        }

        const recipientName = normalizeName(body.name) || 'there';
        const settings = await getEmailSettings();

        const rendered = renderCampaignEmail({
            name: recipientName,
            subject,
            content,
            previewText: body.previewText ? String(body.previewText).trim() : undefined,
            ctaLabel: body.ctaLabel ? String(body.ctaLabel).trim() : undefined,
            ctaUrl: body.ctaUrl ? String(body.ctaUrl).trim() : undefined,
            imageUrl: body.imageUrl ? String(body.imageUrl).trim() : undefined,
            manageUrl: absoluteUrl('/newsletter/preferences'),
            unsubscribeUrl: absoluteUrl('/newsletter/preferences?action=unsubscribe'),
        });

        const result = await sendMail({
            to: email,
            subject,
            html: rendered.html,
            text: rendered.text,
            account: settings.defaultSenderAccount,
            senderName: body.senderName || settings.defaultSenderName,
        });

        if (!result.success) {
            return NextResponse.json({
                error: result.error || 'Failed to dispatch email to recipient.',
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Email successfully delivered to ${email}`,
            messageId: result.messageId,
        });
    } catch (error) {
        console.error('Send direct email error:', error);
        return NextResponse.json({ error: 'Failed to send direct email' }, { status: 500 });
    }
}
