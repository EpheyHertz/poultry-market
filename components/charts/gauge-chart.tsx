'use client';

import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  label: string;
  color?: string;
  className?: string;
  heightClassName?: string;
  lowThreshold?: number;
}

export function GaugeChart({
  value,
  label,
  color = '#10B981',
  className,
  heightClassName = 'h-36',
  lowThreshold = 35,
}: GaugeChartProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  const isLow = safeValue <= lowThreshold;

  return (
    <div className={cn('relative w-full', heightClassName, className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="58%"
          innerRadius="70%"
          outerRadius="100%"
          barSize={14}
          data={[{ name: label, value: safeValue, fill: color }]}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={12} fill={isLow ? '#F97316' : color} background />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-2xl font-bold text-foreground">{Math.round(safeValue)}%</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}