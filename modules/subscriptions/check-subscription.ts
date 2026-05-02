import type { Subscription, SubscriptionPlan } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { FEATURE_LABELS, PLAN_LIMITS, type SubscriptionFeature } from './plan-config';

export interface FeatureUsageSnapshot {
  attachmentsUsed?: number;
  attachmentsRemaining?: number;
  monthlyImportsUsed?: number;
  monthlyImportsRemaining?: number;
}

export interface SubscriptionCheckResult {
  allowed: boolean;
  feature: SubscriptionFeature;
  reason?: string;
  plan: SubscriptionPlan;
  status: Subscription['status'];
  limits: (typeof PLAN_LIMITS)[SubscriptionPlan];
  usage: FeatureUsageSnapshot;
}

export interface FeatureAccessError extends Error {
  statusCode: number;
  details: SubscriptionCheckResult;
}

type UserLike = string | { id: string };

function resolveUserId(user: UserLike): string {
  return typeof user === 'string' ? user : user.id;
}

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getEffectivePlan(subscription: Subscription): SubscriptionPlan {
  if (subscription.status === 'ACTIVE') {
    return subscription.plan;
  }

  // Treat non-active subscriptions as FREE to avoid accidental paid access.
  return 'FREE';
}

export async function getOrCreateSubscription(userId: string): Promise<Subscription> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.subscription.create({
    data: {
      userId,
      plan: 'FREE',
      status: 'ACTIVE',
      startDate: new Date(),
    },
  });
}

export async function syncExpiredSubscription(subscription: Subscription): Promise<Subscription> {
  if (
    subscription.status === 'ACTIVE' &&
    subscription.endDate &&
    subscription.endDate.getTime() < Date.now()
  ) {
    return prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'EXPIRED',
      },
    });
  }

  return subscription;
}

export async function checkSubscription(user: UserLike, feature: SubscriptionFeature): Promise<SubscriptionCheckResult> {
  const userId = resolveUserId(user);
  const subscription = await syncExpiredSubscription(await getOrCreateSubscription(userId));
  const plan = getEffectivePlan(subscription);
  const limits = PLAN_LIMITS[plan];
  const usage: FeatureUsageSnapshot = {};

  if (feature === 'import_data') {
    if (!limits.canImportData) {
      return {
        allowed: false,
        feature,
        reason: `${FEATURE_LABELS[feature]} is not available on the ${plan.toLowerCase()} plan.`,
        plan,
        status: subscription.status,
        limits,
        usage,
      };
    }

    const importsThisMonth = await prisma.farmImportJob.count({
      where: {
        userId,
        status: 'CONFIRMED',
        confirmedAt: {
          gte: startOfMonth(),
        },
      },
    });

    usage.monthlyImportsUsed = importsThisMonth;
    usage.monthlyImportsRemaining = Math.max(limits.maxMonthlyImports - importsThisMonth, 0);

    if (importsThisMonth >= limits.maxMonthlyImports) {
      return {
        allowed: false,
        feature,
        reason: `Monthly import limit reached (${limits.maxMonthlyImports}) for the ${plan.toLowerCase()} plan.`,
        plan,
        status: subscription.status,
        limits,
        usage,
      };
    }
  }

  if (feature === 'upload_attachment') {
    if (!limits.canUploadAttachment || limits.maxAttachments <= 0) {
      return {
        allowed: false,
        feature,
        reason: `${FEATURE_LABELS[feature]} is not available on the ${plan.toLowerCase()} plan.`,
        plan,
        status: subscription.status,
        limits,
        usage,
      };
    }

    const attachmentCount = await prisma.attachment.count({
      where: { userId },
    });

    usage.attachmentsUsed = attachmentCount;
    usage.attachmentsRemaining = Math.max(limits.maxAttachments - attachmentCount, 0);

    if (attachmentCount >= limits.maxAttachments) {
      return {
        allowed: false,
        feature,
        reason: `Attachment limit reached (${limits.maxAttachments}) for the ${plan.toLowerCase()} plan.`,
        plan,
        status: subscription.status,
        limits,
        usage,
      };
    }
  }

  if (feature === 'advanced_analytics' && !limits.hasAdvancedAnalytics) {
    return {
      allowed: false,
      feature,
      reason: `${FEATURE_LABELS[feature]} requires Pro or Enterprise plan.`,
      plan,
      status: subscription.status,
      limits,
      usage,
    };
  }

  return {
    allowed: true,
    feature,
    plan,
    status: subscription.status,
    limits,
    usage,
  };
}

export async function assertFeatureAccess(userId: string, feature: SubscriptionFeature): Promise<SubscriptionCheckResult> {
  const result = await checkSubscription(userId, feature);

  if (!result.allowed) {
    const error = new Error(result.reason || 'Subscription feature unavailable') as FeatureAccessError;
    error.statusCode = 403;
    error.details = result;
    throw error;
  }

  return result;
}

export function toFeatureDeniedResponsePayload(result: SubscriptionCheckResult) {
  return {
    error: result.reason || 'Feature unavailable for your plan',
    feature: result.feature,
    plan: result.plan.toLowerCase(),
    status: result.status.toLowerCase(),
    usage: result.usage,
  };
}
