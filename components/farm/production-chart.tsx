'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart } from '@/components/charts/line-chart';

interface ProductionChartProps {
  data: Array<{ date: string; eggs: number; damaged: number }>;
}

export function ProductionChart({ data }: ProductionChartProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Daily Egg Production</CardTitle>
        <CardDescription>Last 30 days of production and damaged eggs</CardDescription>
      </CardHeader>
      <CardContent>
        <LineChart
          data={data}
          xKey="date"
          series={[
            { dataKey: 'eggs', name: 'Eggs', color: '#10B981', strokeWidth: 3 },
            { dataKey: 'damaged', name: 'Damaged', color: '#F59E0B', strokeWidth: 2 },
          ]}
          xTickFormatter={(value) => value}
          yTickFormatter={(value) => `${value}`}
          tooltipFormatter={(value, name) => [`${value}`, name]}
          tooltipLabelFormatter={(label) => label}
        />
      </CardContent>
    </Card>
  );
}