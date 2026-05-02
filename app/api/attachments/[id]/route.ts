import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import {
  deleteAttachmentById,
  getAttachmentById,
  unlinkAttachmentRecord,
} from '@/modules/attachments';

const unlinkSchema = z.object({
  unlinkField: z.enum([
    'eggRecordId',
    'flockId',
    'feedRecordId',
    'mortalityRecordId',
    'vaccinationId',
  ]),
});

interface Context {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const attachment = await getAttachmentById(user.id, id);

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return NextResponse.json({ attachment });
  } catch (error) {
    console.error('Attachment GET by id error:', error);
    return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = unlinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      const result = await unlinkAttachmentRecord(user.id, id, parsed.data.unlinkField);
      return NextResponse.json({
        success: true,
        deleted: result.deleted,
        attachment: result.attachment,
      });
    } catch (serviceError) {
      const message = serviceError instanceof Error ? serviceError.message : 'Attachment operation failed';
      if (message === 'Attachment not found') {
        return NextResponse.json({ error: message }, { status: 404 });
      }

      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    console.error('Attachment PATCH error:', error);
    return NextResponse.json({ error: 'Failed to unlink attachment' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await deleteAttachmentById(user.id, id);

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Attachment DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
