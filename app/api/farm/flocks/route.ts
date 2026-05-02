import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { flockCreateSchema } from '@/modules/eggs/schemas';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const flock = await prisma.flock.create({
      data: {
        userId: user.id,
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
