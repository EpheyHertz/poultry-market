import { prisma } from '@/lib/prisma';

export interface AttachmentLinkRefs {
  eggRecordId?: string;
  flockId?: string;
  feedRecordId?: string;
  mortalityRecordId?: string;
  vaccinationId?: string;
}

export type AttachmentLinkField = keyof AttachmentLinkRefs;

const ATTACHMENT_LINK_FIELDS: AttachmentLinkField[] = [
  'eggRecordId',
  'flockId',
  'feedRecordId',
  'mortalityRecordId',
  'vaccinationId',
];

export interface CreateAttachmentInput extends AttachmentLinkRefs {
  userId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
}

export async function listUserAttachments(userId: string, filters: AttachmentLinkRefs = {}) {
  return prisma.attachment.findMany({
    where: {
      userId,
      ...(filters.eggRecordId ? { eggRecordId: filters.eggRecordId } : {}),
      ...(filters.flockId ? { flockId: filters.flockId } : {}),
      ...(filters.feedRecordId ? { feedRecordId: filters.feedRecordId } : {}),
      ...(filters.mortalityRecordId ? { mortalityRecordId: filters.mortalityRecordId } : {}),
      ...(filters.vaccinationId ? { vaccinationId: filters.vaccinationId } : {}),
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function validateAttachmentLinkOwnership(userId: string, refs: AttachmentLinkRefs) {
  if (refs.eggRecordId) {
    const exists = await prisma.eggRecord.findFirst({
      where: { id: refs.eggRecordId, userId },
      select: { id: true },
    });

    if (!exists) {
      throw new Error('Egg record not found');
    }
  }

  if (refs.flockId) {
    const exists = await prisma.flock.findFirst({
      where: { id: refs.flockId, userId },
      select: { id: true },
    });

    if (!exists) {
      throw new Error('Flock not found');
    }
  }

  if (refs.feedRecordId) {
    const exists = await prisma.feedRecord.findFirst({
      where: { id: refs.feedRecordId, userId },
      select: { id: true },
    });

    if (!exists) {
      throw new Error('Feed record not found');
    }
  }

  if (refs.mortalityRecordId) {
    const exists = await prisma.mortalityRecord.findFirst({
      where: { id: refs.mortalityRecordId, userId },
      select: { id: true },
    });

    if (!exists) {
      throw new Error('Mortality record not found');
    }
  }

  if (refs.vaccinationId) {
    const exists = await prisma.vaccination.findFirst({
      where: { id: refs.vaccinationId, userId },
      select: { id: true },
    });

    if (!exists) {
      throw new Error('Vaccination not found');
    }
  }
}

export async function createAttachmentRecord(input: CreateAttachmentInput) {
  return prisma.attachment.create({
    data: {
      userId: input.userId,
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

export async function getAttachmentById(userId: string, attachmentId: string) {
  return prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      userId,
    },
  });
}

export async function deleteAttachmentById(userId: string, attachmentId: string) {
  return prisma.attachment.deleteMany({
    where: {
      id: attachmentId,
      userId,
    },
  });
}

export async function unlinkAttachmentRecord(
  userId: string,
  attachmentId: string,
  unlinkField: AttachmentLinkField
) {
  const existing = await prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      userId,
    },
    select: {
      id: true,
      eggRecordId: true,
      flockId: true,
      feedRecordId: true,
      mortalityRecordId: true,
      vaccinationId: true,
    },
  });

  if (!existing) {
    throw new Error('Attachment not found');
  }

  if (!existing[unlinkField]) {
    throw new Error('Attachment is not linked to the selected record type');
  }

  const data: {
    eggRecordId?: null;
    flockId?: null;
    feedRecordId?: null;
    mortalityRecordId?: null;
    vaccinationId?: null;
  } = {};

  if (unlinkField === 'eggRecordId') data.eggRecordId = null;
  if (unlinkField === 'flockId') data.flockId = null;
  if (unlinkField === 'feedRecordId') data.feedRecordId = null;
  if (unlinkField === 'mortalityRecordId') data.mortalityRecordId = null;
  if (unlinkField === 'vaccinationId') data.vaccinationId = null;

  const updated = await prisma.attachment.update({
    where: { id: existing.id },
    data,
    select: {
      id: true,
      eggRecordId: true,
      flockId: true,
      feedRecordId: true,
      mortalityRecordId: true,
      vaccinationId: true,
    },
  });

  const hasRemainingLinks = ATTACHMENT_LINK_FIELDS.some((field) => Boolean(updated[field]));

  if (!hasRemainingLinks) {
    await prisma.attachment.delete({ where: { id: updated.id } });
    return {
      deleted: true,
      attachment: null,
    };
  }

  return {
    deleted: false,
    attachment: updated,
  };
}
