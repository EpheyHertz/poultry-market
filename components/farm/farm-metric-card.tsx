import { type LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

type FarmMetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  helperText: string;
  tone?: 'green' | 'orange' | 'blue' | 'red';
};

const toneClasses: Record<NonNullable<FarmMetricCardProps['tone']>, string> = {
  green: 'text-pfs-green bg-pfs-green/10',
  orange: 'text-pfs-accent bg-pfs-accent/10',
  blue: 'text-pfs-info bg-pfs-info/10',
  red: 'text-pfs-danger bg-pfs-danger/10',
};

export function FarmMetricCard({
  icon: Icon,
  label,
  value,
  helperText,
  tone = 'green',
}: FarmMetricCardProps) {
  return (
    <Card className="border-pfs-muted shadow-sm shadow-black/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
          </div>

          <div className={`rounded-2xl p-3 ${toneClasses[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}