import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { generateSignedUploadPayload } from '@/lib/cloudinary';
import {
  assertFeatureAccess,
  type FeatureAccessError,
  SubscriptionCheckResult,
  toFeatureDeniedResponsePayload,
} from '@/modules/subscriptions';

const requestSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().min(1),
  folder: z.string().optional(),
});

function sanitizeBaseFileName(fileName: string): string {
  const base = fileName.split('.').slice(0, -1).join('.') || fileName;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let access: SubscriptionCheckResult;
    try {
      access = await assertFeatureAccess(user.id, 'upload_attachment');
    } catch (error) {
      const featureError = error as FeatureAccessError;
      return NextResponse.json(toFeatureDeniedResponsePayload(featureError.details), {
        status: featureError.statusCode || 403,
      });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.fileSize > access.limits.maxAttachmentSizeBytes) {
      return NextResponse.json(
        {
          error: `File exceeds plan limit of ${Math.round(access.limits.maxAttachmentSizeBytes / (1024 * 1024))}MB`,
          maxAttachmentSizeBytes: access.limits.maxAttachmentSizeBytes,
        },
        { status: 403 }
      );
    }

    const folder = parsed.data.folder || `poultry-marketplace/farm/${user.id}`;
    const publicId = `${sanitizeBaseFileName(parsed.data.fileName)}-${Date.now()}`;

    const payload = generateSignedUploadPayload({
      folder,
      publicId,
    });

    return NextResponse.json({
      ...payload,
      constraints: {
        maxAttachmentSizeBytes: access.limits.maxAttachmentSizeBytes,
      },
    });
  } catch (error) {
    console.error('Attachment signed URL error:', error);
    return NextResponse.json({ error: 'Failed to generate signed upload payload' }, { status: 500 });
  }
}
