import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { eggRecordUpdateSchema } from '@/modules/eggs/schemas';

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

    const record = await prisma.eggRecord.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        flock: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: true,
      },
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Egg record GET by id error:', error);
    return NextResponse.json({ error: 'Failed to fetch egg record' }, { status: 500 });
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
    const parsed = eggRecordUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.flockId) {
      const flock = await prisma.flock.findFirst({
        where: {
          id: parsed.data.flockId,
          userId: user.id,
        },
      });

      if (!flock) {
        return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
      }
    }

    const existing = await prisma.eggRecord.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const updated = await prisma.eggRecord.update({
      where: { id },
      data: {
        ...(parsed.data.flockId !== undefined ? { flockId: parsed.data.flockId || null } : {}),
        ...(parsed.data.recordedOn ? { recordedOn: new Date(parsed.data.recordedOn) } : {}),
        ...(parsed.data.quantity !== undefined ? { quantity: parsed.data.quantity } : {}),
        ...(parsed.data.damagedCount !== undefined ? { damagedCount: parsed.data.damagedCount } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
      },
      include: {
        flock: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ record: updated });
  } catch (error) {
    console.error('Egg record PUT error:', error);
    return NextResponse.json({ error: 'Failed to update egg record' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const deleted = await prisma.eggRecord.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Egg record DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete egg record' }, { status: 500 });
  }
}
