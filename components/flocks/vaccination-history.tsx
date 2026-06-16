'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface VaccinationHistoryRecord {
  id: string;
  name: string;
  dateGiven: string;
  nextDue: string | null;
}

interface VaccinationHistoryProps {
  records: VaccinationHistoryRecord[];
  title?: string;
  emptyText?: string;
}

export function VaccinationHistory({
  records,
  title = 'Vaccination history',
  emptyText = 'No vaccinations recorded yet.',
}: VaccinationHistoryProps) {
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
                <Badge variant="secondary">Vaccination</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Given on {new Date(record.dateGiven).toLocaleDateString()}
                {record.nextDue ? ` • Next due ${new Date(record.nextDue).toLocaleDateString()}` : ''}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}