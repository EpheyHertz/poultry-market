'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useFarm, FeedInventory } from '@/contexts/farm-context';
import { FarmSwitcher } from '@/components/farm/farm-switcher';
import { FeedInventoryGauge } from '@/components/farm/feed-inventory-gauge';
import { FeedConsumptionChart } from '@/components/farm/feed-consumption-chart';
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
import { Plus, AlertTriangle } from 'lucide-react';

export default function FeedManagementPage() {
  const { feedInventory, addFeedInventory, updateFeedInventory, getLowStockFeeds, activeFarmId, setActiveFarmId } = useFarm();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [formData, setFormData] = useState<Partial<FeedInventory>>({
    feedType: '',
    quantity: 0,
    unit: 'kg',
    reorderLevel: 0,
    supplier: '',
    costPerUnit: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const lowStockFeeds = getLowStockFeeds();
  const feedConsumptionData = feedInventory.map((feed) => ({
    flock: feed.feedType,
    consumedKg: feed.quantity,
  }));

  const handleOpen = (feed?: FeedInventory) => {
    if (feed) {
      setEditingId(feed.id);
      setFormData(feed);
      setIsUpdate(true);
    } else {
      setEditingId(null);
      setFormData({
        feedType: '',
        quantity: 0,
        unit: 'kg',
        reorderLevel: 0,
        supplier: '',
        costPerUnit: 0,
      });
      setIsUpdate(false);
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!formData.feedType || !formData.supplier) {
      alert('Please fill in all required fields');
      return;
    }

    if (isUpdate && editingId) {
      updateFeedInventory(editingId, formData);
    } else {
      addFeedInventory({
        id: `feed-${Date.now()}`,
        feedType: formData.feedType!,
        quantity: formData.quantity || 0,
        unit: formData.unit || 'kg',
        reorderLevel: formData.reorderLevel || 0,
        supplier: formData.supplier!,
        lastRestockDate: new Date(),
        costPerUnit: formData.costPerUnit || 0,
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
            <h1 className="text-3xl font-bold text-foreground">Feed Management</h1>
            <p className="text-muted-foreground mt-2">
              Track inventory levels and manage restocking
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <FarmSwitcher value={activeFarmId} onChange={setActiveFarmId} redirectTo="/farm/feed" />
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpen()} className="gap-2" disabled={!activeFarmId}>
                  <Plus className="h-4 w-4" />
                  Add Feed
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{isUpdate ? 'Update Feed' : 'Add New Feed'}</DialogTitle>
                  <DialogDescription>
                    {isUpdate ? 'Update feed information' : 'Add feed type to inventory'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="feedType">Feed Type *</Label>
                    <Input
                      id="feedType"
                      placeholder="e.g., Layer Pellets"
                      value={formData.feedType || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, feedType: e.target.value })
                      }
                      className="mt-1.5"
                    />
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="0"
                      value={formData.quantity || 0}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: parseFloat(e.target.value) })
                      }
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      placeholder="kg, bags, etc"
                      value={formData.unit || 'kg'}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reorderLevel">Reorder Level</Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    placeholder="0"
                    value={formData.reorderLevel || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, reorderLevel: parseFloat(e.target.value) })
                    }
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Input
                    id="supplier"
                    placeholder="e.g., Premier Feeds"
                    value={formData.supplier || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier: e.target.value })
                    }
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="costPerUnit">Cost Per Unit ($)</Label>
                  <Input
                    id="costPerUnit"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.costPerUnit || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })
                    }
                    className="mt-1.5"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button className="flex-1" onClick={handleSave}>
                    {isUpdate ? 'Update' : 'Add'} Feed
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
              Select a farm to view and manage its feed inventory.
            </CardContent>
          </Card>
        )}

        {/* Low Stock Alerts */}
        {lowStockFeeds.length > 0 && (
          <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="text-orange-900 dark:text-orange-100 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockFeeds.map((feed) => (
                  <div
                    key={feed.id}
                    className="flex justify-between items-center text-sm text-orange-800 dark:text-orange-200"
                  >
                    <span>
                      <strong>{feed.feedType}</strong> - {feed.quantity} {feed.unit} remaining
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpen(feed)}
                      className="text-xs"
                    >
                      Restock
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <FeedConsumptionChart data={feedConsumptionData} />

        {/* Feed Inventory Grid */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {feedInventory.length === 0 ? (
            <Card className="col-span-full bg-card">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-12">
                  No feed inventory items. Create your first feed item to track inventory.
                </p>
              </CardContent>
            </Card>
          ) : (
            feedInventory.map((feed) => (
              <div
                key={feed.id}
                className="relative group"
                onDoubleClick={() => handleOpen(feed)}
              >
                <FeedInventoryGauge feed={feed} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpen(feed)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Edit
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Feed Summary */}
        {feedInventory.length > 0 && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Inventory Summary</CardTitle>
              <CardDescription>Overall feed inventory statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Feed Types</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {feedInventory.length}
                  </p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Stock Value</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    ${(
                      feedInventory.reduce(
                        (sum, f) => sum + f.quantity * f.costPerUnit,
                        0
                      )
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {lowStockFeeds.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
