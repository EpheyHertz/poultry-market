import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { FlockEventType, LivestockBirdType, LivestockDeliveryScope, LivestockFlockStatus } from '@prisma/client';
import { sanitizeFlockForSync, sendFlockSyncEvent, toFlockViewModel } from '@/lib/flocks';

function normalizeBirdType(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.toUpperCase();
  return Object.values(LivestockBirdType).includes(normalized as LivestockBirdType)
    ? (normalized as LivestockBirdType)
    : null;
}

function normalizeStatus(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.toUpperCase();
  return Object.values(LivestockFlockStatus).includes(normalized as LivestockFlockStatus)
    ? (normalized as LivestockFlockStatus)
    : null;
}

function normalizeDeliveryScope(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.toUpperCase();
  return Object.values(LivestockDeliveryScope).includes(normalized as LivestockDeliveryScope)
    ? (normalized as LivestockDeliveryScope)
    : null;
}

async function getAccessibleFlocks(user: { id: string; role: string }) {
  const isAdmin = user.role === 'ADMIN';

  return prisma.livestockFlock.findMany({
    where: isAdmin ? {} : { sellerId: user.id },
    include: {
      vaccinationsGiven: true,
      medicationsGiven: true,
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const flocks = await getAccessibleFlocks(user);

    return NextResponse.json({
      flocks: flocks.map(toFlockViewModel),
    });
  } catch (error) {
    console.error('Livestock flocks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch flocks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const birdType = normalizeBirdType(body.birdType);
    const status = normalizeStatus(body.status) || LivestockFlockStatus.ACTIVE;
    const deliveryScope = normalizeDeliveryScope(body.deliveryScope) || LivestockDeliveryScope.FARM_PICKUP;
    const sellerId = user.role === 'ADMIN' && typeof body.sellerId === 'string' && body.sellerId.trim()
      ? body.sellerId.trim()
      : user.id;

    if (!body.title?.trim() || !body.breed?.trim() || !birdType || !body.location?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'Missing required flock fields' }, { status: 400 });
    }

    const quantity = Number(body.quantity);
    const startRearingDate = new Date(body.startRearingDate);
    const expectedReadyDate = new Date(body.expectedReadyDate);

    if (!Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json({ error: 'Quantity must be a non-negative number' }, { status: 400 });
    }

    if (Number.isNaN(startRearingDate.getTime()) || Number.isNaN(expectedReadyDate.getTime())) {
      return NextResponse.json({ error: 'Valid lifecycle dates are required' }, { status: 400 });
    }

    if (expectedReadyDate < startRearingDate) {
      return NextResponse.json({ error: 'Expected ready date must be after the start rearing date' }, { status: 400 });
    }

    const vaccinationsGiven = Array.isArray(body.vaccinationsGiven) ? body.vaccinationsGiven : [];
    const medicationsGiven = Array.isArray(body.medicationsGiven) ? body.medicationsGiven : [];

    const flock = await prisma.livestockFlock.create({
      data: {
        title: body.title.trim(),
        breed: body.breed.trim(),
        birdType,
        quantity: Math.floor(quantity),
        location: body.location.trim(),
        status,
        description: body.description.trim(),
        sellerId,
        startRearingDate,
        expectedReadyDate,
        deliveryAvailable: Boolean(body.deliveryAvailable),
        deliveryScope,
        deliveryNotes: typeof body.deliveryNotes === 'string' && body.deliveryNotes.trim() ? body.deliveryNotes.trim() : null,
        vaccinationsGiven: vaccinationsGiven.length > 0 ? {
          create: vaccinationsGiven.map((entry: { name?: string; dateGiven?: string; nextDue?: string | null }) => ({
            name: String(entry.name || '').trim(),
            dateGiven: new Date(String(entry.dateGiven || '')),
            nextDue: entry.nextDue ? new Date(entry.nextDue) : null,
          })),
        } : undefined,
        medicationsGiven: medicationsGiven.length > 0 ? {
          create: medicationsGiven.map((entry: { name?: string; reason?: string; dateGiven?: string; durationDays?: number }) => ({
            name: String(entry.name || '').trim(),
            reason: String(entry.reason || '').trim(),
            dateGiven: new Date(String(entry.dateGiven || '')),
            durationDays: Math.max(Number(entry.durationDays || 0), 0),
          })),
        } : undefined,
      },
      include: {
        vaccinationsGiven: true,
        medicationsGiven: true,
      },
    });

    const syncResult = await sendFlockSyncEvent({
      eventType: FlockEventType.FLOCK_CREATED,
      flock,
    });

    if (!syncResult.ok) {
      await prisma.pendingEvent.create({
        data: {
          eventType: FlockEventType.FLOCK_CREATED,
          entityType: 'flock',
          entityId: flock.id,
          payload: sanitizeFlockForSync(flock),
          status: 'PENDING',
          errorMessage: syncResult.reason,
          retryCount: 3,
          lastAttemptAt: new Date(),
        },
      });
    }

    return NextResponse.json({ flock: toFlockViewModel(flock) }, { status: 201 });
  } catch (error) {
    console.error('Livestock flock POST error:', error);
    return NextResponse.json({ error: 'Failed to create flock' }, { status: 500 });
  }
}