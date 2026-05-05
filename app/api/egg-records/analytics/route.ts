import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getEggAnalytics } from '@/modules/eggs/analytics';
import { eggAnalyticsQuerySchema } from '@/modules/eggs/schemas';
import { getFarmAccess } from '@/modules/farms/service';
import {
  assertFeatureAccess,
  type FeatureAccessError,
  toFeatureDeniedResponsePayload,
} from '@/modules/subscriptions';

function defaultFromDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await assertFeatureAccess(user.id, 'advanced_analytics');
    } catch (error) {
      const featureError = error as FeatureAccessError;
      return NextResponse.json(toFeatureDeniedResponsePayload(featureError.details), {
        status: featureError.statusCode || 403,
      });
    }

    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farmId') || undefined;
    const parsed = eggAnalyticsQuerySchema.safeParse({
      farmId,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      groupBy: searchParams.get('groupBy') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const from = parsed.data.from ? new Date(parsed.data.from) : defaultFromDate();
    const to = parsed.data.to ? new Date(parsed.data.to) : new Date();

    if (parsed.data.farmId) {
      const access = await getFarmAccess(user.id, parsed.data.farmId);
      if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const analytics = await getEggAnalytics({
      userId: user.id,
      farmId: parsed.data.farmId,
      from,
      to,
      groupBy: parsed.data.groupBy,
    });

    return NextResponse.json({
      ...analytics,
      filters: {
        from,
        to,
        groupBy: parsed.data.groupBy,
        ...(parsed.data.farmId ? { farmId: parsed.data.farmId } : {}),
      },
    });
  } catch (error) {
    console.error('Egg analytics error:', error);
    return NextResponse.json({ error: 'Failed to fetch egg analytics' }, { status: 500 });
  }
}
