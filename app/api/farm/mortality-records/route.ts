import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mortalityRecordCreateSchema } from '@/modules/eggs/schemas';
import { getFarmAccess } from '@/modules/farms/service';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId');
    const flockId = searchParams.get('flockId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (farmId) {
      const access = await getFarmAccess(user.id, farmId);
      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const records = await prisma.mortalityRecord.findMany({
      where: {
        ...(farmId ? { farmId } : { userId: user.id }),
        ...(flockId ? { flockId } : {}),
        ...(from || to
          ? {
              recordedOn: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        flock: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { recordedOn: 'desc' },
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Mortality records GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch mortality records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = mortalityRecordCreateSchema.safeParse(body);

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

    if (parsed.data.flockId) {
      const flock = await prisma.flock.findFirst({
        where: {
          id: parsed.data.flockId,
          farmId: parsed.data.farmId,
        },
      });

      if (!flock) {
        return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
      }
    }

    const record = await prisma.mortalityRecord.create({
      data: {
        userId: user.id,
        farmId: parsed.data.farmId,
        flockId: parsed.data.flockId || null,
        recordedOn: parsed.data.recordedOn ? new Date(parsed.data.recordedOn) : new Date(),
        count: parsed.data.count,
        cause: parsed.data.cause || null,
        notes: parsed.data.notes || null,
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

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error('Mortality records POST error:', error);
    return NextResponse.json({ error: 'Failed to create mortality record' }, { status: 500 });
  }
}
