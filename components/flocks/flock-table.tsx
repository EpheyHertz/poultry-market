'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LivestockFlockViewModel } from '@/lib/flocks';
import { AgeDisplay } from './age-display';
import { FlockCard } from './flock-card';
import { FlockStatusBadge } from './flock-status-badge';
import { ProductStageBadge } from './product-stage-badge';

interface FlockTableProps {
  flocks: LivestockFlockViewModel[];
  basePath: string;
  canDelete?: boolean;
  description?: string;
}

export function FlockTable({ flocks, basePath, canDelete = true, description = 'Manage livestock flocks' }: FlockTableProps) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this flock? This cannot be undone.');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/seller/flocks/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete flock');
      }

      toast.success('Flock deleted');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete flock');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My flocks</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {flocks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No flocks yet. Create your first internal flock record to start tracking lifecycle and health history.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4">Title</th>
                    <th className="py-3 pr-4">Breed</th>
                    <th className="py-3 pr-4">Bird type</th>
                    <th className="py-3 pr-4">Quantity</th>
                    <th className="py-3 pr-4">Age</th>
                    <th className="py-3 pr-4">Stage</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flocks.map((flock) => (
                    <tr key={flock.id} className="border-b last:border-0">
                      <td className="py-4 pr-4">
                        <div className="font-medium">{flock.title}</div>
                        <div className="text-xs text-muted-foreground">{flock.location}</div>
                      </td>
                      <td className="py-4 pr-4">{flock.breed}</td>
                      <td className="py-4 pr-4 capitalize">{flock.birdType.toLowerCase()}</td>
                      <td className="py-4 pr-4">{flock.quantity.toLocaleString()}</td>
                      <td className="py-4 pr-4">
                        <AgeDisplay days={flock.currentAgeDays} months={flock.currentAgeMonths} />
                      </td>
                      <td className="py-4 pr-4">
                        <ProductStageBadge stage={flock.productStage} />
                      </td>
                      <td className="py-4 pr-4">
                        <FlockStatusBadge status={flock.status} />
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`${basePath}/${flock.id}/edit`}>
                            <Button size="sm" variant="outline">
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          </Link>
                          {canDelete && (
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDelete(flock.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:hidden">
              {flocks.map((flock) => (
                <FlockCard key={flock.id} flock={flock} basePath={basePath} canDelete={canDelete} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}