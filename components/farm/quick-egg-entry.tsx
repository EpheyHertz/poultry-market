'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type QuickEggEntryProps = {
  saving: boolean;
  flockOptions: Array<{ id: string; name: string; birdCount: number }>;
  onSave: (payload: {
    quantity: number;
    damagedCount: number;
    flockId?: string;
    notes?: string;
  }) => Promise<void>;
};

const QUICK_COUNTS = [30, 60, 90, 120, 150];

export function QuickEggEntry({ saving, flockOptions, onSave }: QuickEggEntryProps) {
  const [quantity, setQuantity] = useState('30');
  const [damagedCount, setDamagedCount] = useState('0');
  const [flockId, setFlockId] = useState('none');
  const [notes, setNotes] = useState('');

  const parsedQuantity = useMemo(() => Number(quantity || '0') || 0, [quantity]);
  const parsedDamaged = useMemo(() => Number(damagedCount || '0') || 0, [damagedCount]);

  const submit = async (value: number) => {
    setQuantity(String(value));
    await onSave({
      quantity: value,
      damagedCount: parsedDamaged,
      flockId: flockId === 'none' ? undefined : flockId,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Card className="border-pfs-muted bg-gradient-to-br from-white to-pfs-beige/40 shadow-sm shadow-black/5">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg text-pfs-green-700">Quick Egg Entry</CardTitle>
            <CardDescription>Fast daily logging with one-tap counts and a simple save flow.</CardDescription>
          </div>
          <div className="rounded-full bg-pfs-accent/15 p-2 text-pfs-accent">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {QUICK_COUNTS.map((value) => (
            <Button
              key={value}
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => void submit(value)}
              className="rounded-2xl bg-card text-foreground shadow-sm hover:bg-pfs-muted"
            >
              {value}
            </Button>
          ))}
        </div>

        <div className="rounded-2xl border border-pfs-muted bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={saving}
              onClick={() => setQuantity(String(Math.max(0, parsedQuantity - 1)))}
              className="h-12 w-12 rounded-full border-pfs-muted bg-pfs-muted/40"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="flex-1 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Today&apos;s eggs</p>
              <Input
                inputMode="numeric"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-2 h-16 border-0 bg-transparent text-center text-5xl font-semibold tracking-tight shadow-none focus-visible:ring-0"
                aria-label="Egg quantity"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={saving}
              onClick={() => setQuantity(String(parsedQuantity + 1))}
              className="h-12 w-12 rounded-full border-pfs-muted bg-pfs-muted/40"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Use the +/- buttons for fast changes or type the exact count.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Damaged eggs</label>
            <Input
              inputMode="numeric"
              value={damagedCount}
              onChange={(event) => setDamagedCount(event.target.value)}
              placeholder="0"
              className="rounded-2xl bg-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Flock</label>
            <Select value={flockId} onValueChange={setFlockId}>
              <SelectTrigger className="rounded-2xl bg-input">
                <SelectValue placeholder="Select flock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No flock selected</SelectItem>
                {flockOptions.map((flock) => (
                  <SelectItem key={flock.id} value={flock.id}>
                    {flock.name} ({flock.birdCount} birds)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add a short note for weather, feed, or quality"
            className="min-h-[88px] rounded-2xl bg-input"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={saving || parsedQuantity <= 0}
            onClick={() => void onSave({
              quantity: Math.round(parsedQuantity),
              damagedCount: Math.max(0, Math.round(parsedDamaged)),
              flockId: flockId === 'none' ? undefined : flockId,
              notes: notes.trim() || undefined,
            })}
            className="w-full rounded-2xl bg-pfs-accent text-white hover:bg-pfs-accent/95 sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Record'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-2xl border-pfs-muted bg-card sm:w-auto"
            disabled={saving}
            onClick={() => {
              setQuantity('30');
              setDamagedCount('0');
              setFlockId('none');
              setNotes('');
            }}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}