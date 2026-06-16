'use client';

import { Badge } from '@/components/ui/badge';
import { LivestockFlockStatus } from '@prisma/client';

interface FlockStatusBadgeProps {
  status: LivestockFlockStatus;
  className?: string;
}

const statusClasses: Record<LivestockFlockStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  SOLD: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  HARVESTED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  INACTIVE: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
};

export function FlockStatusBadge({ status, className = '' }: FlockStatusBadgeProps) {
  return (
    <Badge className={`${statusClasses[status]} ${className}`}>
      {status.replaceAll('_', ' ').toLowerCase()}
    </Badge>
  );
}