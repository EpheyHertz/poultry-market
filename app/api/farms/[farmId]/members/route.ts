import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAssignableFarmRoles, listFarmMembers } from '@/modules/farms/service';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ farmId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { farmId } = await params;
    const [members, assignableRoles] = await Promise.all([
      listFarmMembers(farmId, user.id),
      getAssignableFarmRoles(farmId, user.id),
    ]);

    return NextResponse.json({ members, assignableRoles });
  } catch (error) {
    console.error('Farm members GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch farm members';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
