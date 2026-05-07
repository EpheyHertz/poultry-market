'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeToggleLarge } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { FarmSwitcher } from '@/components/farm/farm-switcher';
import { FarmMetricCard } from '@/components/farm/farm-metric-card';
import { ProductionChart } from '@/components/farm/production-chart';
import { useFarm } from '@/contexts/farm-context';
import { Activity, CalendarDays, Egg, Leaf, PiggyBank, Syringe } from 'lucide-react';

type DashboardMetrics = {
  todayEggs: number;
  todayDamaged: number;
  todayEntries: number;
  weekEggs: number;
  weekDamaged: number;
  weekEntries: number;
  weekAveragePerEntry: number;
  feedSpendWeek: number;
  activeFlockCount: number;
  attachmentCount: number;
  upcomingVaccinations: number;
};

type EggRecord = {
  id: string;
  recordedOn: string;
  quantity: number;
  damagedCount: number;
  flock?: { id: string; name: string } | null;
};

type ProductionPoint = { date: string; eggs: number; damaged: number };

const emptyMetrics: DashboardMetrics = {
  todayEggs: 0,
  todayDamaged: 0,
  todayEntries: 0,
  weekEggs: 0,
  weekDamaged: 0,
  weekEntries: 0,
  weekAveragePerEntry: 0,
  feedSpendWeek: 0,
  activeFlockCount: 0,
  attachmentCount: 0,
  upcomingVaccinations: 0,
};

function buildProductionSeries(records: EggRecord[], from: Date, to: Date): ProductionPoint[] {
  const byDate = new Map<string, { eggs: number; damaged: number }>();
  records.forEach((record) => {
    const dateKey = new Date(record.recordedOn).toISOString().split('T')[0];
    const current = byDate.get(dateKey) || { eggs: 0, damaged: 0 };
    byDate.set(dateKey, {
      eggs: current.eggs + (record.quantity || 0),
      damaged: current.damaged + (record.damagedCount || 0),
    });
  });

  const points: ProductionPoint[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const dateKey = cursor.toISOString().split('T')[0];
    const label = cursor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const entry = byDate.get(dateKey) || { eggs: 0, damaged: 0 };
    points.push({ date: label, eggs: entry.eggs, damaged: entry.damaged });
    cursor.setDate(cursor.getDate() + 1);
  }

  return points;
}

export default function PerformancePage() {
  const { activeFarmId, setActiveFarmId } = useFarm();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [production, setProduction] = useState<ProductionPoint[]>([]);
  const [recentEggs, setRecentEggs] = useState<EggRecord[]>([]);

  useEffect(() => {
    let active = true;

    const loadPerformance = async () => {
      if (!activeFarmId) {
        setMetrics(emptyMetrics);
        setProduction([]);
        setRecentEggs([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const from = new Date();
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        const to = new Date();

        const farmQuery = `farmId=${encodeURIComponent(activeFarmId)}`;
        const [dashboardRes, eggsRes] = await Promise.all([
          fetch(`/api/farm/dashboard?${farmQuery}`, { cache: 'no-store' }),
          fetch(
            `/api/egg-records?${farmQuery}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&pageSize=100`,
            { cache: 'no-store' }
          ),
        ]);

        const [dashboardBody, eggsBody] = await Promise.all([
          dashboardRes.json(),
          eggsRes.json(),
        ]);

        if (!dashboardRes.ok) {
          throw new Error(dashboardBody.error || 'Failed to load farm metrics');
        }
        if (!eggsRes.ok) {
          throw new Error(eggsBody.error || 'Failed to load production data');
        }

        if (active) {
          setMetrics({ ...emptyMetrics, ...(dashboardBody.metrics || {}) });
          setRecentEggs(dashboardBody.recentEggEntries || []);
          setProduction(buildProductionSeries(eggsBody.records || [], from, to));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load performance data');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPerformance();

    return () => {
      active = false;
    };
  }, [activeFarmId]);

  const recentRows = useMemo(() => recentEggs.slice(0, 6), [recentEggs]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Performance</h1>
          <p className="text-sm text-muted-foreground">Operational metrics and recent production activity.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="w-full sm:w-64">
            <FarmSwitcher value={activeFarmId} onChange={setActiveFarmId} redirectTo="/farm/performance" />
          </div>
          <ThemeToggleLarge />
        </div>
      </section>

      {!activeFarmId && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Select a farm to review performance metrics.
          </CardContent>
        </Card>
      )}

      {activeFarmId && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FarmMetricCard
              icon={Egg}
              label="Today’s eggs"
              value={metrics.todayEggs}
              helperText={`${metrics.todayDamaged} damaged · ${metrics.todayEntries} entries`}
            />
            <FarmMetricCard
              icon={CalendarDays}
              label="7-day output"
              value={metrics.weekEggs}
              helperText={`${metrics.weekDamaged} damaged · ${metrics.weekEntries} entries`}
              tone="blue"
            />
            <FarmMetricCard
              icon={Activity}
              label="Avg per entry"
              value={metrics.weekAveragePerEntry}
              helperText="7-day production average"
              tone="orange"
            />
            <FarmMetricCard
              icon={PiggyBank}
              label="Feed spend"
              value={`KES ${metrics.feedSpendWeek.toFixed(2)}`}
              helperText="Last 7 days"
              tone="red"
            />
            <FarmMetricCard
              icon={Leaf}
              label="Active flocks"
              value={metrics.activeFlockCount}
              helperText="Currently in production"
            />
            <FarmMetricCard
              icon={Syringe}
              label="Upcoming vaccines"
              value={metrics.upcomingVaccinations}
              helperText="Next 7 days"
              tone="blue"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <ProductionChart data={production} />

            <Card className="bg-card">
              <CardHeader>
                <CardTitle>Recent egg entries</CardTitle>
                <CardDescription>Latest production logs for this farm.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading entries...</p>
                ) : recentRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No egg entries recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentRows.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-border p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {entry.quantity} eggs
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.recordedOn).toLocaleDateString()} · {entry.flock?.name || 'Unassigned'}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">Damaged: {entry.damagedCount}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Data refreshes on page load.</span>
            <span>Export tools will be added alongside the reports module.</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="w-full sm:w-auto" variant="outline" disabled>
              Export CSV
            </Button>
            <Button className="w-full sm:w-auto" variant="outline" disabled>
              Export PDF
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
