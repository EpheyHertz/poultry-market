'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart } from '@/components/charts/pie-chart';

interface SalesPieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export function SalesPieChart({ data }: SalesPieChartProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Sales by Product Type</CardTitle>
        <CardDescription>Revenue mix for eggs, meat, and live birds</CardDescription>
      </CardHeader>
      <CardContent>
        <PieChart data={data} />
      </CardContent>
    </Card>
  );
}