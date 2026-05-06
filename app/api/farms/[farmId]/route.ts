import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { deleteFarm, getCurrentFarmPermissions, getFarmById, updateFarmDetails } from '@/modules/farms/service';
import { canMemberPerform } from '@/modules/farms/permissions';

const updateFarmSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(120).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
  subscriptionPlan: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).optional(),
  subscriptionStatus: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED']).optional(),
  subscriptionEndsAt: z.string().datetime().optional().nullable(),
  billingEmail: z.string().email().optional().nullable(),
  billingProvider: z.string().optional().nullable(),
  billingReference: z.string().optional().nullable(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ farmId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { farmId } = await params;
    const access = await getCurrentFarmPermissions(user.id, farmId);

    if (!access) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    const farm = await getFarmById(farmId);

    return NextResponse.json({
      farm,
      member: access.member,
      role: access.role,
      permissions: access.permissions,
    });
  } catch (error) {
    console.error('Farm GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch farm' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ farmId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { farmId } = await params;
    const body = await request.json();
    const parsed = updateFarmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid farm payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const access = await getCurrentFarmPermissions(user.id, farmId);
    if (!access) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    if (!canMemberPerform(access.member, 'farm:manage') && access.member.role.rank < 100) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const farm = await updateFarmDetails(farmId, user.id, {
      ...parsed.data,
      settings: parsed.data.settings as Prisma.JsonValue | undefined,
      subscriptionEndsAt: parsed.data.subscriptionEndsAt ? new Date(parsed.data.subscriptionEndsAt) : undefined,
    });

    return NextResponse.json({ farm });
  } catch (error) {
    console.error('Farm PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update farm';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ farmId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { farmId } = await params;
    await deleteFarm(farmId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Farm DELETE error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete farm';
    const status = message === 'Forbidden' ? 403 : message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
