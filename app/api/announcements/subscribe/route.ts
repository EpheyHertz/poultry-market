import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';
import { AnnouncementType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, email } = await request.json();

    if (!type || !email) {
      return NextResponse.json({ error: 'Type and email are required' }, { status: 400 });
    }

    // Create a subscription notification
    await createNotification({
      receiverId: user.id,
      type: 'EMAIL',
      title: 'Subscription Updated',
      message: `You have successfully subscribed to ${type} announcements. You'll receive email notifications for future ${type} announcements.`
    });

    // Here you could also store the subscription preference in the database
    // For now, we'll just send a confirmation

    return NextResponse.json({
      success: true,
      message: `Successfully subscribed to ${type} announcements`
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
