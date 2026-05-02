import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const preferenceSchema = z.object({
  dailyReminder: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  inactivityAlerts: z.boolean().optional(),
  vaccinationAlerts: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preference = await prisma.farmEmailPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    return NextResponse.json({ preference });
  } catch (error) {
    console.error('Farm email preference GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch email preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = preferenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const preference = await prisma.farmEmailPreference.upsert({
      where: { userId: user.id },
      update: parsed.data,
      create: {
        userId: user.id,
        ...parsed.data,
      },
    });

    return NextResponse.json({ preference });
  } catch (error) {
    console.error('Farm email preference PUT error:', error);
    return NextResponse.json({ error: 'Failed to update email preferences' }, { status: 500 });
  }
}
