import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { DashboardContent, DashboardGrid, DashboardCard, DashboardSection } from '@/components/layout/dashboard-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bird, PackageCheck, ShieldCheck, Truck, TimerReset } from 'lucide-react';
import { FlockTable } from '@/components/flocks';
import { toFlockViewModel } from '@/lib/flocks';
import { Button } from '@/components/ui/button';

export default async function AdminFlocksPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  const [flocks, pendingEvents] = await Promise.all([
    prisma.livestockFlock.findMany({
      include: {
        vaccinationsGiven: true,
        medicationsGiven: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.pendingEvent.count({ where: { entityType: 'flock', status: { in: ['PENDING', 'FAILED'] } } }),
  ]);

  const flockViews = flocks.map(toFlockViewModel);
  const deliveryCount = flockViews.filter((flock) => flock.deliveryAvailable).length;
  const readyCount = flockViews.filter((flock) => flock.productStage === 'READY_FOR_SALE').length;
  const soldCount = flockViews.filter((flock) => flock.status === 'SOLD').length;

  return (
    <DashboardLayout user={user}>
      <DashboardContent
        title="Global flock overview"
        description="Admin visibility across all seller flock records, lifecycle states, delivery coverage, and sync health."
      >
        <DashboardSection>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">All flocks</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Global internal records, not public listings.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin/sync-status">View sync status</Link>
            </Button>
          </div>

          <DashboardGrid cols={{ sm: 1, md: 2, lg: 4 }} gap="md">
            <DashboardCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total flocks</p>
                  <p className="text-2xl font-bold">{flockViews.length}</p>
                </div>
                <Bird className="h-5 w-5 text-emerald-600" />
              </div>
            </DashboardCard>
            <DashboardCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ready for sale</p>
                  <p className="text-2xl font-bold">{readyCount}</p>
                </div>
                <PackageCheck className="h-5 w-5 text-violet-600" />
              </div>
            </DashboardCard>
            <DashboardCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery available</p>
                  <p className="text-2xl font-bold">{deliveryCount}</p>
                </div>
                <Truck className="h-5 w-5 text-orange-600" />
              </div>
            </DashboardCard>
            <DashboardCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending sync events</p>
                  <p className="text-2xl font-bold">{pendingEvents}</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
            </DashboardCard>
          </DashboardGrid>

          <Card>
            <CardHeader>
              <CardTitle>Lifecycle summary</CardTitle>
              <CardDescription>Fleet-level state mix for operational planning</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{soldCount} sold</Badge>
              <Badge variant="outline">Seller ID preserved only</Badge>
              <Badge variant="outline">No phone, email, or WhatsApp in flock payloads</Badge>
            </CardContent>
          </Card>

          <FlockTable flocks={flockViews} editBasePath="/seller/flocks" />
        </DashboardSection>
      </DashboardContent>
    </DashboardLayout>
  );
}