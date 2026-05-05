import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type EggAnalyticsGroupBy = 'day' | 'week' | 'month';

const GROUP_BY_LITERAL: Record<EggAnalyticsGroupBy, string> = {
  day: "'day'",
  week: "'week'",
  month: "'month'",
};

export async function getEggAnalytics(params: {
  userId: string;
  farmId?: string;
  from: Date;
  to: Date;
  groupBy: EggAnalyticsGroupBy;
}) {
  const { userId, farmId, from, to, groupBy } = params;
  const groupBySql = Prisma.raw(GROUP_BY_LITERAL[groupBy]);
  const scopeClause = farmId
    ? Prisma.sql`"farmId" = ${farmId}`
    : Prisma.sql`"userId" = ${userId}`;

  const rows = await prisma.$queryRaw<
    Array<{
      period: Date;
      totalEggs: number;
      totalDamaged: number;
      entries: number;
      avgPerEntry: number;
    }>
  >(Prisma.sql`
    SELECT
      DATE_TRUNC(${groupBySql}, "recordedOn") AS "period",
      SUM("quantity")::int AS "totalEggs",
      SUM("damagedCount")::int AS "totalDamaged",
      COUNT(*)::int AS "entries",
      ROUND(AVG("quantity")::numeric, 2)::float AS "avgPerEntry"
    FROM "egg_records"
    WHERE ${scopeClause}
      AND "recordedOn" >= ${from}
      AND "recordedOn" <= ${to}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalEggs += Number(row.totalEggs || 0);
      acc.totalDamaged += Number(row.totalDamaged || 0);
      acc.entries += Number(row.entries || 0);
      return acc;
    },
    { totalEggs: 0, totalDamaged: 0, entries: 0 }
  );

  return {
    rows,
    totals: {
      ...totals,
      avgPerEntry: totals.entries > 0 ? Number((totals.totalEggs / totals.entries).toFixed(2)) : 0,
    },
  };
}
