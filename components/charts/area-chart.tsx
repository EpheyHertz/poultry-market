'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { ChartContainer } from './chart-container';

export interface AreaSeriesConfig {
  dataKey: string;
  name: string;
  color: string;
  fillOpacity?: number;
}

interface ReusableAreaChartProps<T extends Record<string, unknown>> {
  data: T[];
  xKey: keyof T & string;
  series: AreaSeriesConfig[];
  className?: string;
  heightClassName?: string;
  xTickFormatter?: (value: string) => string;
  yTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => [string, string];
  tooltipLabelFormatter?: (label: string) => string;
}

export function AreaChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  className,
  heightClassName,
  xTickFormatter,
  yTickFormatter,
  tooltipFormatter,
  tooltipLabelFormatter,
}: ReusableAreaChartProps<T>) {
  const { isMobile } = useResponsive();
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  const visibleSeries = useMemo(
    () => series.filter((item) => !hiddenSeries.includes(item.dataKey)),
    [series, hiddenSeries]
  );

  return (
    <ChartContainer className={cn(className)} heightClassName={heightClassName}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey={xKey}
          tickFormatter={xTickFormatter}
          tick={{ fontSize: isMobile ? 11 : 12 }}
          interval={isMobile ? 'preserveStartEnd' : 0}
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
        {!isMobile && (
          <Legend
            onClick={(payload) => {
              const key = payload.dataKey?.toString() || payload.value?.toString() || '';
              if (!key) return;
              setHiddenSeries((current) =>
                current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
              );
            }}
            wrapperStyle={{ paddingTop: 12, fontSize: 13 }}
          />
        )}
        {visibleSeries.map((item) => (
          <Area
            key={item.dataKey}
            type="monotone"
            dataKey={item.dataKey}
            name={item.name}
            stroke={item.color}
            fill={item.color}
            fillOpacity={item.fillOpacity ?? 0.25}
            strokeWidth={2}
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  );
}