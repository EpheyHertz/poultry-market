import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flock, FlockStatus } from '@/contexts/farm-context';
import { Edit2, Trash2 } from 'lucide-react';

interface FlockTableProps {
  flocks: Flock[];
  onEdit?: (flock: Flock) => void;
  onDelete?: (flockId: string) => void;
}

const statusColors: Record<FlockStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  SOLD: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CULLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PROCESSING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function FlockTable({ flocks, onEdit, onDelete }: FlockTableProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Flocks</CardTitle>
        <CardDescription>Manage all poultry flocks</CardDescription>
      </CardHeader>
      <CardContent>
        {flocks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No flocks added yet. Create your first flock to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-muted-foreground">
                  <th className="text-left py-3 px-2 font-semibold">Name</th>
                  <th className="text-left py-3 px-2 font-semibold">Breed</th>
                  <th className="text-left py-3 px-2 font-semibold">Quantity</th>
                  <th className="text-left py-3 px-2 font-semibold">Status</th>
                  <th className="text-left py-3 px-2 font-semibold">Mortality</th>
                  <th className="text-left py-3 px-2 font-semibold">FCR</th>
                  <th className="text-left py-3 px-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flocks.map((flock) => (
                  <tr
                    key={flock.id}
                    className="border-b border-border hover:bg-card/70 transition-colors"
                  >
                    <td className="py-3 px-2 font-medium">{flock.name}</td>
                    <td className="py-3 px-2">{flock.breed}</td>
                    <td className="py-3 px-2">{flock.quantity.toLocaleString()}</td>
                    <td className="py-3 px-2">
                      <Badge className={statusColors[flock.status]}>
                        {flock.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2">{flock.mortality.toFixed(2)}%</td>
                    <td className="py-3 px-2">{flock.FCR.toFixed(2)}</td>
                    <td className="py-3 px-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit?.(flock)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete?.(flock.id)}
                        className="h-8 w-8 p-0 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
