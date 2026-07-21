import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { getCurrentUser } from '@/lib/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { DashboardContent, DashboardGrid, DashboardCard, DashboardSection } from '@/components/layout/dashboard-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';

export default async function AdminSyncStatusPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  const [pendingEvents, failedCount, latestEvent] = await Promise.all([
    prisma.pendingEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.pendingEvent.count({ where: { status: 'PENDING' } }),
    prisma.pendingEvent.findFirst({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <DashboardLayout user={user}>
      <DashboardContent>
        <DashboardSection>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI sync status</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Monitor the queue that forwards sanitized flock events to the FastAPI intelligence layer.
            </p>
          </div>
        </DashboardSection>

        <DashboardGrid cols={{ sm: 1, md: 3 }} gap="md">
          <DashboardCard>
            <p className="text-sm text-muted-foreground">Pending events</p>
            <p className="text-2xl font-bold">{failedCount}</p>
          </DashboardCard>
          <DashboardCard>
            <p className="text-sm text-muted-foreground">Recent queue size</p>
            <p className="text-2xl font-bold">{pendingEvents.length}</p>
          </DashboardCard>
          <DashboardCard>
            <p className="text-sm text-muted-foreground">Latest update</p>
            <p className="text-sm font-medium">
              {latestEvent ? formatDistanceToNow(latestEvent.updatedAt, { addSuffix: true }) : 'No events yet'}
            </p>
          </DashboardCard>
        </DashboardGrid>

        <Card>
          <CardHeader>
            <CardTitle>Pending event queue</CardTitle>
            <CardDescription>Stored retry queue entries for flock sync operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending sync events.</p>
            ) : (
              pendingEvents.map((event) => (
                <div key={event.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{event.eventType} • {event.entityType}</div>
                    <div className="text-sm text-muted-foreground">Entity {event.entityId}</div>
                    {event.errorMessage && <div className="text-sm text-red-600">{event.errorMessage}</div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={event.status === 'FAILED' ? 'destructive' : 'secondary'}>{event.status}</Badge>
                    <Badge variant="outline">Retries: {event.retryCount}</Badge>
                    <Badge variant="outline">{formatDistanceToNow(event.createdAt, { addSuffix: true })}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </DashboardContent>
    </DashboardLayout>
  );
}