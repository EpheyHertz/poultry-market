import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { flockUpdateSchema } from '@/modules/eggs/schemas';
import { getFarmAccess } from '@/modules/farms/service';

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

    const flock = await prisma.flock.findUnique({
      where: { id },
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

    if (flock.farmId) {
      const access = await getFarmAccess(user.id, flock.farmId);
      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (flock.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    const existing = await prisma.flock.findUnique({
      where: { id },
      select: { id: true, userId: true, farmId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
    }

    if (existing.farmId) {
      const access = await getFarmAccess(user.id, existing.farmId);
      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const existing = await prisma.flock.findUnique({
      where: { id },
      select: { id: true, userId: true, farmId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
    }

    if (existing.farmId) {
      const access = await getFarmAccess(user.id, existing.farmId);
      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.flock.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Flock DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete flock' }, { status: 500 });
  }
}
