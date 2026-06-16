'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Bird,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Clock3,
  Edit2,
  Eye,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  HeartPulse,
  Syringe,
  TimerReset,
} from 'lucide-react';
import type { LivestockFlockViewModel } from '@/lib/flocks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

type RecordDraft = {
  name: string;
  dateGiven: string;
  nextDue: string;
};

type MedicationDraft = {
  name: string;
  reason: string;
  dateGiven: string;
  durationDays: string;
};

type FlockFormValues = {
  title: string;
  breed: string;
  birdType: string;
  quantity: string;
  location: string;
  status: string;
  description: string;
  startRearingDate: string;
  expectedReadyDate: string;
  deliveryAvailable: boolean;
  deliveryScope: string;
  deliveryNotes: string;
};

type FlockFormProps = {
  mode: 'create' | 'edit';
  basePath: string;
  initialData?: LivestockFlockViewModel | null;
};

type FlockTableProps = {
  flocks: LivestockFlockViewModel[];
  editBasePath?: string;
};

type FlockCardProps = {
  flock: LivestockFlockViewModel;
  editBasePath?: string;
};

type BadgeTone = 'default' | 'secondary' | 'outline' | 'destructive';

const birdTypeLabels: Record<string, string> = {
  BROILER: 'Broiler',
  LAYER: 'Layer',
  KIENYEJI: 'Kienyeji',
  TURKEY: 'Turkey',
  OTHER: 'Other',
};

const deliveryScopeLabels: Record<string, string> = {
  FARM_PICKUP: 'Farm pickup',
  LOCAL: 'Local',
  COUNTYWIDE: 'Countywide',
  COUNTRYWIDE: 'Countrywide',
};

const statusTone: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  SOLD: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  HARVESTED: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  INACTIVE: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};

const stageTone: Record<string, string> = {
  CHICK: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  GROWER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  FINISHER: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  READY_FOR_SALE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  SOLD: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
};

export function FlockStatusBadge({ status }: { status: string }) {
  return <Badge className={statusTone[status] || statusTone.INACTIVE}>{status.replaceAll('_', ' ')}</Badge>;
}

export function ProductStageBadge({ stage }: { stage: string }) {
  return <Badge className={stageTone[stage] || stageTone.CHICK}>{stage.replaceAll('_', ' ')}</Badge>;
}

export function AgeDisplay({ days, months }: { days: number; months: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-3">
      <div>
        <div className="text-xs text-muted-foreground">Days</div>
        <div className="text-lg font-semibold">{days}</div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">Months</div>
        <div className="text-lg font-semibold">{months}</div>
      </div>
    </div>
  );
}

export function DeliveryScopeSelector({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Delivery scope</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select delivery scope" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(deliveryScopeLabels).map(([scope, label]) => (
            <SelectItem key={scope} value={scope}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function VaccinationHistory({ records }: { records: LivestockFlockViewModel['vaccinationsGiven'] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Syringe className="h-4 w-4" /> Vaccination history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vaccination records yet.</p>
        ) : (
          records.map((record) => (
            <div key={record.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{record.name}</p>
                  <p className="text-xs text-muted-foreground">Given {new Date(record.dateGiven).toLocaleDateString()}</p>
                </div>
                {record.nextDue && (
                  <Badge variant="secondary">Next due {new Date(record.nextDue).toLocaleDateString()}</Badge>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function MedicationHistory({ records }: { records: LivestockFlockViewModel['medicationsGiven'] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4" /> Medication history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medication records yet.</p>
        ) : (
          records.map((record) => (
            <div key={record.id} className="rounded-lg border p-3">
              <p className="font-medium">{record.name}</p>
              <p className="text-xs text-muted-foreground">{record.reason}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Given {new Date(record.dateGiven).toLocaleDateString()} · {record.durationDays} days
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function FlockLifecycleTimeline({ flock }: { flock: LivestockFlockViewModel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TimerReset className="h-4 w-4" /> Lifecycle timeline</CardTitle>
        <CardDescription>Lifecycle milestones and operational stage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <div>
            <p className="font-medium">Start rearing</p>
            <p className="text-sm text-muted-foreground">{new Date(flock.startRearingDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
          <div>
            <p className="font-medium">Current age</p>
            <p className="text-sm text-muted-foreground">{flock.currentAgeDays} days · {flock.currentAgeMonths} months</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-500" />
          <div>
            <p className="font-medium">Expected ready date</p>
            <p className="text-sm text-muted-foreground">{new Date(flock.expectedReadyDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-500" />
          <div>
            <p className="font-medium">Current product stage</p>
            <ProductStageBadge stage={flock.productStage} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FlockCard({ flock, editBasePath = '/seller/flocks' }: FlockCardProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Delete ${flock.title}?`)) return;

    try {
      const response = await fetch(`/api/seller/flocks/${flock.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete flock');
      toast.success('Flock deleted');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete flock');
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <FlockStatusBadge status={flock.status} />
              <ProductStageBadge stage={flock.productStage} />
            </div>
            <h3 className="text-lg font-semibold">{flock.title}</h3>
            <p className="text-sm text-muted-foreground">{flock.breed} · {birdTypeLabels[flock.birdType] || flock.birdType}</p>
          </div>
          <Bird className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Quantity</div>
            <div className="font-semibold">{flock.quantity.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Location</div>
            <div className="font-semibold">{flock.location}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Age</div>
            <div className="font-semibold">{flock.currentAgeDays}d</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Delivery</div>
            <div className="font-semibold">{flock.deliveryAvailable ? 'Available' : 'Disabled'}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${editBasePath}/${flock.id}/edit`}><Edit2 className="mr-2 h-4 w-4" /> Edit</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`${editBasePath}/${flock.id}/edit`}><Eye className="mr-2 h-4 w-4" /> View</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FlockTable({ flocks, editBasePath = '/seller/flocks' }: FlockTableProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete ${title}?`)) return;
    try {
      const response = await fetch(`/api/seller/flocks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete flock');
      toast.success('Flock deleted');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete flock');
    }
  };

  const refreshTable = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Flocks</CardTitle>
          <CardDescription>Operational poultry lifecycle records</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refreshTable} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {flocks.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No flocks found yet.</div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">Flock</th>
                    <th className="p-4 font-medium">Bird type</th>
                    <th className="p-4 font-medium">Quantity</th>
                    <th className="p-4 font-medium">Age</th>
                    <th className="p-4 font-medium">Stage</th>
                    <th className="p-4 font-medium">Delivery</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flocks.map((flock) => (
                    <tr key={flock.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="p-4">
                        <div className="font-medium">{flock.title}</div>
                        <div className="text-xs text-muted-foreground">{flock.breed} · {flock.location}</div>
                      </td>
                      <td className="p-4">{birdTypeLabels[flock.birdType] || flock.birdType}</td>
                      <td className="p-4">{flock.quantity.toLocaleString()}</td>
                      <td className="p-4">
                        <AgeDisplay days={flock.currentAgeDays} months={flock.currentAgeMonths} />
                      </td>
                      <td className="p-4"><ProductStageBadge stage={flock.productStage} /></td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant={flock.deliveryAvailable ? 'default' as BadgeTone : 'outline' as BadgeTone}>
                            {flock.deliveryAvailable ? 'Available' : 'Pickup only'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{deliveryScopeLabels[flock.deliveryScope] || flock.deliveryScope}</span>
                        </div>
                      </td>
                      <td className="p-4"><FlockStatusBadge status={flock.status} /></td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`${editBasePath}/${flock.id}/edit`}><Edit2 className="h-4 w-4" /></Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(flock.id, flock.title)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {flocks.map((flock) => (
                <FlockCard key={flock.id} flock={flock} editBasePath={editBasePath} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function FlockForm({ mode, basePath, initialData }: FlockFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [existingVaccinations, setExistingVaccinations] = useState(initialData?.vaccinationsGiven || []);
  const [existingMedications, setExistingMedications] = useState(initialData?.medicationsGiven || []);
  const [vaccinationDraft, setVaccinationDraft] = useState<RecordDraft>({ name: '', dateGiven: '', nextDue: '' });
  const [medicationDraft, setMedicationDraft] = useState<MedicationDraft>({ name: '', reason: '', dateGiven: '', durationDays: '' });
  const [form, setForm] = useState<FlockFormValues>({
    title: initialData?.title || '',
    breed: initialData?.breed || '',
    birdType: initialData?.birdType || 'BROILER',
    quantity: initialData ? String(initialData.quantity) : '',
    location: initialData?.location || '',
    status: initialData?.status || 'ACTIVE',
    description: initialData?.description || '',
    startRearingDate: initialData?.startRearingDate ? initialData.startRearingDate.slice(0, 10) : '',
    expectedReadyDate: initialData?.expectedReadyDate ? initialData.expectedReadyDate.slice(0, 10) : '',
    deliveryAvailable: initialData?.deliveryAvailable ?? false,
    deliveryScope: initialData?.deliveryScope || 'FARM_PICKUP',
    deliveryNotes: initialData?.deliveryNotes || '',
  });

  useEffect(() => {
    setExistingVaccinations(initialData?.vaccinationsGiven || []);
    setExistingMedications(initialData?.medicationsGiven || []);
    if (initialData) {
      setForm({
        title: initialData.title,
        breed: initialData.breed,
        birdType: initialData.birdType,
        quantity: String(initialData.quantity),
        location: initialData.location,
        status: initialData.status,
        description: initialData.description,
        startRearingDate: initialData.startRearingDate.slice(0, 10),
        expectedReadyDate: initialData.expectedReadyDate.slice(0, 10),
        deliveryAvailable: initialData.deliveryAvailable,
        deliveryScope: initialData.deliveryScope,
        deliveryNotes: initialData.deliveryNotes || '',
      });
    }
  }, [initialData]);

  const pendingVaccinationCount = useMemo(() => existingVaccinations.length, [existingVaccinations]);
  const pendingMedicationCount = useMemo(() => existingMedications.length, [existingMedications]);

  const appendVaccination = () => {
    if (!vaccinationDraft.name.trim() || !vaccinationDraft.dateGiven) {
      toast.error('Vaccination name and date are required');
      return;
    }

    setExistingVaccinations((current) => [
      ...current,
      {
        id: `draft-vax-${Date.now()}`,
        name: vaccinationDraft.name.trim(),
        dateGiven: new Date(vaccinationDraft.dateGiven).toISOString(),
        nextDue: vaccinationDraft.nextDue ? new Date(vaccinationDraft.nextDue).toISOString() : null,
      },
    ]);
    setVaccinationDraft({ name: '', dateGiven: '', nextDue: '' });
  };

  const appendMedication = () => {
    if (!medicationDraft.name.trim() || !medicationDraft.reason.trim() || !medicationDraft.dateGiven || !medicationDraft.durationDays) {
      toast.error('Medication name, reason, date, and duration are required');
      return;
    }

    setExistingMedications((current) => [
      ...current,
      {
        id: `draft-med-${Date.now()}`,
        name: medicationDraft.name.trim(),
        reason: medicationDraft.reason.trim(),
        dateGiven: new Date(medicationDraft.dateGiven).toISOString(),
        durationDays: Number(medicationDraft.durationDays),
      },
    ]);
    setMedicationDraft({ name: '', reason: '', dateGiven: '', durationDays: '' });
  };

  const submitForm = async () => {
    setSaving(true);

    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        vaccinationsGiven: existingVaccinations.filter((record) => record.id.startsWith('draft-vax-')).map((record) => ({
          name: record.name,
          dateGiven: record.dateGiven,
          nextDue: record.nextDue,
        })),
        medicationsGiven: existingMedications.filter((record) => record.id.startsWith('draft-med-')).map((record) => ({
          name: record.name,
          reason: record.reason,
          dateGiven: record.dateGiven,
          durationDays: record.durationDays,
        })),
      };

      const flockId = mode === 'edit' ? initialData?.id : undefined;
      const response = await fetch(mode === 'create' ? '/api/seller/flocks' : `/api/seller/flocks/${flockId}`, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save flock');
      }

      toast.success(mode === 'create' ? 'Flock created successfully' : 'Flock updated successfully');
      router.push(basePath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save flock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Create flock' : 'Edit flock'}</CardTitle>
          <CardDescription>Manage lifecycle, health history, and delivery settings from one place.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Broiler Batch 12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed">Breed</Label>
              <Input id="breed" value={form.breed} onChange={(event) => setForm({ ...form, breed: event.target.value })} placeholder="e.g. Kuroiler" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birdType">Bird type</Label>
              <Select value={form.birdType} onValueChange={(value) => setForm({ ...form, birdType: value })}>
                <SelectTrigger><SelectValue placeholder="Select bird type" /></SelectTrigger>
                <SelectContent>
                  {['BROILER', 'LAYER', 'KIENYEJI', 'TURKEY', 'OTHER'].map((option) => (
                    <SelectItem key={option} value={option}>{birdTypeLabels[option]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {['ACTIVE', 'SOLD', 'HARVESTED', 'INACTIVE'].map((option) => (
                    <SelectItem key={option} value={option}>{option.replaceAll('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Farm or county location" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Operational notes, batch notes, and production context." />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startRearingDate">Start rearing date</Label>
              <Input id="startRearingDate" type="date" value={form.startRearingDate} onChange={(event) => setForm({ ...form, startRearingDate: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedReadyDate">Expected ready date</Label>
              <Input id="expectedReadyDate" type="date" value={form.expectedReadyDate} onChange={(event) => setForm({ ...form, expectedReadyDate: event.target.value })} />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="deliveryAvailable">Delivery available</Label>
                <p className="text-sm text-muted-foreground">Enable delivery coverage for this flock.</p>
              </div>
              <Switch id="deliveryAvailable" checked={form.deliveryAvailable} onCheckedChange={(checked) => setForm({ ...form, deliveryAvailable: checked })} />
            </div>
            <DeliveryScopeSelector value={form.deliveryScope} onValueChange={(value) => setForm({ ...form, deliveryScope: value })} />
            <div className="space-y-2">
              <Label htmlFor="deliveryNotes">Delivery notes</Label>
              <Textarea id="deliveryNotes" rows={3} value={form.deliveryNotes} onChange={(event) => setForm({ ...form, deliveryNotes: event.target.value })} placeholder="Pickup instructions, transport notes, or coverage details." />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Vaccination history</h3>
                <p className="text-sm text-muted-foreground">Append new records only. Existing records remain read-only.</p>
              </div>
              <Badge variant="secondary">{pendingVaccinationCount} recorded</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input value={vaccinationDraft.name} onChange={(event) => setVaccinationDraft({ ...vaccinationDraft, name: event.target.value })} placeholder="Vaccine name" />
              <Input type="date" value={vaccinationDraft.dateGiven} onChange={(event) => setVaccinationDraft({ ...vaccinationDraft, dateGiven: event.target.value })} />
              <Input type="date" value={vaccinationDraft.nextDue} onChange={(event) => setVaccinationDraft({ ...vaccinationDraft, nextDue: event.target.value })} placeholder="Next due" />
            </div>

            <Button type="button" variant="outline" onClick={appendVaccination}>
              <Plus className="mr-2 h-4 w-4" /> Add vaccination record
            </Button>

            <VaccinationHistory records={existingVaccinations.filter((record) => !record.id.startsWith('draft-vax-'))} />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Medication history</h3>
                <p className="text-sm text-muted-foreground">Append new records only. Existing records remain read-only.</p>
              </div>
              <Badge variant="secondary">{pendingMedicationCount} recorded</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <Input value={medicationDraft.name} onChange={(event) => setMedicationDraft({ ...medicationDraft, name: event.target.value })} placeholder="Medication name" />
              <Input value={medicationDraft.reason} onChange={(event) => setMedicationDraft({ ...medicationDraft, reason: event.target.value })} placeholder="Reason" />
              <Input type="date" value={medicationDraft.dateGiven} onChange={(event) => setMedicationDraft({ ...medicationDraft, dateGiven: event.target.value })} />
              <Input type="number" min="1" value={medicationDraft.durationDays} onChange={(event) => setMedicationDraft({ ...medicationDraft, durationDays: event.target.value })} placeholder="Days" />
            </div>

            <Button type="button" variant="outline" onClick={appendMedication}>
              <Plus className="mr-2 h-4 w-4" /> Add medication record
            </Button>

            <MedicationHistory records={existingMedications.filter((record) => !record.id.startsWith('draft-med-'))} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.push('/seller/flocks')}>
              Cancel
            </Button>
            <Button type="button" onClick={submitForm} disabled={saving}>
              {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {mode === 'create' ? 'Create flock' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {initialData ? <FlockLifecycleTimeline flock={initialData} /> : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Lifecycle preview</CardTitle>
            <CardDescription>The timeline preview appears after a flock is saved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Use the form to capture lifecycle, health, and delivery details in a single operational record.</p>
            <div className="rounded-lg border border-dashed p-4">
              <p className="font-medium text-foreground">What gets synced to AI</p>
              <p className="mt-1">Only sanitized flock data is emitted to the FastAPI intelligence layer. Seller contact data stays out of the payload.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
