import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { eggRecordCreateSchema } from '@/modules/eggs/schemas';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const flockId = searchParams.get('flockId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Math.min(Number(searchParams.get('pageSize') || 30), 100);

    const where = {
      userId: user.id,
      ...(flockId ? { flockId } : {}),
      ...(from || to
        ? {
            recordedOn: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [records, total, aggregates] = await Promise.all([
      prisma.eggRecord.findMany({
        where,
        include: {
          flock: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          recordedOn: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.eggRecord.count({ where }),
      prisma.eggRecord.aggregate({
        where,
        _sum: {
          quantity: true,
          damagedCount: true,
        },
        _avg: {
          quantity: true,
        },
      }),
    ]);

    return NextResponse.json({
      records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
      summary: {
        totalEggs: aggregates._sum.quantity || 0,
        totalDamaged: aggregates._sum.damagedCount || 0,
        averagePerEntry: Number((aggregates._avg.quantity || 0).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('Egg records GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch egg records' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = eggRecordCreateSchema.safeParse(body);

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

    const record = await prisma.eggRecord.create({
      data: {
        userId: user.id,
        flockId: parsed.data.flockId || null,
        recordedOn: parsed.data.recordedOn ? new Date(parsed.data.recordedOn) : new Date(),
        quantity: parsed.data.quantity,
        damagedCount: parsed.data.damagedCount,
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
    console.error('Egg records POST error:', error);
    return NextResponse.json({ error: 'Failed to create egg record' }, { status: 500 });
  }
}
