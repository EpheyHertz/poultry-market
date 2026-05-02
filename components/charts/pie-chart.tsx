'use client';

import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useResponsive } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { ChartContainer } from './chart-container';

interface PieSlice {
  name: string;
  value: number;
  color: string;
}

interface ReusablePieChartProps {
  data: PieSlice[];
  className?: string;
  heightClassName?: string;
}

export function PieChart({ data, className, heightClassName }: ReusablePieChartProps) {
  const { isMobile } = useResponsive();

  return (
    <ChartContainer className={cn(className)} heightClassName={heightClassName}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={isMobile ? 46 : 58}
          outerRadius={isMobile ? 82 : 108}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={!isMobile}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            fontSize: isMobile ? '12px' : '13px',
            borderRadius: '12px',
            borderColor: 'hsl(var(--border))',
            backgroundColor: 'hsl(var(--background))',
          }}
        />
        {!isMobile && <Legend wrapperStyle={{ paddingTop: 12, fontSize: 13 }} />}
      </RechartsPieChart>
    </ChartContainer>
  );
}