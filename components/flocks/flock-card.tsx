'use client';

import Link from 'next/link';
import { Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AgeDisplay } from './age-display';
import { FlockStatusBadge } from './flock-status-badge';
import { ProductStageBadge } from './product-stage-badge';
import { LivestockFlockViewModel } from '@/lib/flocks';

interface FlockCardProps {
  flock: LivestockFlockViewModel;
  basePath: string;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

export function FlockCard({ flock, basePath, canDelete = true, onDelete }: FlockCardProps) {
  return (
    <Card className="overflow-hidden border-border/60 bg-card">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold leading-tight">{flock.title}</h3>
            <p className="text-sm text-muted-foreground">{flock.breed} • {flock.location}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <FlockStatusBadge status={flock.status} />
            <ProductStageBadge stage={flock.productStage} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AgeDisplay days={flock.currentAgeDays} months={flock.currentAgeMonths} />
          <span className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
            Qty {flock.quantity.toLocaleString()}
          </span>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">{flock.description}</p>

        <div className="flex flex-wrap gap-2">
          <Link href={`${basePath}/${flock.id}/edit`}>
            <Button size="sm" variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          {canDelete && onDelete && (
            <Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(flock.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}