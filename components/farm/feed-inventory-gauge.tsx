import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeedInventory } from '@/contexts/farm-context';
import { AlertTriangle } from 'lucide-react';
import { GaugeChart } from '@/components/charts/gauge-chart';

interface FeedInventoryGaugeProps {
  feed: FeedInventory;
}

export function FeedInventoryGauge({ feed }: FeedInventoryGaugeProps) {
  const maxStock = Math.max(feed.reorderLevel * 2, 1);
  const percentage = (feed.quantity / maxStock) * 100;
  const isLowStock = feed.quantity <= feed.reorderLevel;
  
  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{feed.feedType}</CardTitle>
            <CardDescription>{feed.supplier}</CardDescription>
          </div>
          {isLowStock && (
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <GaugeChart
            value={Math.min(percentage, 100)}
            label="Feed stock"
            color={isLowStock ? '#F97316' : '#10B981'}
            heightClassName="h-32"
          />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stock Level</span>
            <span className="font-semibold">
              {feed.quantity} / {maxStock} {feed.unit}
            </span>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Cost: ${(feed.costPerUnit * feed.quantity).toFixed(2)}</span>
            <span>Unit: ${feed.costPerUnit.toFixed(2)}</span>
          </div>
          
          {isLowStock && (
            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-2">
              ⚠️ Low stock - consider reordering
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
