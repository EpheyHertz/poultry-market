'use client';

import { Badge } from '@/components/ui/badge';
import { LivestockProductStage } from '@prisma/client';

interface ProductStageBadgeProps {
  stage: LivestockProductStage;
  className?: string;
}

const stageClasses: Record<LivestockProductStage, string> = {
  CHICK: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  GROWER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  FINISHER: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  READY_FOR_SALE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  SOLD: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
};

export function ProductStageBadge({ stage, className = '' }: ProductStageBadgeProps) {
  return (
    <Badge className={`${stageClasses[stage]} ${className}`}>
      {stage.replaceAll('_', ' ').toLowerCase()}
    </Badge>
  );
}