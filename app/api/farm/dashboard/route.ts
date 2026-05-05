import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserSubscriptionSnapshot } from '@/modules/subscriptions';
import { getFarmAccess } from '@/modules/farms/service';

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

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
    }

    const todayStart = startOfToday();
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const upcomingVaccinationEnd = new Date(todayStart);
    upcomingVaccinationEnd.setDate(upcomingVaccinationEnd.getDate() + 7);

    const [
      todayEggs,
      weeklyEggs,
      feedSpendWeek,
      activeFlocks,
      totalAttachments,
      upcomingVaccinations,
      recentEggEntries,
      subscription,
    ] = await Promise.all([
      prisma.eggRecord.aggregate({
        where: {
          ...(farmId ? { farmId } : { userId: user.id }),
          recordedOn: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        _sum: {
          quantity: true,
          damagedCount: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.eggRecord.aggregate({
        where: {
          ...(farmId ? { farmId } : { userId: user.id }),
          recordedOn: {
            gte: weekStart,
            lt: todayEnd,
          },
        },
        _sum: {
          quantity: true,
          damagedCount: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.feedRecord.aggregate({
        where: {
          ...(farmId ? { farmId } : { userId: user.id }),
          recordedOn: {
            gte: weekStart,
            lt: todayEnd,
          },
        },
        _sum: {
          cost: true,
        },
      }),
      prisma.flock.findMany({
        where: {
          ...(farmId ? { farmId } : { userId: user.id }),
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          birdCount: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.attachment.count({
        where: {
          ...(farmId ? { farmId } : { userId: user.id }),
        },
      }),
      prisma.vaccination.count({
        where: {
          ...(farmId ? { farmId } : { userId: user.id }),
          status: 'SCHEDULED',
          scheduledDate: {
            gte: todayStart,
            lte: upcomingVaccinationEnd,
          },
        },
      }),
      prisma.eggRecord.findMany({
        where: {
          ...(farmId ? { farmId } : { userId: user.id }),
        },
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
        take: 8,
      }),
      getUserSubscriptionSnapshot(user.id),
    ]);

    return NextResponse.json({
      subscription,
      metrics: {
        todayEggs: todayEggs._sum.quantity || 0,
        todayDamaged: todayEggs._sum.damagedCount || 0,
        todayEntries: todayEggs._count.id || 0,
        weekEggs: weeklyEggs._sum.quantity || 0,
        weekDamaged: weeklyEggs._sum.damagedCount || 0,
        weekEntries: weeklyEggs._count.id || 0,
        weekAveragePerEntry:
          (weeklyEggs._count.id || 0) > 0
            ? Number(((weeklyEggs._sum.quantity || 0) / (weeklyEggs._count.id || 1)).toFixed(2))
            : 0,
        feedSpendWeek: Number((feedSpendWeek._sum.cost || 0).toFixed(2)),
        activeFlockCount: activeFlocks.length,
        attachmentCount: totalAttachments,
        upcomingVaccinations,
      },
      activeFlocks,
      recentEggEntries,
    });
  } catch (error) {
    console.error('Farm dashboard error:', error);
    return NextResponse.json({ error: 'Failed to load farm dashboard' }, { status: 500 });
  }
}
