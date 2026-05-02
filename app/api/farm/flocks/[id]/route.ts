import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { flockUpdateSchema } from '@/modules/eggs/schemas';

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

    const flock = await prisma.flock.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            eggRecords: true,
            feedRecords: true,
            mortalityRecords: true,
            vaccinations: true,
            attachments: true,
          },
        },
      },
    });

    if (!flock) {
      return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
    }

    return NextResponse.json({ flock });
  } catch (error) {
    console.error('Flock GET by id error:', error);
    return NextResponse.json({ error: 'Failed to fetch flock' }, { status: 500 });
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
    const parsed = flockUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.flock.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
    }

    const flock = await prisma.flock.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.breed !== undefined ? { breed: parsed.data.breed || null } : {}),
        ...(parsed.data.birdCount !== undefined ? { birdCount: parsed.data.birdCount } : {}),
        ...(parsed.data.acquiredAt !== undefined
          ? { acquiredAt: parsed.data.acquiredAt ? new Date(parsed.data.acquiredAt) : null }
          : {}),
        ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes || null } : {}),
      },
    });

    return NextResponse.json({ flock });
  } catch (error) {
    console.error('Flock PUT error:', error);
    return NextResponse.json({ error: 'Failed to update flock' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await prisma.flock.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Flock DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete flock' }, { status: 500 });
  }
}
