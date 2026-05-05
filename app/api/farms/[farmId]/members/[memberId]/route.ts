import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { removeFarmMember, updateFarmMemberRole } from '@/modules/farms/service';

const updateMemberSchema = z.object({
  roleId: z.string().min(1),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ farmId: string; memberId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { farmId, memberId } = await params;
    const body = await request.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid member payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const member = await updateFarmMemberRole(farmId, user.id, memberId, parsed.data.roleId);

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Farm member PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update member';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ farmId: string; memberId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { farmId, memberId } = await params;
    await removeFarmMember(farmId, user.id, memberId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Farm member DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove member';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
