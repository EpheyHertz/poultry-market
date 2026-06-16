import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { DashboardContent, DashboardGrid, DashboardCard, DashboardSection } from '@/components/layout/dashboard-content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Bird, TimerReset, TrendingUp } from 'lucide-react';
import { FlockLifecycleTimeline } from '@/components/flocks/flock-lifecycle-timeline';
import { toFlockViewModel } from '@/lib/flocks';

export default async function AdminLifecyclePage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  const flocks = await prisma.livestockFlock.findMany({
    include: {
      vaccinationsGiven: true,
      medicationsGiven: true,
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: 8,
  });

  const flockViewModels = flocks.map(toFlockViewModel);
  const averageAgeDays = flockViewModels.length
    ? Math.round(flockViewModels.reduce((sum, flock) => sum + flock.currentAgeDays, 0) / flockViewModels.length)
    : 0;

  return (
    <DashboardLayout user={user}>
      <DashboardContent>
        <DashboardSection>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lifecycle analytics</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track age, readiness, and operational stage across the livestock registry.
            </p>
          </div>
        </DashboardSection>

        <DashboardGrid cols={{ sm: 1, md: 3 }} gap="md">
          <DashboardCard>
            <p className="text-sm text-muted-foreground">Tracked flocks</p>
            <p className="text-2xl font-bold">{flockViewModels.length}</p>
          </DashboardCard>
          <DashboardCard>
            <p className="text-sm text-muted-foreground">Average age</p>
            <p className="text-2xl font-bold">{averageAgeDays} days</p>
          </DashboardCard>
          <DashboardCard>
            <p className="text-sm text-muted-foreground">Ready for sale</p>
            <p className="text-2xl font-bold">{flockViewModels.filter((flock) => flock.productStage === 'READY_FOR_SALE').length}</p>
          </DashboardCard>
        </DashboardGrid>

        <Card>
          <CardHeader>
            <CardTitle>Recent lifecycle snapshots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {flockViewModels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flocks available for analytics yet.</p>
            ) : (
              flockViewModels.map((flock) => (
                <FlockLifecycleTimeline
                  key={flock.id}
                  startRearingDate={flock.startRearingDate}
                  expectedReadyDate={flock.expectedReadyDate}
                  currentAgeDays={flock.currentAgeDays}
                  currentAgeMonths={flock.currentAgeMonths}
                  productStage={flock.productStage}
                />
              ))
            )}
          </CardContent>
        </Card>
      </DashboardContent>
    </DashboardLayout>
  );
}