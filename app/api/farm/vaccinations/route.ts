import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { vaccinationCreateSchema } from '@/modules/eggs/schemas';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const flockId = searchParams.get('flockId');
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';
    const upcomingDays = Number(searchParams.get('upcomingDays') || 14);

    const now = new Date();
    const upcomingUntil = new Date(now);
    upcomingUntil.setDate(upcomingUntil.getDate() + Math.max(upcomingDays, 1));

    const records = await prisma.vaccination.findMany({
      where: {
        userId: user.id,
        ...(flockId ? { flockId } : {}),
        ...(status ? { status: status as any } : {}),
        ...(upcoming
          ? {
              scheduledDate: {
                gte: now,
                lte: upcomingUntil,
              },
              status: 'SCHEDULED',
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
      orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Vaccinations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch vaccinations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = vaccinationCreateSchema.safeParse(body);

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

    const vaccination = await prisma.vaccination.create({
      data: {
        userId: user.id,
        flockId: parsed.data.flockId || null,
        vaccineName: parsed.data.vaccineName,
        scheduledDate: new Date(parsed.data.scheduledDate),
        administeredDate: parsed.data.administeredDate ? new Date(parsed.data.administeredDate) : null,
        status: parsed.data.status,
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

    return NextResponse.json({ vaccination }, { status: 201 });
  } catch (error) {
    console.error('Vaccinations POST error:', error);
    return NextResponse.json({ error: 'Failed to create vaccination schedule' }, { status: 500 });
  }
}
