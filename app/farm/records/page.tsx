'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FarmSwitcher } from '@/components/farm/farm-switcher';
import { useFarm } from '@/contexts/farm-context';

interface Flock {
  id: string;
  name: string;
  breed: string | null;
  birdCount: number;
  status: 'ACTIVE' | 'ARCHIVED';
}

interface FeedRecord {
  id: string;
  feedType: string;
  quantityKg: number;
  cost: number | null;
  recordedOn: string;
  flock: { id: string; name: string } | null;
}

interface MortalityRecord {
  id: string;
  count: number;
  cause: string | null;
  recordedOn: string;
  flock: { id: string; name: string } | null;
}

interface Vaccination {
  id: string;
  vaccineName: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'MISSED';
  scheduledDate: string;
  flock: { id: string; name: string } | null;
}

type EditKind = 'flock' | 'feed' | 'mortality' | 'vaccination';

function RecordActionButtons({
  onEdit,
  onDelete,
  deleting,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="gap-1 rounded-full" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-1 rounded-full"
        onClick={onDelete}
        disabled={deleting}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-pfs-muted bg-pfs-muted/30 p-6 text-center">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function dateToIso(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function toInputDate(value: string): string {
  return new Date(value).toISOString().split('T')[0];
}

export default function FarmRecordsPage() {
  const { activeFarmId, setActiveFarmId } = useFarm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: EditKind; id: string; label: string } | null>(null);

  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [feedRecords, setFeedRecords] = useState<FeedRecord[]>([]);
  const [mortalityRecords, setMortalityRecords] = useState<MortalityRecord[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);

  const [flockName, setFlockName] = useState('');
  const [flockBreed, setFlockBreed] = useState('');
  const [flockBirdCount, setFlockBirdCount] = useState('0');

  const [feedFlockId, setFeedFlockId] = useState('none');
  const [feedType, setFeedType] = useState('');
  const [feedQuantity, setFeedQuantity] = useState('');
  const [feedCost, setFeedCost] = useState('');
  const [feedDate, setFeedDate] = useState('');

  const [mortalityFlockId, setMortalityFlockId] = useState('none');
  const [mortalityCount, setMortalityCount] = useState('');
  const [mortalityCause, setMortalityCause] = useState('');
  const [mortalityDate, setMortalityDate] = useState('');

  const [vaccinationFlockId, setVaccinationFlockId] = useState('none');
  const [vaccineName, setVaccineName] = useState('');
  const [vaccinationDate, setVaccinationDate] = useState('');

  const [editingKind, setEditingKind] = useState<EditKind | null>(null);
  const [editingFlock, setEditingFlock] = useState<Flock | null>(null);
  const [editingFeed, setEditingFeed] = useState<FeedRecord | null>(null);
  const [editingMortality, setEditingMortality] = useState<MortalityRecord | null>(null);
  const [editingVaccination, setEditingVaccination] = useState<Vaccination | null>(null);

  const [editFlockName, setEditFlockName] = useState('');
  const [editFlockBreed, setEditFlockBreed] = useState('');
  const [editFlockBirdCount, setEditFlockBirdCount] = useState('0');
  const [editFlockStatus, setEditFlockStatus] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const [editFeedFlockId, setEditFeedFlockId] = useState('none');
  const [editFeedType, setEditFeedType] = useState('');
  const [editFeedQuantity, setEditFeedQuantity] = useState('');
  const [editFeedCost, setEditFeedCost] = useState('');
  const [editFeedDate, setEditFeedDate] = useState('');

  const [editMortalityFlockId, setEditMortalityFlockId] = useState('none');
  const [editMortalityCount, setEditMortalityCount] = useState('');
  const [editMortalityCause, setEditMortalityCause] = useState('');
  const [editMortalityDate, setEditMortalityDate] = useState('');

  const [editVaccinationFlockId, setEditVaccinationFlockId] = useState('none');
  const [editVaccineName, setEditVaccineName] = useState('');
  const [editVaccinationDate, setEditVaccinationDate] = useState('');
  const [editVaccinationStatus, setEditVaccinationStatus] = useState<'SCHEDULED' | 'COMPLETED' | 'MISSED'>('SCHEDULED');

  const loadRecords = useCallback(async () => {
    setLoading(true);

    try {
      if (!activeFarmId) {
        setFlocks([]);
        setFeedRecords([]);
        setMortalityRecords([]);
        setVaccinations([]);
        return;
      }

      const withFarmId = (path: string) => `${path}?farmId=${encodeURIComponent(activeFarmId)}`;

      const [flocksRes, feedRes, mortalityRes, vaccinationsRes] = await Promise.all([
        fetch(withFarmId('/api/farm/flocks'), { cache: 'no-store' }),
        fetch(withFarmId('/api/farm/feed-records'), { cache: 'no-store' }),
        fetch(withFarmId('/api/farm/mortality-records'), { cache: 'no-store' }),
        fetch(withFarmId('/api/farm/vaccinations'), { cache: 'no-store' }),
      ]);

      const [flocksData, feedData, mortalityData, vaccinationsData] = await Promise.all([
        flocksRes.json(),
        feedRes.json(),
        mortalityRes.json(),
        vaccinationsRes.json(),
      ]);

      if (!flocksRes.ok) throw new Error(flocksData.error || 'Failed to load flocks');
      if (!feedRes.ok) throw new Error(feedData.error || 'Failed to load feed records');
      if (!mortalityRes.ok) throw new Error(mortalityData.error || 'Failed to load mortality records');
      if (!vaccinationsRes.ok) throw new Error(vaccinationsData.error || 'Failed to load vaccinations');

      setFlocks(flocksData.flocks || []);
      setFeedRecords(feedData.records || []);
      setMortalityRecords(mortalityData.records || []);
      setVaccinations(vaccinationsData.records || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load farm records');
    } finally {
      setLoading(false);
    }
  }, [activeFarmId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const activeFlocks = useMemo(() => flocks.filter((flock) => flock.status === 'ACTIVE'), [flocks]);

  function openFlockEdit(flock: Flock) {
    setEditingKind('flock');
    setEditingFlock(flock);
    setEditFlockName(flock.name);
    setEditFlockBreed(flock.breed || '');
    setEditFlockBirdCount(String(flock.birdCount));
    setEditFlockStatus(flock.status);
  }

  function openFeedEdit(record: FeedRecord) {
    setEditingKind('feed');
    setEditingFeed(record);
    setEditFeedFlockId(record.flock?.id || 'none');
    setEditFeedType(record.feedType);
    setEditFeedQuantity(String(record.quantityKg));
    setEditFeedCost(record.cost === null ? '' : String(record.cost));
    setEditFeedDate(toInputDate(record.recordedOn));
  }

  function openMortalityEdit(record: MortalityRecord) {
    setEditingKind('mortality');
    setEditingMortality(record);
    setEditMortalityFlockId(record.flock?.id || 'none');
    setEditMortalityCount(String(record.count));
    setEditMortalityCause(record.cause || '');
    setEditMortalityDate(toInputDate(record.recordedOn));
  }

  function openVaccinationEdit(record: Vaccination) {
    setEditingKind('vaccination');
    setEditingVaccination(record);
    setEditVaccinationFlockId(record.flock?.id || 'none');
    setEditVaccineName(record.vaccineName);
    setEditVaccinationDate(toInputDate(record.scheduledDate));
    setEditVaccinationStatus(record.status);
  }

  function closeEditDialog() {
    setEditingKind(null);
    setEditingFlock(null);
    setEditingFeed(null);
    setEditingMortality(null);
    setEditingVaccination(null);
  }

  async function createFlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFarmId) {
      toast.error('Select a farm before creating a flock');
      return;
    }
    if (!flockName.trim()) {
      toast.error('Flock name is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/farm/flocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: activeFarmId,
          name: flockName.trim(),
          breed: flockBreed.trim() || undefined,
          birdCount: Math.max(0, Number(flockBirdCount || '0')),
          status: 'ACTIVE',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create flock');

      toast.success('Flock created');
      setFlockName('');
      setFlockBreed('');
      setFlockBirdCount('0');
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create flock');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveFlockEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingFlock) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/farm/flocks/${editingFlock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFlockName.trim(),
          breed: editFlockBreed.trim() || null,
          birdCount: Math.max(0, Number(editFlockBirdCount || '0')),
          status: editFlockStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update flock');

      toast.success('Flock updated');
      closeEditDialog();
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update flock');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveFeedEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingFeed) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/farm/feed-records/${editingFeed.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flockId: editFeedFlockId === 'none' ? null : editFeedFlockId,
          feedType: editFeedType.trim(),
          quantityKg: Number(editFeedQuantity),
          cost: editFeedCost === '' ? null : Number(editFeedCost),
          recordedOn: dateToIso(editFeedDate),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update feed record');

      toast.success('Feed record updated');
      closeEditDialog();
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update feed record');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveMortalityEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingMortality) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/farm/mortality-records/${editingMortality.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flockId: editMortalityFlockId === 'none' ? null : editMortalityFlockId,
          count: Number(editMortalityCount),
          cause: editMortalityCause.trim() || null,
          recordedOn: dateToIso(editMortalityDate),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update mortality record');

      toast.success('Mortality record updated');
      closeEditDialog();
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update mortality record');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveVaccinationEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingVaccination) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/farm/vaccinations/${editingVaccination.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flockId: editVaccinationFlockId === 'none' ? null : editVaccinationFlockId,
          vaccineName: editVaccineName.trim(),
          scheduledDate: dateToIso(editVaccinationDate),
          status: editVaccinationStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update vaccination record');

      toast.success('Vaccination updated');
      closeEditDialog();
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update vaccination record');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRecord(kind: EditKind, id: string) {
    setActionTargetId(id);
    try {
      const endpointMap: Record<EditKind, string> = {
        flock: '/api/farm/flocks',
        feed: '/api/farm/feed-records',
        mortality: '/api/farm/mortality-records',
        vaccination: '/api/farm/vaccinations',
      };

      const response = await fetch(`${endpointMap[kind]}/${id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Failed to delete record');

      toast.success('Record deleted');
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete record');
    } finally {
      setActionTargetId(null);
    }
  }

  function confirmDelete(kind: EditKind, id: string, label: string) {
    setPendingDelete({ kind, id, label });
  }

  async function createFeedRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFarmId) {
      toast.error('Select a farm before logging feed');
      return;
    }
    if (!feedType.trim() || Number(feedQuantity) <= 0) {
      toast.error('Feed type and quantity are required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/farm/feed-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: activeFarmId,
          flockId: feedFlockId === 'none' ? undefined : feedFlockId,
          feedType: feedType.trim(),
          quantityKg: Number(feedQuantity),
          cost: feedCost ? Number(feedCost) : undefined,
          recordedOn: feedDate ? dateToIso(feedDate) : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create feed record');

      toast.success('Feed record added');
      setFeedType('');
      setFeedQuantity('');
      setFeedCost('');
      setFeedDate('');
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create feed record');
    } finally {
      setSubmitting(false);
    }
  }

  async function createMortalityRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFarmId) {
      toast.error('Select a farm before logging mortality');
      return;
    }
    if (Number(mortalityCount) <= 0) {
      toast.error('Mortality count must be greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/farm/mortality-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: activeFarmId,
          flockId: mortalityFlockId === 'none' ? undefined : mortalityFlockId,
          count: Number(mortalityCount),
          cause: mortalityCause.trim() || undefined,
          recordedOn: mortalityDate ? dateToIso(mortalityDate) : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create mortality record');

      toast.success('Mortality record added');
      setMortalityCount('');
      setMortalityCause('');
      setMortalityDate('');
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create mortality record');
    } finally {
      setSubmitting(false);
    }
  }

  async function createVaccination(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeFarmId) {
      toast.error('Select a farm before scheduling vaccinations');
      return;
    }
    if (!vaccineName.trim() || !vaccinationDate) {
      toast.error('Vaccine name and scheduled date are required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/farm/vaccinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmId: activeFarmId,
          flockId: vaccinationFlockId === 'none' ? undefined : vaccinationFlockId,
          vaccineName: vaccineName.trim(),
          scheduledDate: dateToIso(vaccinationDate),
          status: 'SCHEDULED',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create vaccination schedule');

      toast.success('Vaccination scheduled');
      setVaccineName('');
      setVaccinationDate('');
      await loadRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule vaccination');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Loading records...</p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="rounded-3xl border border-pfs-muted bg-gradient-to-br from-white via-pfs-beige/50 to-white p-4 shadow-sm shadow-black/5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-pfs-green-700 sm:text-2xl">Poultry Records</h1>
            <p className="text-sm text-muted-foreground">
              Manage flocks, feed usage, mortality logs, and vaccination schedules.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <FarmSwitcher value={activeFarmId} onChange={setActiveFarmId} redirectTo="/farm/records" />
            </div>
            <Link href="/farm">
              <Button variant="outline" size="sm" className="gap-2 rounded-full border-pfs-muted bg-card">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="border-pfs-muted shadow-sm shadow-black/5">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Flocks</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{flocks.length}</p>
              <p className="text-xs text-muted-foreground">{activeFlocks.length} active</p>
            </CardContent>
          </Card>
          <Card className="border-pfs-muted shadow-sm shadow-black/5">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Feed logs</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{feedRecords.length}</p>
              <p className="text-xs text-muted-foreground">Latest feed usage</p>
            </CardContent>
          </Card>
          <Card className="border-pfs-muted shadow-sm shadow-black/5">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Mortality</p>
              <p className="mt-2 text-2xl font-semibold text-pfs-danger">{mortalityRecords.length}</p>
              <p className="text-xs text-muted-foreground">Health alerts tracked</p>
            </CardContent>
          </Card>
          <Card className="border-pfs-muted shadow-sm shadow-black/5">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vaccinations</p>
              <p className="mt-2 text-2xl font-semibold text-pfs-accent">{vaccinations.length}</p>
              <p className="text-xs text-muted-foreground">Scheduled and completed</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {!activeFarmId && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Select a farm to view records and log new entries.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="flocks" className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg p-1">
          <TabsTrigger value="flocks">Flocks</TabsTrigger>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="mortality">Mortality</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
        </TabsList>

        <TabsContent value="flocks">
          <Card className="border-pfs-muted shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle className="text-pfs-green-700">Flocks</CardTitle>
              <CardDescription>Create and monitor your flock groups.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={createFlock} className="grid gap-3 rounded-2xl border border-pfs-muted bg-pfs-muted/20 p-4 sm:grid-cols-3">
                <Input className="rounded-2xl bg-input" placeholder="Flock name" value={flockName} onChange={(e) => setFlockName(e.target.value)} />
                <Input className="rounded-2xl bg-input" placeholder="Breed" value={flockBreed} onChange={(e) => setFlockBreed(e.target.value)} />
                <Input
                  className="rounded-2xl bg-input"
                  placeholder="Bird count"
                  inputMode="numeric"
                  value={flockBirdCount}
                  onChange={(e) => setFlockBirdCount(e.target.value)}
                />
                <Button type="submit" disabled={submitting || !activeFarmId} className="rounded-2xl bg-pfs-accent text-white sm:col-span-3 sm:w-fit">
                  Add Flock
                </Button>
              </form>

              {flocks.length === 0 ? (
                <EmptyState title="No flocks yet" description="Create your first flock to start tracking records." />
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-pfs-muted md:block">
                    <Table>
                      <TableHeader className="bg-pfs-muted/40">
                        <TableRow>
                          <TableHead>Flock</TableHead>
                          <TableHead>Breed</TableHead>
                          <TableHead>Bird count</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flocks.map((flock) => (
                          <TableRow key={flock.id}>
                            <TableCell className="font-medium">{flock.name}</TableCell>
                            <TableCell>{flock.breed || 'Not set'}</TableCell>
                            <TableCell>{flock.birdCount}</TableCell>
                            <TableCell>
                              <Badge variant={flock.status === 'ACTIVE' ? 'default' : 'secondary'}>{flock.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <RecordActionButtons
                                onEdit={() => openFlockEdit(flock)}
                                onDelete={() => confirmDelete('flock', flock.id, flock.name)}
                                deleting={actionTargetId === flock.id}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {flocks.map((flock) => (
                      <div key={flock.id} className="rounded-2xl border border-pfs-muted bg-card p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{flock.name}</p>
                            <p className="text-sm text-muted-foreground">{flock.breed || 'Breed not set'}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{flock.birdCount} birds</p>
                          </div>
                          <Badge variant={flock.status === 'ACTIVE' ? 'default' : 'secondary'}>{flock.status}</Badge>
                        </div>
                        <div className="mt-3">
                          <RecordActionButtons
                            onEdit={() => openFlockEdit(flock)}
                            onDelete={() => confirmDelete('flock', flock.id, flock.name)}
                            deleting={actionTargetId === flock.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feed">
          <Card className="border-pfs-muted shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle className="text-pfs-green-700">Feed Records</CardTitle>
              <CardDescription>Track feed type, quantity, and optional cost.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={createFeedRecord} className="grid gap-3 rounded-2xl border border-pfs-muted bg-pfs-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select value={feedFlockId} onValueChange={setFeedFlockId}>
                  <SelectTrigger className="rounded-2xl bg-input">
                    <SelectValue placeholder="Select flock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No flock selected</SelectItem>
                    {activeFlocks.map((flock) => (
                      <SelectItem key={flock.id} value={flock.id}>
                        {flock.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input className="rounded-2xl bg-input" placeholder="Feed type" value={feedType} onChange={(e) => setFeedType(e.target.value)} />
                <Input
                  className="rounded-2xl bg-input"
                  placeholder="Quantity (kg)"
                  inputMode="decimal"
                  value={feedQuantity}
                  onChange={(e) => setFeedQuantity(e.target.value)}
                />
                <Input
                  className="rounded-2xl bg-input"
                  placeholder="Cost (optional)"
                  inputMode="decimal"
                  value={feedCost}
                  onChange={(e) => setFeedCost(e.target.value)}
                />
                <Input className="rounded-2xl bg-input" type="date" value={feedDate} onChange={(e) => setFeedDate(e.target.value)} />
                <Button type="submit" disabled={submitting || !activeFarmId} className="rounded-2xl bg-pfs-accent text-white sm:w-fit lg:col-span-3">
                  Add Feed Record
                </Button>
              </form>

              {feedRecords.length === 0 ? (
                <EmptyState title="No feed records yet" description="Log feed usage to watch consumption and cost trends." />
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-pfs-muted md:block">
                    <Table>
                      <TableHeader className="bg-pfs-muted/40">
                        <TableRow>
                          <TableHead>Feed type</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Flock</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feedRecords.slice(0, 20).map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.feedType}</TableCell>
                            <TableCell>{record.quantityKg} kg</TableCell>
                            <TableCell>{record.cost ?? 0}</TableCell>
                            <TableCell>{new Date(record.recordedOn).toLocaleDateString()}</TableCell>
                            <TableCell>{record.flock?.name || 'Unassigned'}</TableCell>
                            <TableCell className="text-right">
                              <RecordActionButtons
                                onEdit={() => openFeedEdit(record)}
                                onDelete={() => confirmDelete('feed', record.id, record.feedType)}
                                deleting={actionTargetId === record.id}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {feedRecords.slice(0, 20).map((record) => (
                      <div key={record.id} className="rounded-2xl border border-pfs-muted bg-card p-4 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{record.feedType}</p>
                            <p className="text-muted-foreground">{record.quantityKg} kg</p>
                            <p className="text-muted-foreground">
                              Cost: {record.cost ?? 0} | {new Date(record.recordedOn).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline">{record.flock?.name || 'No flock'}</Badge>
                        </div>
                        <div className="mt-3">
                          <RecordActionButtons
                            onEdit={() => openFeedEdit(record)}
                            onDelete={() => confirmDelete('feed', record.id, record.feedType)}
                            deleting={actionTargetId === record.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mortality">
          <Card className="border-pfs-muted shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle className="text-pfs-danger">Mortality Logs</CardTitle>
              <CardDescription>Log losses with causes for farm health analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={createMortalityRecord} className="grid gap-3 rounded-2xl border border-pfs-muted bg-pfs-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select value={mortalityFlockId} onValueChange={setMortalityFlockId}>
                  <SelectTrigger className="rounded-2xl bg-input">
                    <SelectValue placeholder="Select flock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No flock selected</SelectItem>
                    {activeFlocks.map((flock) => (
                      <SelectItem key={flock.id} value={flock.id}>
                        {flock.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="rounded-2xl bg-input"
                  placeholder="Count"
                  inputMode="numeric"
                  value={mortalityCount}
                  onChange={(e) => setMortalityCount(e.target.value)}
                />
                <Input className="rounded-2xl bg-input" placeholder="Cause (optional)" value={mortalityCause} onChange={(e) => setMortalityCause(e.target.value)} />
                <Input className="rounded-2xl bg-input" type="date" value={mortalityDate} onChange={(e) => setMortalityDate(e.target.value)} />
                <Button type="submit" disabled={submitting || !activeFarmId} className="rounded-2xl bg-pfs-danger text-white sm:w-fit lg:col-span-4">
                  Add Mortality Log
                </Button>
              </form>

              {mortalityRecords.length === 0 ? (
                <EmptyState title="No mortality records yet" description="Track losses early to spot health issues faster." />
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-pfs-muted md:block">
                    <Table>
                      <TableHeader className="bg-pfs-muted/40">
                        <TableRow>
                          <TableHead>Count</TableHead>
                          <TableHead>Cause</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Flock</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mortalityRecords.slice(0, 20).map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium text-pfs-danger">{record.count} birds</TableCell>
                            <TableCell>{record.cause || 'Not provided'}</TableCell>
                            <TableCell>{new Date(record.recordedOn).toLocaleDateString()}</TableCell>
                            <TableCell>{record.flock?.name || 'Unassigned'}</TableCell>
                            <TableCell className="text-right">
                              <RecordActionButtons
                                onEdit={() => openMortalityEdit(record)}
                                onDelete={() => confirmDelete('mortality', record.id, `${record.count} birds`)}
                                deleting={actionTargetId === record.id}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {mortalityRecords.slice(0, 20).map((record) => (
                      <div key={record.id} className="rounded-2xl border border-pfs-muted bg-card p-4 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-pfs-danger">{record.count} birds</p>
                            <p className="text-muted-foreground">{record.cause || 'Cause not provided'}</p>
                            <p className="text-muted-foreground">{new Date(record.recordedOn).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="outline">{record.flock?.name || 'No flock'}</Badge>
                        </div>
                        <div className="mt-3">
                          <RecordActionButtons
                            onEdit={() => openMortalityEdit(record)}
                            onDelete={() => confirmDelete('mortality', record.id, `${record.count} birds`)}
                            deleting={actionTargetId === record.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vaccinations">
          <Card className="border-pfs-muted shadow-sm shadow-black/5">
            <CardHeader>
              <CardTitle className="text-pfs-accent">Vaccination Schedule</CardTitle>
              <CardDescription>Plan and track upcoming vaccinations per flock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={createVaccination} className="grid gap-3 rounded-2xl border border-pfs-muted bg-pfs-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select value={vaccinationFlockId} onValueChange={setVaccinationFlockId}>
                  <SelectTrigger className="rounded-2xl bg-input">
                    <SelectValue placeholder="Select flock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No flock selected</SelectItem>
                    {activeFlocks.map((flock) => (
                      <SelectItem key={flock.id} value={flock.id}>
                        {flock.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input className="rounded-2xl bg-input" placeholder="Vaccine name" value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} />
                <Input className="rounded-2xl bg-input" type="date" value={vaccinationDate} onChange={(e) => setVaccinationDate(e.target.value)} />
                <Button type="submit" disabled={submitting || !activeFarmId} className="rounded-2xl bg-pfs-accent text-white">
                  Schedule Vaccination
                </Button>
              </form>

              {vaccinations.length === 0 ? (
                <EmptyState title="No vaccination schedules yet" description="Schedule vaccines and keep the whole flock on time." />
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-2xl border border-pfs-muted md:block">
                    <Table>
                      <TableHeader className="bg-pfs-muted/40">
                        <TableRow>
                          <TableHead>Vaccine</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Flock</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vaccinations.slice(0, 20).map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.vaccineName}</TableCell>
                            <TableCell>{new Date(record.scheduledDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={record.status === 'MISSED' ? 'destructive' : record.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{record.flock?.name || 'Unassigned'}</TableCell>
                            <TableCell className="text-right">
                              <RecordActionButtons
                                onEdit={() => openVaccinationEdit(record)}
                                onDelete={() => confirmDelete('vaccination', record.id, record.vaccineName)}
                                deleting={actionTargetId === record.id}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {vaccinations.slice(0, 20).map((record) => (
                      <div key={record.id} className="rounded-2xl border border-pfs-muted bg-card p-4 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{record.vaccineName}</p>
                            <p className="text-muted-foreground">{new Date(record.scheduledDate).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">{record.flock?.name || 'No flock'}</p>
                          </div>
                          <Badge variant={record.status === 'MISSED' ? 'destructive' : record.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {record.status}
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <RecordActionButtons
                            onEdit={() => openVaccinationEdit(record)}
                            onDelete={() => confirmDelete('vaccination', record.id, record.vaccineName)}
                            deleting={actionTargetId === record.id}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editingKind !== null} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingKind === 'flock'
                ? 'Edit Flock'
                : editingKind === 'feed'
                ? 'Edit Feed Record'
                : editingKind === 'mortality'
                ? 'Edit Mortality Record'
                : 'Edit Vaccination'}
            </DialogTitle>
            <DialogDescription>Update the selected record and save the changes.</DialogDescription>
          </DialogHeader>

          {editingKind === 'flock' && editingFlock && (
            <form onSubmit={saveFlockEdit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={editFlockName} onChange={(e) => setEditFlockName(e.target.value)} placeholder="Flock name" />
                <Input value={editFlockBreed} onChange={(e) => setEditFlockBreed(e.target.value)} placeholder="Breed" />
                <Input value={editFlockBirdCount} onChange={(e) => setEditFlockBirdCount(e.target.value)} placeholder="Bird count" />
                <Select value={editFlockStatus} onValueChange={(value) => setEditFlockStatus(value as 'ACTIVE' | 'ARCHIVED')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={submitting}>Save Changes</Button>
            </form>
          )}

          {editingKind === 'feed' && editingFeed && (
            <form onSubmit={saveFeedEdit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={editFeedFlockId} onValueChange={setEditFeedFlockId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select flock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No flock selected</SelectItem>
                    {activeFlocks.map((flock) => (
                      <SelectItem key={flock.id} value={flock.id}>
                        {flock.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={editFeedType} onChange={(e) => setEditFeedType(e.target.value)} placeholder="Feed type" />
                <Input value={editFeedQuantity} onChange={(e) => setEditFeedQuantity(e.target.value)} placeholder="Quantity (kg)" />
                <Input value={editFeedCost} onChange={(e) => setEditFeedCost(e.target.value)} placeholder="Cost" />
                <Input type="date" value={editFeedDate} onChange={(e) => setEditFeedDate(e.target.value)} />
              </div>
              <Button type="submit" disabled={submitting}>Save Changes</Button>
            </form>
          )}

          {editingKind === 'mortality' && editingMortality && (
            <form onSubmit={saveMortalityEdit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={editMortalityFlockId} onValueChange={setEditMortalityFlockId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select flock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No flock selected</SelectItem>
                    {activeFlocks.map((flock) => (
                      <SelectItem key={flock.id} value={flock.id}>
                        {flock.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={editMortalityCount} onChange={(e) => setEditMortalityCount(e.target.value)} placeholder="Count" />
                <Input value={editMortalityCause} onChange={(e) => setEditMortalityCause(e.target.value)} placeholder="Cause" />
                <Input type="date" value={editMortalityDate} onChange={(e) => setEditMortalityDate(e.target.value)} />
              </div>
              <Button type="submit" disabled={submitting}>Save Changes</Button>
            </form>
          )}

          {editingKind === 'vaccination' && editingVaccination && (
            <form onSubmit={saveVaccinationEdit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={editVaccinationFlockId} onValueChange={setEditVaccinationFlockId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select flock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No flock selected</SelectItem>
                    {activeFlocks.map((flock) => (
                      <SelectItem key={flock.id} value={flock.id}>
                        {flock.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={editVaccineName} onChange={(e) => setEditVaccineName(e.target.value)} placeholder="Vaccine name" />
                <Input type="date" value={editVaccinationDate} onChange={(e) => setEditVaccinationDate(e.target.value)} />
                <Select value={editVaccinationStatus} onValueChange={(value) => setEditVaccinationStatus(value as 'SCHEDULED' | 'COMPLETED' | 'MISSED')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">SCHEDULED</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    <SelectItem value="MISSED">MISSED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={submitting}>Save Changes</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {pendingDelete?.label || 'the selected record'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (!pendingDelete) return;
                deleteRecord(pendingDelete.kind, pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
