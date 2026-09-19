import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getEmailSettings, updateEmailSettings } from '@/lib/email/settings';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const settings = await getEmailSettings({ fresh: true });
        return NextResponse.json({ settings });
    } catch (error) {
        console.error('Failed to get email settings:', error);
        return NextResponse.json({ error: 'Failed to load email settings' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const updated = await updateEmailSettings(body, user.id);

        return NextResponse.json({
            settings: updated,
            message: 'Email settings saved successfully',
        });
    } catch (error) {
        console.error('Failed to update email settings:', error);
        return NextResponse.json({ error: 'Failed to save email settings' }, { status: 500 });
    }
}
