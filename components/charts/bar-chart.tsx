'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { ChartContainer } from './chart-container';

interface ReusableBarChartProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  color: string;
  className?: string;
  heightClassName?: string;
  xTickFormatter?: (value: string) => string;
  yTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  tooltipLabelFormatter?: (label: string) => string;
  barRadius?: [number, number, number, number];
}

export function BarChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color,
  className,
  heightClassName,
  xTickFormatter,
  yTickFormatter,
  tooltipFormatter,
  tooltipLabelFormatter,
  barRadius = [8, 8, 0, 0],
}: ReusableBarChartProps<T>) {
  const { isMobile } = useResponsive();

  return (
    <ChartContainer className={cn(className)} heightClassName={heightClassName}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey={xKey}
          tickFormatter={xTickFormatter}
          tick={{ fontSize: isMobile ? 11 : 12 }}
          interval={0}
          minTickGap={isMobile ? 18 : 12}
        />
        <YAxis tickFormatter={yTickFormatter} tick={{ fontSize: isMobile ? 11 : 12 }} width={isMobile ? 36 : 44} />
        <Tooltip
          contentStyle={{
            fontSize: isMobile ? '12px' : '13px',
            borderRadius: '12px',
            borderColor: 'hsl(var(--border))',
            backgroundColor: 'hsl(var(--background))',
          }}
          formatter={tooltipFormatter}
          labelFormatter={tooltipLabelFormatter}
        />
        {!isMobile && <Legend wrapperStyle={{ paddingTop: 12, fontSize: 13 }} />}
        <Bar dataKey={yKey} fill={color} radius={barRadius} />
      </RechartsBarChart>
    </ChartContainer>
  );
}