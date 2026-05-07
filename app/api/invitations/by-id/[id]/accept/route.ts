import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { acceptFarmInvitationById } from '@/modules/farms/service';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const membership = await acceptFarmInvitationById({
      invitationId: id,
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ membership });
  } catch (error) {
    console.error('Invitation accept by id POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to accept invitation';
    const status = message === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
