'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useFarm, Flock, FlockStatus } from '@/contexts/farm-context';
import { FarmSwitcher } from '@/components/farm/farm-switcher';
import { FlockTable } from '@/components/farm/flock-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from 'lucide-react';

const FLOCK_STATUSES: FlockStatus[] = ['ACTIVE', 'SOLD', 'CULLED', 'PROCESSING'];

export default function FlockManagementPage() {
  const { flocks, addFlock, updateFlock, deleteFlock, activeFarmId, setActiveFarmId } = useFarm();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Flock | null>(null);
  const [formData, setFormData] = useState<Partial<Flock>>({
    name: '',
    breed: '',
    quantity: 0,
    status: 'ACTIVE',
    averageWeight: 0,
    averageAge: 0,
    mortality: 0,
    FCR: 0,
  });

  const handleOpen = (flock?: Flock) => {
    if (flock) {
      setEditingId(flock.id);
      setFormData(flock);
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        breed: '',
        quantity: 0,
        status: 'ACTIVE',
        averageWeight: 0,
        averageAge: 0,
        mortality: 0,
        FCR: 0,
      });
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.breed) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingId) {
      updateFlock(editingId, formData);
    } else {
      addFlock({
        id: `flock-${Date.now()}`,
        name: formData.name!,
        breed: formData.breed!,
        quantity: formData.quantity || 0,
        status: (formData.status || 'ACTIVE') as FlockStatus,
        dateAdded: new Date(),
        averageWeight: formData.averageWeight || 0,
        averageAge: formData.averageAge || 0,
        mortality: formData.mortality || 0,
        FCR: formData.FCR || 0,
        farmId: activeFarmId || '',
      });
    }

    setIsOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Flock Management</h1>
            <p className="text-muted-foreground mt-2">
              Add, edit, and manage your poultry flocks
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <FarmSwitcher value={activeFarmId} onChange={setActiveFarmId} redirectTo="/farm/flocks" />
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpen()} className="gap-2" disabled={!activeFarmId}>
                  <Plus className="h-4 w-4" />
                  Add Flock
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Flock' : 'Add New Flock'}</DialogTitle>
                  <DialogDescription>
                    {editingId
                      ? 'Update flock information'
                      : 'Create a new flock to start tracking'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Flock Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Layer Flock A"
                      value={formData.name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1.5"
                    />
                  </div>

                <div>
                  <Label htmlFor="breed">Breed *</Label>
                  <Input
                    id="breed"
                    placeholder="e.g., ISA Brown"
                    value={formData.breed || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, breed: e.target.value })
                    }
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={formData.quantity || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) })
                    }
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as FlockStatus })
                    }
                    className="mt-1.5 w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                  >
                    {FLOCK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="weight">Avg Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={formData.averageWeight || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          averageWeight: parseFloat(e.target.value),
                        })
                      }
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Avg Age (days)</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="0"
                      value={formData.averageAge || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          averageAge: parseInt(e.target.value),
                        })
                      }
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mortality">Mortality (%)</Label>
                    <Input
                      id="mortality"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={formData.mortality || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mortality: parseFloat(e.target.value),
                        })
                      }
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fcr">FCR</Label>
                    <Input
                      id="fcr"
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.FCR || 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          FCR: parseFloat(e.target.value),
                        })
                      }
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                  >
                    {editingId ? 'Update' : 'Create'} Flock
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!activeFarmId && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Select a farm to view and manage its flocks.
            </CardContent>
          </Card>
        )}

        {/* Flocks Table */}
        <FlockTable
          flocks={flocks}
          onEdit={(flock) => {
            handleOpen(flock);
          }}
          onDelete={(flockId) => {
            const target = flocks.find((flock) => flock.id === flockId) || null;
            setDeleteTarget(target);
          }}
        />
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete flock?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.name || 'the selected flock'} from your farm records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (!deleteTarget) return;
                deleteFlock(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete flock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
