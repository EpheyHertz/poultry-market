import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { createFarm, listFarmsForUser } from '@/modules/farms/service';

const createFarmSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).optional().nullable(),
  settings: z.record(z.unknown()).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const farms = await listFarmsForUser(user.id);

    return NextResponse.json({ farms });
  } catch (error) {
    console.error('Farms GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch farms' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createFarmSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid farm payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const farm = await createFarm({
      ownerId: user.id,
      ownerEmail: user.email,
      name: parsed.data.name,
      slug: parsed.data.slug,
      settings: parsed.data.settings || {},
    });

    return NextResponse.json({ farm }, { status: 201 });
  } catch (error) {
    console.error('Farms POST error:', error);
    return NextResponse.json({ error: 'Failed to create farm' }, { status: 500 });
  }
}
