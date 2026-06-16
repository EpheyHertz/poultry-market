'use client';

import { CalendarDays, Clock3, Truck, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgeDisplay } from './age-display';
import { ProductStageBadge } from './product-stage-badge';
import { LivestockProductStage } from '@prisma/client';

interface FlockLifecycleTimelineProps {
  startRearingDate: string;
  expectedReadyDate: string;
  currentAgeDays: number;
  currentAgeMonths: number;
  productStage: LivestockProductStage;
}

export function FlockLifecycleTimeline({
  startRearingDate,
  expectedReadyDate,
  currentAgeDays,
  currentAgeMonths,
  productStage,
}: FlockLifecycleTimelineProps) {
  const items = [
    {
      title: 'Start rearing',
      icon: Clock3,
      detail: new Date(startRearingDate).toLocaleDateString(),
    },
    {
      title: 'Current age',
      icon: CalendarDays,
      detail: `${currentAgeDays} days (${currentAgeMonths} months)`,
    },
    {
      title: 'Expected ready date',
      icon: Truck,
      detail: new Date(expectedReadyDate).toLocaleDateString(),
    },
    {
      title: 'Current stage',
      icon: CheckCircle2,
      detail: <ProductStageBadge stage={productStage} />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lifecycle timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <AgeDisplay days={currentAgeDays} months={currentAgeMonths} />
          <ProductStageBadge stage={productStage} />
        </div>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}