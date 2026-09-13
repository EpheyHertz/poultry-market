import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { renderCampaignPreview } from '@/lib/email/campaigns';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/blog/email/preview
 * Renders the campaign email exactly as a subscriber would receive it, without
 * writing anything to the database or sending mail. Powers the "Preview" dialog
 * in the admin composer.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));

        const subject = String(body.subject || '').trim();
        const content = String(body.content || '').trim();
        if (!subject || !content) {
            return NextResponse.json(
                { error: 'Add a subject and some content to preview the email.' },
                { status: 400 }
            );
        }

        const preview = renderCampaignPreview({
            subject,
            content,
            previewText: body.previewText ? String(body.previewText) : null,
            ctaLabel: body.ctaLabel ? String(body.ctaLabel) : null,
            ctaUrl: body.ctaUrl ? String(body.ctaUrl) : null,
            imageUrl: body.imageUrl ? String(body.imageUrl) : null,
            recipientName: body.recipientName ? String(body.recipientName) : 'there',
        });

        return NextResponse.json({ preview });
    } catch (error) {
        console.error('Admin campaign preview error:', error);
        return NextResponse.json({ error: 'Failed to render preview' }, { status: 500 });
    }
}
