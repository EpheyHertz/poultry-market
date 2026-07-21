import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { DashboardContent, DashboardGrid, DashboardCard, DashboardSection } from '@/components/layout/dashboard-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bird, Plus, TrendingUp, Truck, ShieldCheck } from 'lucide-react';
import { FlockTable } from '@/components/flocks';
import { toFlockViewModel } from '@/lib/flocks';

export default async function SellerFlocksPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
    redirect('/auth/login');
  }

  const flocks = await prisma.livestockFlock.findMany({
    where: user.role === 'ADMIN' ? {} : { sellerId: user.id },
    include: {
      vaccinationsGiven: true,
      medicationsGiven: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const flockViews = flocks.map(toFlockViewModel);
  const activeCount = flockViews.filter((flock) => flock.status === 'ACTIVE').length;
  const readyCount = flockViews.filter((flock) => flock.productStage === 'READY_FOR_SALE').length;
  const deliveryCount = flockViews.filter((flock) => flock.deliveryAvailable).length;
  const totalBirds = flockViews.reduce((sum, flock) => sum + flock.quantity, 0);

  return (
    <DashboardLayout user={user}>
      <DashboardContent
        title="Flock Lifecycle"
        description="Track poultry batches, health history, delivery scope, and readiness from one internal dashboard."
      >
        <DashboardSection>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My flocks</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Internal livestock tracking for sellers and admins only.</p>
            </div>
            <Button asChild>
              <Link href="/seller/flocks/create">
                <Plus className="mr-2 h-4 w-4" /> New flock
              </Link>
            </Button>
          </div>

          <DashboardGrid cols={{ sm: 1, md: 2, lg: 4 }} gap="md">
            <DashboardCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Flocks</p>
                  <p className="text-2xl font-bold">{flockViews.length}</p>
                </div>
                <Bird className="h-5 w-5 text-emerald-600" />
              </div>
            </DashboardCard>
            <DashboardCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{activeCount}</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
            </DashboardCard>
            <DashboardCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ready for sale</p>
                  <p className="text-2xl font-bold">{readyCount}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-violet-600" />
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
          </DashboardGrid>

          <Card>
            <CardHeader>
              <CardTitle>Internal operational overview</CardTitle>
              <CardDescription>Total birds currently tracked across the module</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{totalBirds.toLocaleString()} birds</Badge>
              <Badge variant="outline">Seller contact data excluded from AI sync</Badge>
            </CardContent>
          </Card>

          <FlockTable flocks={flockViews} editBasePath="/seller/flocks" />
        </DashboardSection>
      </DashboardContent>
    </DashboardLayout>
  );
}