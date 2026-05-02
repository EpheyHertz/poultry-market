'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart } from '@/components/charts/area-chart';

interface MortalityChartProps {
  data: Array<{ week: string; mortalityRate: number }>;
}

export function MortalityChart({ data }: MortalityChartProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Mortality Rate Trend</CardTitle>
        <CardDescription>Weekly mortality trend over the last 12 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <AreaChart
          data={data}
          xKey="week"
          series={[{ dataKey: 'mortalityRate', name: 'Mortality Rate', color: '#EF4444', fillOpacity: 0.28 }]}
          yTickFormatter={(value) => `${value.toFixed(1)}%`}
          tooltipFormatter={(value) => [`${value.toFixed(1)}%`, 'Mortality Rate']}
          tooltipLabelFormatter={(label) => label}
        />
      </CardContent>
    </Card>
  );
}