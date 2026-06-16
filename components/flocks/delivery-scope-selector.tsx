'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LivestockDeliveryScope } from '@prisma/client';

interface DeliveryScopeSelectorProps {
  value: LivestockDeliveryScope;
  onValueChange: (value: LivestockDeliveryScope) => void;
}

const labels: Record<LivestockDeliveryScope, string> = {
  FARM_PICKUP: 'Farm pickup',
  LOCAL: 'Local',
  COUNTYWIDE: 'Countywide',
  COUNTRYWIDE: 'Countrywide',
};

export function DeliveryScopeSelector({ value, onValueChange }: DeliveryScopeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="deliveryScope">Delivery scope</Label>
      <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as LivestockDeliveryScope)}>
        <SelectTrigger id="deliveryScope">
          <SelectValue placeholder="Select delivery scope" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(labels).map(([scope, label]) => (
            <SelectItem key={scope} value={scope}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}