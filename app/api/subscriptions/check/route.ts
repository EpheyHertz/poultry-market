import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { checkSubscription, type SubscriptionFeature } from '@/modules/subscriptions';

const schema = z.object({
  feature: z.enum(['import_data', 'upload_attachment', 'advanced_analytics']),
});

function normalizeFeature(value: string | null): SubscriptionFeature | null {
  if (value === 'import_data' || value === 'upload_attachment' || value === 'advanced_analytics') {
    return value;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feature = normalizeFeature(searchParams.get('feature'));

    if (!feature) {
      return NextResponse.json({ error: 'feature query parameter is required' }, { status: 400 });
    }

    const result = await checkSubscription(user.id, feature);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Subscription check GET error:', error);
    return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await checkSubscription(user.id, parsed.data.feature);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Subscription check POST error:', error);
    return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 });
  }
}
