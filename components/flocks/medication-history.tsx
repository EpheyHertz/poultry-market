'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface MedicationHistoryRecord {
  id: string;
  name: string;
  reason: string;
  dateGiven: string;
  durationDays: number;
}

interface MedicationHistoryProps {
  records: MedicationHistoryRecord[];
  title?: string;
  emptyText?: string;
}

export function MedicationHistory({
  records,
  title = 'Medication history',
  emptyText = 'No medications recorded yet.',
}: MedicationHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          records.map((record) => (
            <div key={record.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{record.name}</span>
                <Badge variant="secondary">Medication</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {record.reason} • {new Date(record.dateGiven).toLocaleDateString()} • {record.durationDays} days
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}