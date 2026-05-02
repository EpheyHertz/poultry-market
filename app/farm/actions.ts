'use server';

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  assertFeatureAccess,
  type FeatureAccessError,
  type SubscriptionFeature,
} from '@/modules/subscriptions';

export async function requireSubscriptionFeatureForAction(feature: SubscriptionFeature) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  try {
    return await assertFeatureAccess(user.id, feature);
  } catch (error) {
    const featureError = error as FeatureAccessError;
    throw new Error(featureError.details.reason || 'Feature unavailable for your plan');
  }
}

export async function quickEggLogAction(input: {
  quantity: number;
  damagedCount?: number;
  flockId?: string;
  notes?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  if (input.flockId) {
    const flock = await prisma.flock.findFirst({
      where: {
        id: input.flockId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!flock) {
      throw new Error('Flock not found');
    }
  }

  return prisma.eggRecord.create({
    data: {
      userId: user.id,
      flockId: input.flockId || null,
      recordedOn: new Date(),
      quantity: input.quantity,
      damagedCount: input.damagedCount || 0,
      notes: input.notes || null,
    },
  });
}

export async function registerAttachmentAction(input: {
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  eggRecordId?: string;
  flockId?: string;
  feedRecordId?: string;
  mortalityRecordId?: string;
  vaccinationId?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const access = await requireSubscriptionFeatureForAction('upload_attachment');
  if (input.sizeBytes > access.limits.maxAttachmentSizeBytes) {
    throw new Error('Attachment exceeds your current plan limit');
  }

  return prisma.attachment.create({
    data: {
      userId: user.id,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      eggRecordId: input.eggRecordId || null,
      flockId: input.flockId || null,
      feedRecordId: input.feedRecordId || null,
      mortalityRecordId: input.mortalityRecordId || null,
      vaccinationId: input.vaccinationId || null,
    },
  });
}
