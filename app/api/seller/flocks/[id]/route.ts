import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { FlockEventType, LivestockBirdType, LivestockDeliveryScope, LivestockFlockStatus } from '@prisma/client';
import { sanitizeFlockForSync, sendFlockSyncEvent, toFlockViewModel } from '@/lib/flocks';

interface Context {
  params: Promise<{ id: string }>;
}

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

async function getFlockForUser(id: string, userId: string, role: string) {
  const flock = await prisma.livestockFlock.findUnique({
    where: { id },
    include: {
      vaccinationsGiven: true,
      medicationsGiven: true,
    },
  });

  if (!flock) return null;
  if (role === 'ADMIN' || flock.sellerId === userId) return flock;
  return null;
}

export async function GET(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const flock = await getFlockForUser(id, user.id, user.role);

    if (!flock) {
      return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
    }

    return NextResponse.json({ flock: toFlockViewModel(flock) });
  } catch (error) {
    console.error('Livestock flock GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch flock' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await getFlockForUser(id, user.id, user.role);

    if (!existing) {
      return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
    }

    const body = await request.json();
    const birdType = normalizeBirdType(body.birdType);
    const status = normalizeStatus(body.status);
    const deliveryScope = normalizeDeliveryScope(body.deliveryScope);
    const sellerId = user.role === 'ADMIN' && typeof body.sellerId === 'string' && body.sellerId.trim()
      ? body.sellerId.trim()
      : existing.sellerId;

    const startRearingDate = body.startRearingDate ? new Date(body.startRearingDate) : existing.startRearingDate;
    const expectedReadyDate = body.expectedReadyDate ? new Date(body.expectedReadyDate) : existing.expectedReadyDate;

    if (Number.isNaN(startRearingDate.getTime()) || Number.isNaN(expectedReadyDate.getTime())) {
      return NextResponse.json({ error: 'Valid lifecycle dates are required' }, { status: 400 });
    }

    if (expectedReadyDate < startRearingDate) {
      return NextResponse.json({ error: 'Expected ready date must be after the start rearing date' }, { status: 400 });
    }

    const vaccinationsGiven = Array.isArray(body.vaccinationsGiven) ? body.vaccinationsGiven : [];
    const medicationsGiven = Array.isArray(body.medicationsGiven) ? body.medicationsGiven : [];

    const flock = await prisma.livestockFlock.update({
      where: { id },
      data: {
        ...(typeof body.title === 'string' && body.title.trim() ? { title: body.title.trim() } : {}),
        ...(typeof body.breed === 'string' && body.breed.trim() ? { breed: body.breed.trim() } : {}),
        ...(birdType ? { birdType } : {}),
        ...(body.quantity !== undefined ? { quantity: Math.max(Math.floor(Number(body.quantity)), 0) } : {}),
        ...(typeof body.location === 'string' && body.location.trim() ? { location: body.location.trim() } : {}),
        ...(status ? { status } : {}),
        ...(typeof body.description === 'string' ? { description: body.description.trim() } : {}),
        ...(sellerId ? { sellerId } : {}),
        ...(body.startRearingDate ? { startRearingDate } : {}),
        ...(body.expectedReadyDate ? { expectedReadyDate } : {}),
        ...(body.deliveryAvailable !== undefined ? { deliveryAvailable: Boolean(body.deliveryAvailable) } : {}),
        ...(deliveryScope ? { deliveryScope } : {}),
        ...(typeof body.deliveryNotes === 'string'
          ? { deliveryNotes: body.deliveryNotes.trim() || null }
          : {}),
        ...(vaccinationsGiven.length > 0 ? {
          vaccinationsGiven: {
            create: vaccinationsGiven.map((entry: { name?: string; dateGiven?: string; nextDue?: string | null }) => ({
              name: String(entry.name || '').trim(),
              dateGiven: new Date(String(entry.dateGiven || '')),
              nextDue: entry.nextDue ? new Date(entry.nextDue) : null,
            })),
          },
        } : {}),
        ...(medicationsGiven.length > 0 ? {
          medicationsGiven: {
            create: medicationsGiven.map((entry: { name?: string; reason?: string; dateGiven?: string; durationDays?: number }) => ({
              name: String(entry.name || '').trim(),
              reason: String(entry.reason || '').trim(),
              dateGiven: new Date(String(entry.dateGiven || '')),
              durationDays: Math.max(Number(entry.durationDays || 0), 0),
            })),
          },
        } : {}),
      },
      include: {
        vaccinationsGiven: true,
        medicationsGiven: true,
      },
    });

    const syncResult = await sendFlockSyncEvent({
      eventType: FlockEventType.FLOCK_UPDATED,
      flock,
    });

    if (!syncResult.ok) {
      await prisma.pendingEvent.create({
        data: {
          eventType: FlockEventType.FLOCK_UPDATED,
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

    return NextResponse.json({ flock: toFlockViewModel(flock) });
  } catch (error) {
    console.error('Livestock flock PUT error:', error);
    return NextResponse.json({ error: 'Failed to update flock' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const existing = await getFlockForUser(id, user.id, user.role);

    if (!existing) {
      return NextResponse.json({ error: 'Flock not found' }, { status: 404 });
    }

    await prisma.livestockFlock.delete({ where: { id } });

    const syncResult = await sendFlockSyncEvent({
      eventType: FlockEventType.FLOCK_DELETED,
      flock: existing,
    });

    if (!syncResult.ok) {
      await prisma.pendingEvent.create({
        data: {
          eventType: FlockEventType.FLOCK_DELETED,
          entityType: 'flock',
          entityId: existing.id,
          payload: sanitizeFlockForSync(existing),
          status: 'PENDING',
          errorMessage: syncResult.reason,
          retryCount: 3,
          lastAttemptAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Livestock flock DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete flock' }, { status: 500 });
  }
}