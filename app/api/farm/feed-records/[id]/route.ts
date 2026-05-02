import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { feedRecordUpdateSchema } from '@/modules/eggs/schemas';

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const record = await prisma.feedRecord.findFirst({
      where: { id, userId: user.id },
      include: {
        flock: {
          select: { id: true, name: true },
        },
        attachments: true,
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Feed record GET by id error:', error);
    return NextResponse.json({ error: 'Failed to fetch feed record' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = feedRecordUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.flockId) {
      const flock = await prisma.flock.findFirst({
        where: { id: parsed.data.flockId, userId: user.id },
      });

      if (!flock) {
        return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
      }
    }

    const existing = await prisma.feedRecord.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const record = await prisma.feedRecord.update({
      where: { id },
      data: {
        ...(parsed.data.flockId !== undefined ? { flockId: parsed.data.flockId || null } : {}),
        ...(parsed.data.recordedOn ? { recordedOn: new Date(parsed.data.recordedOn) } : {}),
        ...(parsed.data.feedType !== undefined ? { feedType: parsed.data.feedType } : {}),
        ...(parsed.data.quantityKg !== undefined ? { quantityKg: parsed.data.quantityKg } : {}),
        ...(parsed.data.cost !== undefined ? { cost: parsed.data.cost || null } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
      },
      include: {
        flock: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Feed record PUT error:', error);
    return NextResponse.json({ error: 'Failed to update feed record' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await prisma.feedRecord.deleteMany({
      where: { id, userId: user.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feed record DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete feed record' }, { status: 500 });
  }
}
