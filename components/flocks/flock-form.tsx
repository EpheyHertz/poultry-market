'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeliveryScopeSelector } from './delivery-scope-selector';
import {
  getAgeFromStartDate,
  getProductStage,
  LivestockFlockViewModel,
} from '@/lib/flocks';
import {
  FlockStatusBadge,
} from './flock-status-badge';
import { ProductStageBadge } from './product-stage-badge';
import { AgeDisplay } from './age-display';
import { FlockLifecycleTimeline } from './flock-lifecycle-timeline';
import { VaccinationHistory, VaccinationHistoryRecord } from './vaccination-history';
import { MedicationHistory, MedicationHistoryRecord } from './medication-history';
import { LivestockBirdType, LivestockDeliveryScope, LivestockFlockStatus } from '@prisma/client';

type FlockFormState = {
  title: string;
  breed: string;
  birdType: LivestockBirdType;
  quantity: string;
  location: string;
  status: LivestockFlockStatus;
  description: string;
  startRearingDate: string;
  expectedReadyDate: string;
  deliveryAvailable: boolean;
  deliveryScope: LivestockDeliveryScope;
  deliveryNotes: string;
};

type PendingVaccination = {
  name: string;
  dateGiven: string;
  nextDue: string;
};

type PendingMedication = {
  name: string;
  reason: string;
  dateGiven: string;
  durationDays: string;
};

interface FlockFormProps {
  mode: 'create' | 'edit';
  initialData?: LivestockFlockViewModel | null;
  basePath: string;
}

const today = new Date().toISOString().split('T')[0];

function toDateInputValue(value?: string | null) {
  if (!value) return today;
  return value.slice(0, 10);
}

const defaultState: FlockFormState = {
  title: '',
  breed: '',
  birdType: LivestockBirdType.BROILER,
  quantity: '0',
  location: '',
  status: LivestockFlockStatus.ACTIVE,
  description: '',
  startRearingDate: today,
  expectedReadyDate: today,
  deliveryAvailable: false,
  deliveryScope: LivestockDeliveryScope.FARM_PICKUP,
  deliveryNotes: '',
};

export function FlockForm({ mode, initialData, basePath }: FlockFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FlockFormState>(() => {
    if (!initialData) return defaultState;

    return {
      title: initialData.title,
      breed: initialData.breed,
      birdType: initialData.birdType,
      quantity: String(initialData.quantity),
      location: initialData.location,
      status: initialData.status,
      description: initialData.description,
      startRearingDate: toDateInputValue(initialData.startRearingDate),
      expectedReadyDate: toDateInputValue(initialData.expectedReadyDate),
      deliveryAvailable: initialData.deliveryAvailable,
      deliveryScope: initialData.deliveryScope,
      deliveryNotes: initialData.deliveryNotes || '',
    };
  });

  const [pendingVaccination, setPendingVaccination] = useState<PendingVaccination>({
    name: '',
    dateGiven: today,
    nextDue: '',
  });

  const [pendingMedication, setPendingMedication] = useState<PendingMedication>({
    name: '',
    reason: '',
    dateGiven: today,
    durationDays: '0',
  });

  const [newVaccinations, setNewVaccinations] = useState<VaccinationHistoryRecord[]>([]);
  const [newMedications, setNewMedications] = useState<MedicationHistoryRecord[]>([]);

  const existingVaccinations = initialData?.vaccinationsGiven || [];
  const existingMedications = initialData?.medicationsGiven || [];

  const lifecyclePreview = useMemo(() => {
    const start = new Date(form.startRearingDate);
    const expected = new Date(form.expectedReadyDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(expected.getTime())) {
      return null;
    }

    const age = getAgeFromStartDate(start);
    const stage = getProductStage(form.status, start, expected);

    return { age, stage };
  }, [form.expectedReadyDate, form.startRearingDate, form.status]);

  const updateField = <K extends keyof FlockFormState>(field: K, value: FlockFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addVaccination = () => {
    if (!pendingVaccination.name.trim() || !pendingVaccination.dateGiven) {
      toast.error('Vaccination name and date are required');
      return;
    }

    setNewVaccinations((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        name: pendingVaccination.name.trim(),
        dateGiven: pendingVaccination.dateGiven,
        nextDue: pendingVaccination.nextDue || null,
      },
    ]);

    setPendingVaccination({ name: '', dateGiven: today, nextDue: '' });
  };

  const addMedication = () => {
    if (!pendingMedication.name.trim() || !pendingMedication.reason.trim()) {
      toast.error('Medication name and reason are required');
      return;
    }

    const durationDays = Number(pendingMedication.durationDays);
    if (!Number.isFinite(durationDays) || durationDays < 0) {
      toast.error('Medication duration must be valid');
      return;
    }

    setNewMedications((current) => [
      ...current,
      {
        id: `${Date.now()}`,
        name: pendingMedication.name.trim(),
        reason: pendingMedication.reason.trim(),
        dateGiven: pendingMedication.dateGiven,
        durationDays,
      },
    ]);

    setPendingMedication({ name: '', reason: '', dateGiven: today, durationDays: '0' });
  };

  const removePendingVaccination = (id: string) => {
    setNewVaccinations((current) => current.filter((record) => record.id !== id));
  };

  const removePendingMedication = (id: string) => {
    setNewMedications((current) => current.filter((record) => record.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const endpoint = mode === 'edit' && initialData
        ? `/api/seller/flocks/${initialData.id}`
        : '/api/seller/flocks';

      const response = await fetch(endpoint, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          vaccinationsGiven: newVaccinations.map((record) => ({
            name: record.name,
            dateGiven: record.dateGiven,
            nextDue: record.nextDue,
          })),
          medicationsGiven: newMedications.map((record) => ({
            name: record.name,
            reason: record.reason,
            dateGiven: record.dateGiven,
            durationDays: record.durationDays,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save flock');
      }

      toast.success(mode === 'edit' ? 'Flock updated successfully' : 'Flock created successfully');
      router.push(basePath);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save flock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={basePath}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {mode === 'edit' ? 'Edit flock' : 'Create flock'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Internal livestock lifecycle, health history, and delivery setup.
            </p>
          </div>
        </div>

        {lifecyclePreview && (
          <div className="flex flex-wrap gap-2">
            <AgeDisplay days={lifecyclePreview.age.days} months={lifecyclePreview.age.months} />
            <ProductStageBadge stage={lifecyclePreview.stage} />
            <FlockStatusBadge status={form.status} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Flock details</CardTitle>
            <CardDescription>Base operational data for the flock.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="breed">Breed</Label>
              <Input id="breed" value={form.breed} onChange={(event) => updateField('breed', event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birdType">Bird type</Label>
              <Select value={form.birdType} onValueChange={(value) => updateField('birdType', value as LivestockBirdType)}>
                <SelectTrigger id="birdType">
                  <SelectValue placeholder="Select bird type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(LivestockBirdType).map((type) => (
                    <SelectItem key={type} value={type}>{type.toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" min="0" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(event) => updateField('location', event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(value) => updateField('status', value as LivestockFlockStatus)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(LivestockFlockStatus).map((status) => (
                    <SelectItem key={status} value={status}>{status.toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} value={form.description} onChange={(event) => updateField('description', event.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifecycle planning</CardTitle>
            <CardDescription>Age is always derived from the start rearing date.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startRearingDate">Start rearing date</Label>
              <Input
                id="startRearingDate"
                type="date"
                value={form.startRearingDate}
                onChange={(event) => updateField('startRearingDate', event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedReadyDate">Expected ready date</Label>
              <Input
                id="expectedReadyDate"
                type="date"
                value={form.expectedReadyDate}
                onChange={(event) => updateField('expectedReadyDate', event.target.value)}
                required
              />
            </div>

            {lifecyclePreview && (
              <div className="md:col-span-2">
                <FlockLifecycleTimeline
                  startRearingDate={form.startRearingDate}
                  expectedReadyDate={form.expectedReadyDate}
                  currentAgeDays={lifecyclePreview.age.days}
                  currentAgeMonths={lifecyclePreview.age.months}
                  productStage={lifecyclePreview.stage}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery settings</CardTitle>
            <CardDescription>Control how this flock is listed internally for logistics and pickup planning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="deliveryAvailable">Delivery available</Label>
                <p className="text-sm text-muted-foreground">Enable if this flock can be delivered or picked up.</p>
              </div>
              <Switch
                id="deliveryAvailable"
                checked={form.deliveryAvailable}
                onCheckedChange={(checked) => updateField('deliveryAvailable', checked)}
              />
            </div>

            <DeliveryScopeSelector
              value={form.deliveryScope}
              onValueChange={(value) => updateField('deliveryScope', value)}
            />

            <div className="space-y-2">
              <Label htmlFor="deliveryNotes">Delivery notes</Label>
              <Textarea
                id="deliveryNotes"
                rows={3}
                value={form.deliveryNotes}
                onChange={(event) => updateField('deliveryNotes', event.target.value)}
                placeholder="Optional logistics notes for the internal team"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Vaccination history</CardTitle>
              <CardDescription>Append new records only. Existing records stay read-only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingVaccinations.length > 0 && (
                <VaccinationHistory records={existingVaccinations} title="Existing vaccinations" />
              )}

              <div className="grid gap-3 rounded-lg border p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="vaccinationName">Name</Label>
                    <Input
                      id="vaccinationName"
                      value={pendingVaccination.name}
                      onChange={(event) => setPendingVaccination((current) => ({ ...current, name: event.target.value }))}
                      placeholder="e.g. Newcastle vaccine"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vaccinationDate">Date given</Label>
                    <Input
                      id="vaccinationDate"
                      type="date"
                      value={pendingVaccination.dateGiven}
                      onChange={(event) => setPendingVaccination((current) => ({ ...current, dateGiven: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vaccinationNextDue">Next due</Label>
                  <Input
                    id="vaccinationNextDue"
                    type="date"
                    value={pendingVaccination.nextDue}
                    onChange={(event) => setPendingVaccination((current) => ({ ...current, nextDue: event.target.value }))}
                  />
                </div>

                <Button type="button" variant="outline" onClick={addVaccination}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add vaccination
                </Button>
              </div>

              {newVaccinations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pending additions</p>
                  {newVaccinations.map((record) => (
                    <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                      <div>
                        <div className="font-medium">{record.name}</div>
                        <div className="text-muted-foreground">{new Date(record.dateGiven).toLocaleDateString()}</div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removePendingVaccination(record.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medication history</CardTitle>
              <CardDescription>Append new medication logs without overwriting history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {existingMedications.length > 0 && (
                <MedicationHistory records={existingMedications} title="Existing medications" />
              )}

              <div className="grid gap-3 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="medicationName">Name</Label>
                  <Input
                    id="medicationName"
                    value={pendingMedication.name}
                    onChange={(event) => setPendingMedication((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g. Amoxicillin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicationReason">Reason</Label>
                  <Input
                    id="medicationReason"
                    value={pendingMedication.reason}
                    onChange={(event) => setPendingMedication((current) => ({ ...current, reason: event.target.value }))}
                    placeholder="e.g. respiratory treatment"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="medicationDate">Date given</Label>
                    <Input
                      id="medicationDate"
                      type="date"
                      value={pendingMedication.dateGiven}
                      onChange={(event) => setPendingMedication((current) => ({ ...current, dateGiven: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medicationDuration">Duration days</Label>
                    <Input
                      id="medicationDuration"
                      type="number"
                      min="0"
                      value={pendingMedication.durationDays}
                      onChange={(event) => setPendingMedication((current) => ({ ...current, durationDays: event.target.value }))}
                    />
                  </div>
                </div>

                <Button type="button" variant="outline" onClick={addMedication}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add medication
                </Button>
              </div>

              {newMedications.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pending additions</p>
                  {newMedications.map((record) => (
                    <div key={record.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                      <div>
                        <div className="font-medium">{record.name}</div>
                        <div className="text-muted-foreground">{record.reason}</div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removePendingMedication(record.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link href={basePath}>
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : mode === 'edit' ? 'Update flock' : 'Create flock'}
          </Button>
        </div>
      </form>
    </div>
  );
}