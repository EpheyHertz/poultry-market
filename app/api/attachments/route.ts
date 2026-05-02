import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import {
  createAttachmentRecord,
  listUserAttachments,
  validateAttachmentLinkOwnership,
} from '@/modules/attachments';
import {
  assertFeatureAccess,
  type FeatureAccessError,
  toFeatureDeniedResponsePayload,
} from '@/modules/subscriptions';

const createAttachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(1),
  eggRecordId: z.string().optional(),
  flockId: z.string().optional(),
  feedRecordId: z.string().optional(),
  mortalityRecordId: z.string().optional(),
  vaccinationId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eggRecordId = searchParams.get('eggRecordId');
    const flockId = searchParams.get('flockId');
    const feedRecordId = searchParams.get('feedRecordId');
    const mortalityRecordId = searchParams.get('mortalityRecordId');
    const vaccinationId = searchParams.get('vaccinationId');

    const attachments = await listUserAttachments(user.id, {
      eggRecordId: eggRecordId || undefined,
      flockId: flockId || undefined,
      feedRecordId: feedRecordId || undefined,
      mortalityRecordId: mortalityRecordId || undefined,
      vaccinationId: vaccinationId || undefined,
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Attachments GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let access;
    try {
      access = await assertFeatureAccess(user.id, 'upload_attachment');
    } catch (error) {
      const featureError = error as FeatureAccessError;
      return NextResponse.json(toFeatureDeniedResponsePayload(featureError.details), {
        status: featureError.statusCode || 403,
      });
    }

    const body = await request.json();
    const parsed = createAttachmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.sizeBytes > access.limits.maxAttachmentSizeBytes) {
      return NextResponse.json(
        {
          error: `File exceeds plan limit of ${Math.round(access.limits.maxAttachmentSizeBytes / (1024 * 1024))}MB`,
          maxAttachmentSizeBytes: access.limits.maxAttachmentSizeBytes,
        },
        { status: 403 }
      );
    }

    const linkCount = [
      parsed.data.eggRecordId,
      parsed.data.flockId,
      parsed.data.feedRecordId,
      parsed.data.mortalityRecordId,
      parsed.data.vaccinationId,
    ].filter(Boolean).length;

    if (linkCount === 0) {
      return NextResponse.json(
        { error: 'Attachment must be linked to at least one farm record' },
        { status: 400 }
      );
    }

    try {
      await validateAttachmentLinkOwnership(user.id, {
        eggRecordId: parsed.data.eggRecordId,
        flockId: parsed.data.flockId,
        feedRecordId: parsed.data.feedRecordId,
        mortalityRecordId: parsed.data.mortalityRecordId,
        vaccinationId: parsed.data.vaccinationId,
      });
    } catch (ownershipError) {
      const message = ownershipError instanceof Error ? ownershipError.message : 'Record not found';
      return NextResponse.json({ error: message }, { status: 404 });
    }

    const attachment = await createAttachmentRecord({
      userId: user.id,
      fileName: parsed.data.fileName,
      fileUrl: parsed.data.fileUrl,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      eggRecordId: parsed.data.eggRecordId,
      flockId: parsed.data.flockId,
      feedRecordId: parsed.data.feedRecordId,
      mortalityRecordId: parsed.data.mortalityRecordId,
      vaccinationId: parsed.data.vaccinationId,
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    console.error('Attachments POST error:', error);
    return NextResponse.json({ error: 'Failed to create attachment' }, { status: 500 });
  }
}
