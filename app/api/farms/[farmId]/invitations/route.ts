import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { getAssignableFarmRoles, inviteFarmMember } from '@/modules/farms/service';

const inviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().min(1),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ farmId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { farmId } = await params;
    const roles = await getAssignableFarmRoles(farmId, user.id);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Farm invitation roles GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch roles';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ farmId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { farmId } = await params;
    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid invitation payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invitation = await inviteFarmMember({
      farmId,
      inviterId: user.id,
      invitedEmail: parsed.data.email,
      roleId: parsed.data.roleId,
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error('Farm invitation POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create invitation';
    const status = message === 'Unauthorized' ? 401 : message === 'Forbidden' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
