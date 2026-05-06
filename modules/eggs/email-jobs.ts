import { prisma } from '@/lib/prisma';
import { sendReminderEmail } from '@/lib/email';
import {
  dailyEggReminderTemplate,
  farmAlertsTemplate,
  weeklySummaryTemplate,
} from './email-templates';

type JobError = { userId: string; error: string };

type JobResult = {
  processed: number;
  sent: number;
  skipped: number;
  errors: JobError[];
};

function createResult(): JobResult {
  return {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [],
  };
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday(): Date {
  const start = startOfToday();
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return end;
}

function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}

export async function runDailyEggReminderJob(): Promise<JobResult> {
  const result = createResult();
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      farmEmailPreference: {
        select: {
          dailyReminder: true,
        },
      },
    },
  });

  const loggedToday = await prisma.eggRecord.groupBy({
    by: ['userId'],
    where: {
      recordedOn: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
  });

  const loggedTodaySet = new Set(loggedToday.map((row) => row.userId));

  for (const user of users) {
    result.processed += 1;

    const enabled = user.farmEmailPreference?.dailyReminder ?? true;
    if (!enabled) {
      result.skipped += 1;
      continue;
    }

    if (loggedTodaySet.has(user.id)) {
      result.skipped += 1;
      continue;
    }

    try {
      const content = dailyEggReminderTemplate(user.name || 'Farmer');
      await sendReminderEmail({
        to: user.email!,
        subject: content.subject,
        html: content.html,
      });
      result.sent += 1;
    } catch (error) {
      result.errors.push({
        userId: user.id,
        error: error instanceof Error ? error.message : 'Failed to send reminder',
      });
    }
  }

  return result;
}

export async function runWeeklySummaryJob(): Promise<JobResult> {
  const result = createResult();

  const endDate = endOfToday();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      farmEmailPreference: {
        select: {
          weeklySummary: true,
        },
      },
    },
  });

  for (const user of users) {
    result.processed += 1;

    const enabled = user.farmEmailPreference?.weeklySummary ?? true;
    if (!enabled) {
      result.skipped += 1;
      continue;
    }

    const records = await prisma.eggRecord.findMany({
      where: {
        userId: user.id,
        recordedOn: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        quantity: true,
      },
    });

    if (records.length === 0) {
      result.skipped += 1;
      continue;
    }

    const totalEggs = records.reduce((sum, record) => sum + record.quantity, 0);
    const averagePerDay = totalEggs / 7;

    try {
      const content = weeklySummaryTemplate({
        name: user.name || 'Farmer',
        startDate,
        endDate: new Date(endDate.getTime() - 1),
        totalEggs,
        averagePerDay,
      });

      await sendReminderEmail({
        to: user.email!,
        subject: content.subject,
        html: content.html,
      });

      result.sent += 1;
    } catch (error) {
      result.errors.push({
        userId: user.id,
        error: error instanceof Error ? error.message : 'Failed to send weekly summary',
      });
    }
  }

  return result;
}

export async function runFarmAlertsJob(): Promise<JobResult> {
  const result = createResult();

  const inactivityDaysThreshold = Number(process.env.FARM_INACTIVITY_DAYS || 3);
  const vaccinationLookaheadDays = Number(process.env.FARM_VACCINATION_LOOKAHEAD_DAYS || 3);

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      farmEmailPreference: {
        select: {
          inactivityAlerts: true,
          vaccinationAlerts: true,
        },
      },
    },
  });

  const now = new Date();
  const upcomingUntil = new Date(now);
  upcomingUntil.setDate(upcomingUntil.getDate() + vaccinationLookaheadDays);

  for (const user of users) {
    result.processed += 1;

    const inactivityEnabled = user.farmEmailPreference?.inactivityAlerts ?? true;
    const vaccinationEnabled = user.farmEmailPreference?.vaccinationAlerts ?? true;

    if (!inactivityEnabled && !vaccinationEnabled) {
      result.skipped += 1;
      continue;
    }

    let inactivityDays: number | undefined;
    let lastRecordDate: Date | null = null;

    if (inactivityEnabled) {
      const lastRecord = await prisma.eggRecord.findFirst({
        where: { userId: user.id },
        orderBy: { recordedOn: 'desc' },
        select: { recordedOn: true },
      });

      lastRecordDate = lastRecord?.recordedOn || null;

      if (!lastRecordDate) {
        inactivityDays = inactivityDaysThreshold;
      } else {
        const days = daysBetween(lastRecordDate, now);
        if (days >= inactivityDaysThreshold) {
          inactivityDays = days;
        }
      }
    }

    let vaccinations: Array<{ vaccineName: string; scheduledDate: Date; flockName?: string | null }> = [];
    if (vaccinationEnabled) {
      const upcomingVaccinations = await prisma.vaccination.findMany({
        where: {
          userId: user.id,
          status: 'SCHEDULED',
          scheduledDate: {
            gte: now,
            lte: upcomingUntil,
          },
        },
        include: {
          flock: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { scheduledDate: 'asc' },
      });

      vaccinations = upcomingVaccinations.map((item) => ({
        vaccineName: item.vaccineName,
        scheduledDate: item.scheduledDate,
        flockName: item.flock?.name,
      }));
    }

    if (inactivityDays === undefined && vaccinations.length === 0) {
      result.skipped += 1;
      continue;
    }

    try {
      const content = farmAlertsTemplate({
        name: user.name || 'Farmer',
        inactivityDays,
        lastRecordDate,
        vaccinations,
      });

      await sendReminderEmail({
        to: user.email!,
        subject: content.subject,
        html: content.html,
      });

      result.sent += 1;
    } catch (error) {
      result.errors.push({
        userId: user.id,
        error: error instanceof Error ? error.message : 'Failed to send farm alert',
      });
    }
  }

  return result;
}
