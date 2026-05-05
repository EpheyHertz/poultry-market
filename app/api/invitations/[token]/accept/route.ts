import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { acceptFarmInvitation } from '@/modules/farms/service';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;
    const membership = await acceptFarmInvitation({ token, userId: user.id });

    return NextResponse.json({ membership });
  } catch (error) {
    console.error('Invitation accept POST error:', error);
    const message = error instanceof Error ? error.message : 'Failed to accept invitation';
    const status = message === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
