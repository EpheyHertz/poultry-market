import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { flockCreateSchema } from '@/modules/eggs/schemas';
import { getFarmAccess } from '@/modules/farms/service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');

    if (farmId) {
      const access = await getFarmAccess(user.id, farmId);
      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const flocks = await prisma.flock.findMany({
        where: { farmId },
        include: {
          _count: {
            select: {
              eggRecords: true,
              feedRecords: true,
              mortalityRecords: true,
              vaccinations: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      });

      return NextResponse.json({ flocks });
    }

    const flocks = await prisma.flock.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            eggRecords: true,
            feedRecords: true,
            mortalityRecords: true,
            vaccinations: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ flocks });
  } catch (error) {
    console.error('Flocks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch flocks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = flockCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!parsed.data.farmId) {
      return NextResponse.json({ error: 'farmId is required' }, { status: 400 });
    }

    const access = await getFarmAccess(user.id, parsed.data.farmId);
    if (!access) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const flock = await prisma.flock.create({
      data: {
        userId: user.id,
        farmId: parsed.data.farmId,
        name: parsed.data.name,
        breed: parsed.data.breed || null,
        birdCount: parsed.data.birdCount,
        acquiredAt: parsed.data.acquiredAt ? new Date(parsed.data.acquiredAt) : null,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
      },
    });

    return NextResponse.json({ flock }, { status: 201 });
  } catch (error) {
    console.error('Flocks POST error:', error);
    return NextResponse.json({ error: 'Failed to create flock' }, { status: 500 });
  }
}
