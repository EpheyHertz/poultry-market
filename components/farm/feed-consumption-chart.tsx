'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart } from '@/components/charts/bar-chart';

interface FeedConsumptionChartProps {
  data: Array<{ flock: string; consumedKg: number }>;
}

export function FeedConsumptionChart({ data }: FeedConsumptionChartProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Feed Consumption by Flock</CardTitle>
        <CardDescription>Consumption over the current tracking window</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChart
          data={data}
          xKey="flock"
          yKey="consumedKg"
          color="#3B82F6"
          xTickFormatter={(value) => value}
          yTickFormatter={(value) => `${value}`}
          tooltipFormatter={(value) => [`${value} kg`, 'Consumed']}
          tooltipLabelFormatter={(label) => label}
        />
      </CardContent>
    </Card>
  );
}