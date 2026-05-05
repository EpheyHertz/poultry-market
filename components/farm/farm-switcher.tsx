'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface FarmOption {
  id: string;
  name: string;
  subscriptionPlan?: string;
}

interface FarmSwitcherProps {
  value?: string | null;
  onChange?: (farmId: string) => void;
  redirectTo?: string;
}

export function FarmSwitcher({ value, onChange, redirectTo = '/farm/dashboard' }: FarmSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadFarms = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/farms', { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to fetch farms');
        }

        if (active) {
          setFarms((payload.farms || []).map((farm: FarmOption) => ({
            id: farm.id,
            name: farm.name,
            subscriptionPlan: farm.subscriptionPlan,
          })));
        }
      } catch {
        if (active) {
          setFarms([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadFarms();

    return () => {
      active = false;
    };
  }, []);

  const selectedFarm = useMemo(() => farms.find((farm) => farm.id === value), [farms, value]);

  const handleSelect = (farmId: string) => {
    onChange?.(farmId);
    setOpen(false);
    router.push(`${redirectTo}?farmId=${encodeURIComponent(farmId)}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between gap-2 rounded-2xl">
          <span className="flex min-w-0 items-center gap-2 truncate text-left">
            <span className="truncate font-medium">{selectedFarm?.name || 'Select farm'}</span>
            {selectedFarm?.subscriptionPlan && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {selectedFarm.subscriptionPlan}
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search farms..." />
          <CommandList>
            <CommandEmpty>{loading ? 'Loading farms...' : 'No farms found.'}</CommandEmpty>
            <CommandGroup heading="Your Farms">
              {farms.map((farm) => (
                <CommandItem key={farm.id} value={farm.id} onSelect={() => handleSelect(farm.id)}>
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="truncate">{farm.name}</span>
                    {farm.subscriptionPlan && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {farm.subscriptionPlan}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem onSelect={() => router.push('/farm/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create farm
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
