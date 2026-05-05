'use client';

import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useFarm, HealthRecord, HealthAlertType } from '@/contexts/farm-context';
import { FarmSwitcher } from '@/components/farm/farm-switcher';
import { HealthAlertBadge } from '@/components/farm/health-alert-badge';
import { MortalityChart } from '@/components/farm/mortality-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Clock3, Pencil, Plus, Trash2, AlertTriangle } from 'lucide-react';

type HealthRecordType = 'VACCINATION' | 'TREATMENT' | 'MORTALITY' | 'DISEASE_ALERT';

const RECORD_TYPES: HealthRecordType[] = ['VACCINATION', 'TREATMENT', 'MORTALITY', 'DISEASE_ALERT'];
const SEVERITY_LEVELS: HealthAlertType[] = ['INFO', 'WARNING', 'CRITICAL'];

type HealthFormState = {
  flockId: string;
  type: HealthRecordType;
  severity: HealthAlertType;
  description: string;
  notes: string;
  quantity: string;
  recordedOn: string;
};

const INITIAL_FORM: HealthFormState = {
  flockId: '',
  type: 'VACCINATION',
  severity: 'INFO',
  description: '',
  notes: '',
  quantity: '0',
  recordedOn: new Date().toISOString().split('T')[0],
};

export default function HealthManagementPage() {
  const { healthRecords, flocks, addHealthRecord, updateHealthRecord, deleteHealthRecord, activeFarmId, setActiveFarmId } = useFarm();
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HealthRecord | null>(null);
  const [formData, setFormData] = useState<HealthFormState>(INITIAL_FORM);

  const criticalAlerts = useMemo(() => healthRecords.filter((record) => record.severity === 'CRITICAL'), [healthRecords]);

  const mortalityTrendData = useMemo(() => {
    const buckets = new Map<string, number>();

    healthRecords
      .filter((record) => record.type === 'MORTALITY')
      .forEach((record) => {
        const week = record.date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
        buckets.set(week, (buckets.get(week) || 0) + (record.quantity || 0));
      });

    return Array.from(buckets.entries()).map(([week, mortalityRate]) => ({
      week,
      mortalityRate,
    }));
  }, [healthRecords]);

  const resetForm = () => {
    setEditingRecord(null);
    setFormData(INITIAL_FORM);
  };

  const openCreateDialog = () => {
    resetForm();
    setRecordDialogOpen(true);
  };

  const openEditDialog = (record: HealthRecord) => {
    setEditingRecord(record);
    setFormData({
      flockId: record.flockId,
      type: record.type,
      severity: record.severity,
      description: record.description,
      notes: record.notes || '',
      quantity: String(record.quantity ?? 0),
      recordedOn: record.date.toISOString().split('T')[0],
    });
    setRecordDialogOpen(true);
  };

  const closeRecordDialog = () => {
    setRecordDialogOpen(false);
    resetForm();
  };

  const handleSave = () => {
    if (!formData.flockId) {
      toast.error('Select a flock first');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const payload: HealthRecord = {
      id: editingRecord?.id || `health-${Date.now()}`,
      flockId: formData.flockId,
      type: formData.type,
      severity: formData.severity,
      description: formData.description.trim(),
      notes: formData.notes.trim() || undefined,
      quantity: formData.type === 'MORTALITY' ? Number(formData.quantity || '0') : undefined,
      date: new Date(formData.recordedOn),
    };

    if (editingRecord) {
      updateHealthRecord(editingRecord.id, payload);
      toast.success('Health record updated');
    } else {
      addHealthRecord(payload);
      toast.success('Health record logged');
    }

    closeRecordDialog();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Health & Biosecurity</h1>
            <p className="mt-2 text-muted-foreground">
              Track vaccinations, treatments, mortality, and disease alerts with a structured timeline.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <FarmSwitcher value={activeFarmId} onChange={setActiveFarmId} redirectTo="/farm/health" />
            </div>
            <Button className="gap-2" onClick={openCreateDialog} disabled={!activeFarmId}>
              <Plus className="h-4 w-4" />
              Log Record
            </Button>
          </div>
        </section>

        {!activeFarmId && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Select a farm to view health records and log new entries.
            </CardContent>
          </Card>
        )}

        {criticalAlerts.length > 0 && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
                <AlertTriangle className="h-5 w-5" />
                Critical Alerts
              </CardTitle>
              <CardDescription className="text-red-800/80 dark:text-red-200/80">
                {criticalAlerts.length} urgent health item{criticalAlerts.length !== 1 ? 's' : ''} require attention.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <MortalityChart data={mortalityTrendData} />

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Health Records Timeline</CardTitle>
            <CardDescription>All logged health events and treatments</CardDescription>
          </CardHeader>
          <CardContent>
            {healthRecords.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No health records yet. Log your first record to track flock health.
              </p>
            ) : (
              <div className="space-y-4">
                {healthRecords
                  .slice()
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((record) => {
                    const flock = flocks.find((item) => item.id === record.flockId);

                    return (
                      <div
                        key={record.id}
                        className="rounded-xl border border-border p-4 transition-colors hover:bg-card/70"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex gap-3">
                            <div className="mt-1 rounded-full bg-muted p-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">{record.description}</p>
                                <Badge variant="outline">{record.type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {flock?.name || 'Unassigned flock'} · {new Date(record.date).toLocaleDateString()}
                              </p>
                              {record.notes && <p className="text-sm text-muted-foreground">{record.notes}</p>}
                              {record.quantity !== undefined && (
                                <p className="text-sm text-muted-foreground">
                                  Mortality count: {record.quantity}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <HealthAlertBadge severity={record.severity} message={record.severity} />
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditDialog(record)}>
                              <Pencil className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteTarget(record)}>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Health Record' : 'Log Health Record'}</DialogTitle>
            <DialogDescription>
              Record vaccinations, treatments, mortality events, and biosecurity tasks in a professional timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div>
              <Label htmlFor="flock">Select Flock</Label>
              <select
                id="flock"
                value={formData.flockId}
                onChange={(event) => setFormData({ ...formData, flockId: event.target.value })}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
              >
                <option value="">-- Choose a flock --</option>
                {flocks.map((flock) => (
                  <option key={flock.id} value={flock.id}>
                    {flock.name} ({flock.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="type">Record Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(event) => setFormData({ ...formData, type: event.target.value as HealthRecordType })}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
              >
                {RECORD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="severity">Severity</Label>
              <select
                id="severity"
                value={formData.severity}
                onChange={(event) => setFormData({ ...formData, severity: event.target.value as HealthAlertType })}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
              >
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="recordedOn">Recorded Date</Label>
              <Input
                id="recordedOn"
                type="date"
                value={formData.recordedOn}
                onChange={(event) => setFormData({ ...formData, recordedOn: event.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Newcastle vaccination, water line cleaning, respiratory checks"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                className="mt-1.5"
              />
            </div>

            {formData.type === 'MORTALITY' && (
              <div>
                <Label htmlFor="quantity">Mortality Count</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(event) => setFormData({ ...formData, quantity: event.target.value })}
                  className="mt-1.5"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional context, medication used, observations, or next steps"
                value={formData.notes}
                onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave}>
              {editingRecord ? 'Save Changes' : 'Log Record'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setRecordDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete health record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected health record and its timeline entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (!deleteTarget) return;
                deleteHealthRecord(deleteTarget.id);
                toast.success('Health record deleted');
                setDeleteTarget(null);
              }}
            >
              Delete record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
