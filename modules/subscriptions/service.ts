import type { SubscriptionPlan } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PLAN_DURATION_DAYS, PLAN_PRICE_KES } from './plan-config';

type PaidPlan = Exclude<SubscriptionPlan, 'FREE'>;

const PLAN_PARSE_MAP: Record<string, PaidPlan> = {
  basic: 'BASIC',
  pro: 'PRO',
  enterprise: 'ENTERPRISE',
};

export function parsePaidPlan(input: string): PaidPlan | null {
  return PLAN_PARSE_MAP[input.toLowerCase()] || null;
}

export function buildSubscriptionApiRef(userId: string, plan: PaidPlan): string {
  return `subscription-${userId}-${plan.toLowerCase()}-${Date.now()}`;
}

export function parseSubscriptionApiRef(apiRef: string): { userId: string; plan: PaidPlan } | null {
  const parts = apiRef.split('-');

  if (parts.length < 4 || parts[0] !== 'subscription') {
    return null;
  }

  const plan = parsePaidPlan(parts[parts.length - 2]);
  if (!plan) {
    return null;
  }

  const userId = parts.slice(1, parts.length - 2).join('-');
  if (!userId) {
    return null;
  }

  return { userId, plan };
}

export function getSubscriptionPrice(plan: PaidPlan): number {
  return PLAN_PRICE_KES[plan];
}

export function getSubscriptionEndDate(plan: PaidPlan, from: Date = new Date()): Date {
  const days = PLAN_DURATION_DAYS[plan];
  const endDate = new Date(from);
  endDate.setDate(endDate.getDate() + days);
  return endDate;
}

export async function ensureFarmEmailPreference(userId: string) {
  return prisma.farmEmailPreference.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
    },
  });
}

interface ActivateSubscriptionInput {
  userId: string;
  plan: PaidPlan;
  intaSendRef?: string | null;
  paymentReference?: string | null;
  startsAt?: Date;
}

export async function activateSubscription(input: ActivateSubscriptionInput) {
  const startDate = input.startsAt || new Date();
  const endDate = getSubscriptionEndDate(input.plan, startDate);

  const subscription = await prisma.subscription.upsert({
    where: { userId: input.userId },
    update: {
      plan: input.plan,
      status: 'ACTIVE',
      intaSendRef: input.intaSendRef || null,
      paymentReference: input.paymentReference || null,
      startDate,
      endDate,
    },
    create: {
      userId: input.userId,
      plan: input.plan,
      status: 'ACTIVE',
      intaSendRef: input.intaSendRef || null,
      paymentReference: input.paymentReference || null,
      startDate,
      endDate,
    },
  });

  await ensureFarmEmailPreference(input.userId);

  return subscription;
}

interface DeactivateSubscriptionInput {
  userId: string;
  plan?: SubscriptionPlan;
  intaSendRef?: string | null;
  paymentReference?: string | null;
}

export async function deactivateSubscription(input: DeactivateSubscriptionInput) {
  const current = await prisma.subscription.findUnique({
    where: { userId: input.userId },
  });

  if (!current) {
    return prisma.subscription.create({
      data: {
        userId: input.userId,
        plan: input.plan || 'FREE',
        status: 'INACTIVE',
        intaSendRef: input.intaSendRef || null,
        paymentReference: input.paymentReference || null,
      },
    });
  }

  return prisma.subscription.update({
    where: { userId: input.userId },
    data: {
      plan: input.plan || current.plan,
      status: 'INACTIVE',
      intaSendRef: input.intaSendRef || current.intaSendRef,
      paymentReference: input.paymentReference || current.paymentReference,
    },
  });
}

export async function getUserSubscriptionSnapshot(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return prisma.subscription.create({
      data: {
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
        startDate: new Date(),
      },
    });
  }

  return subscription;
}

export async function reconcileExpiredSubscriptions() {
  const result = await prisma.subscription.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        lt: new Date(),
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return result.count;
}
