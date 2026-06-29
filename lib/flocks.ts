import { differenceInCalendarDays, isAfter } from 'date-fns';
import {
  FlockEventType,
  LivestockBirdType,
  LivestockDeliveryScope,
  LivestockFlock,
  LivestockFlockMedication,
  LivestockFlockStatus,
  LivestockFlockVaccination,
  LivestockProductStage,
} from '@prisma/client';

export type FlockSyncPayload = {
  event_type: FlockEventType;
  entity_type: 'flock';
  entity_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
};

export type LivestockFlockRecord = LivestockFlock & {
  vaccinationsGiven: LivestockFlockVaccination[];
  medicationsGiven: LivestockFlockMedication[];
};

export type LivestockFlockViewModel = {
  id: string;
  title: string;
  breed: string;
  birdType: LivestockBirdType;
  quantity: number;
  location: string;
  status: LivestockFlockStatus;
  description: string;
  sellerId: string;
  startRearingDate: string;
  expectedReadyDate: string;
  deliveryAvailable: boolean;
  deliveryScope: LivestockDeliveryScope;
  deliveryNotes: string | null;
  currentAgeDays: number;
  currentAgeMonths: number;
  productStage: LivestockProductStage;
  vaccinationsGiven: Array<{
    id: string;
    name: string;
    dateGiven: string;
    nextDue: string | null;
  }>;
  medicationsGiven: Array<{
    id: string;
    name: string;
    reason: string;
    dateGiven: string;
    durationDays: number;
  }>;
  createdAt: string;
  updatedAt: string;
};

export function getAgeFromStartDate(startRearingDate: Date, today = new Date()) {
  const days = Math.max(differenceInCalendarDays(today, startRearingDate), 0);
  return {
    days,
    months: Math.floor(days / 30),
  };
}

export function getProductStage(
  status: LivestockFlockStatus,
  startRearingDate: Date,
  expectedReadyDate: Date,
  today = new Date()
) {
  if (status === LivestockFlockStatus.SOLD) {
    return LivestockProductStage.SOLD;
  }

  const age = getAgeFromStartDate(startRearingDate, today);

  if (!isAfter(expectedReadyDate, today)) {
    return LivestockProductStage.READY_FOR_SALE;
  }

  if (age.days < 21) return LivestockProductStage.CHICK;
  if (age.days < 60) return LivestockProductStage.GROWER;
  return LivestockProductStage.FINISHER;
}

export function toFlockViewModel(flock: LivestockFlockRecord): LivestockFlockViewModel {
  const age = getAgeFromStartDate(flock.startRearingDate);
  const productStage = getProductStage(flock.status, flock.startRearingDate, flock.expectedReadyDate);

  return {
    id: flock.id,
    title: flock.title,
    breed: flock.breed,
    birdType: flock.birdType,
    quantity: flock.quantity,
    location: flock.location,
    status: flock.status,
    description: flock.description,
    sellerId: flock.sellerId,
    startRearingDate: flock.startRearingDate.toISOString(),
    expectedReadyDate: flock.expectedReadyDate.toISOString(),
    deliveryAvailable: flock.deliveryAvailable,
    deliveryScope: flock.deliveryScope,
    deliveryNotes: flock.deliveryNotes,
    currentAgeDays: age.days,
    currentAgeMonths: age.months,
    productStage,
    vaccinationsGiven: flock.vaccinationsGiven
      .slice()
      .sort((left, right) => right.dateGiven.getTime() - left.dateGiven.getTime())
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        dateGiven: entry.dateGiven.toISOString(),
        nextDue: entry.nextDue ? entry.nextDue.toISOString() : null,
      })),
    medicationsGiven: flock.medicationsGiven
      .slice()
      .sort((left, right) => right.dateGiven.getTime() - left.dateGiven.getTime())
      .map((entry) => ({
        id: entry.id,
        name: entry.name,
        reason: entry.reason,
        dateGiven: entry.dateGiven.toISOString(),
        durationDays: entry.durationDays,
      })),
    createdAt: flock.createdAt.toISOString(),
    updatedAt: flock.updatedAt.toISOString(),
  };
}

export function sanitizeFlockForSync(flock: LivestockFlockRecord) {
  const view = toFlockViewModel(flock);

  return {
    id: view.id,
    title: view.title,
    breed: view.breed,
    bird_type: view.birdType,
    quantity: view.quantity,
    location: view.location,
    status: view.status,
    description: view.description,
    seller_id: view.sellerId,
    start_rearing_date: view.startRearingDate,
    expected_ready_date: view.expectedReadyDate,
    current_age: {
      days: view.currentAgeDays,
      months: view.currentAgeMonths,
    },
    product_stage: view.productStage,
    delivery_available: view.deliveryAvailable,
    delivery_scope: view.deliveryScope,
    delivery_notes: view.deliveryNotes,
    vaccinations_given: view.vaccinationsGiven,
    medications_given: view.medicationsGiven,
    created_at: view.createdAt,
    updated_at: view.updatedAt,
  };
}

export async function sendFlockSyncEvent(params: {
  eventType: FlockEventType;
  flock: LivestockFlockRecord;
}) {
  const endpoint = `${process.env.FASTAPI_AI_SYNC_URL}/events`;
  const payload: FlockSyncPayload = {
    event_type: params.eventType,
    entity_type: 'flock',
    entity_id: params.flock.id,
    timestamp: new Date().toISOString(),
    payload: sanitizeFlockForSync(params.flock),
  };

  if (!endpoint) {
    return { ok: false, reason: 'FASTAPI_AI_SYNC_URL is not configured' } as const;
  }

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return { ok: true } as const;
      }

      lastError = `Sync failed with status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown sync error';
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }

  return { ok: false, reason: lastError || 'Sync failed' } as const;
}