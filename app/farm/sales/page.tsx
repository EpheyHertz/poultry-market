'use client';

import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useFarm, SalesRecord } from '@/contexts/farm-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SalesPieChart } from '@/components/farm/sales-pie-chart';
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
import { Pencil, Plus, Trash2, TrendingUp, DollarSign, Package } from 'lucide-react';

const PRODUCT_TYPES = [
  { value: 'EGGS', label: 'Eggs' },
  { value: 'MEAT', label: 'Chicken Meat' },
  { value: 'LIVE_BIRDS', label: 'Live Birds' },
  { value: 'CUSTOM', label: 'Custom Product' },
] as const;

type ProductType = (typeof PRODUCT_TYPES)[number]['value'];

type SaleFormData = {
  productType: ProductType;
  customProductType: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  buyerName: string;
  notes: string;
};

const INITIAL_FORM: SaleFormData = {
  productType: 'EGGS',
  customProductType: '',
  quantity: '0',
  unit: 'trays',
  pricePerUnit: '0',
  buyerName: '',
  notes: '',
};

function getSaleLabel(sale: SalesRecord) {
  if (sale.productType === 'CUSTOM') {
    return sale.customProductType || 'Custom product';
  }

  return sale.productType.replace('_', ' ');
}

export default function SalesRecordsPage() {
  const { salesRecords, addSalesRecord, updateSalesRecord, deleteSalesRecord, getMonthlySales } = useFarm();
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<SalesRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesRecord | null>(null);
  const [formData, setFormData] = useState<SaleFormData>(INITIAL_FORM);

  const monthlySales = getMonthlySales(1);
  const totalRevenue = salesRecords.reduce((sum, sale) => sum + sale.totalRevenue, 0);
  const salesChartData = useMemo(
    () =>
      salesRecords.reduce<Record<string, { name: string; value: number; color: string }>>(
        (accumulator, sale, index) => {
          const key = sale.productType === 'CUSTOM' ? sale.customProductType || 'Custom' : sale.productType;
          if (!accumulator[key]) {
            const palette = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'];
            accumulator[key] = { name: key.replace('_', ' '), value: 0, color: palette[index % palette.length] };
          }
          accumulator[key].value += sale.totalRevenue;
          return accumulator;
        },
        {}
      ),
    [salesRecords]
  );

  const summaryCards = useMemo(
    () => [
      {
        title: 'Monthly Revenue',
        value: monthlySales.toFixed(2),
        icon: DollarSign,
        tone: 'text-emerald-600',
        helper: 'Current month',
      },
      {
        title: 'Total Revenue',
        value: totalRevenue.toFixed(2),
        icon: TrendingUp,
        tone: 'text-blue-600',
        helper: 'All time',
      },
      {
        title: 'Total Sales',
        value: String(salesRecords.length),
        icon: Package,
        tone: 'text-purple-600',
        helper: 'Transactions',
      },
    ],
    [monthlySales, salesRecords.length, totalRevenue]
  );

  const resetForm = () => {
    setEditingSale(null);
    setFormData(INITIAL_FORM);
  };

  const openCreateDialog = () => {
    resetForm();
    setSaleDialogOpen(true);
  };

  const openEditDialog = (sale: SalesRecord) => {
    setEditingSale(sale);
    setFormData({
      productType: sale.productType,
      customProductType: sale.customProductType || '',
      quantity: String(sale.quantity),
      unit: sale.unit,
      pricePerUnit: String(sale.pricePerUnit),
      buyerName: sale.buyerName,
      notes: sale.notes || '',
    });
    setSaleDialogOpen(true);
  };

  const closeSaleDialog = () => {
    setSaleDialogOpen(false);
    resetForm();
  };

  const handleSave = () => {
    const quantity = Number(formData.quantity);
    const pricePerUnit = Number(formData.pricePerUnit);

    if (!formData.buyerName.trim()) {
      toast.error('Buyer name is required');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      toast.error('Price per unit must be valid');
      return;
    }

    if (formData.productType === 'CUSTOM' && !formData.customProductType.trim()) {
      toast.error('Custom product name is required');
      return;
    }

    const customProductType =
      formData.productType === 'CUSTOM' ? formData.customProductType.trim() : undefined;

    const payload: SalesRecord = {
      id: editingSale?.id || `sale-${Date.now()}`,
      productType: formData.productType,
      customProductType,
      quantity: Math.round(quantity),
      unit: formData.unit.trim() || 'units',
      pricePerUnit,
      totalRevenue: quantity * pricePerUnit,
      date: editingSale?.date || new Date(),
      buyerName: formData.buyerName.trim(),
      notes: formData.notes.trim() || undefined,
      farmId: editingSale?.farmId || 'farm-001',
    };

    if (editingSale) {
      updateSalesRecord(editingSale.id, payload);
      toast.success('Sale updated');
    } else {
      addSalesRecord(payload);
      toast.success('Sale recorded');
    }

    closeSaleDialog();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Farm Sales</h1>
            <p className="mt-2 text-muted-foreground">
              Record sales, edit transactions, and track revenue by product mix.
            </p>
          </div>

          <Button className="gap-2" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
            Record Sale
          </Button>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${card.tone}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.helper}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <SalesPieChart data={Object.values(salesChartData)} />

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Sales History</CardTitle>
            <CardDescription>All recorded sales transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {salesRecords.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No sales recorded yet. Add your first transaction to begin tracking revenue.
              </p>
            ) : (
              <div className="grid gap-3">
                {salesRecords
                  .slice()
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((sale) => (
                    <div
                      key={sale.id}
                      className="flex flex-col gap-3 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{getSaleLabel(sale)}</p>
                          {sale.productType === 'CUSTOM' && sale.customProductType && (
                            <Badge variant="outline">Custom</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {sale.quantity} {sale.unit} sold to {sale.buyerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.date.toLocaleString()} · ${sale.pricePerUnit.toFixed(2)} / unit
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-lg bg-muted px-3 py-2 text-sm font-semibold">
                          ${sale.totalRevenue.toFixed(2)}
                        </div>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditDialog(sale)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteTarget(sale)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSale ? 'Edit Sale' : 'Record Sale'}</DialogTitle>
            <DialogDescription>
              Keep your sales ledger accurate with clear product names, quantity, and buyer details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="productType">Product Type</Label>
              <select
                id="productType"
                value={formData.productType}
                onChange={(event) => setFormData({ ...formData, productType: event.target.value as ProductType })}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
              >
                {PRODUCT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.productType === 'CUSTOM' && (
              <div>
                <Label htmlFor="customProductType">Custom Product Name</Label>
                <Input
                  id="customProductType"
                  placeholder="e.g., Fertile Eggs"
                  value={formData.customProductType}
                  onChange={(event) => setFormData({ ...formData, customProductType: event.target.value })}
                  className="mt-1.5"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(event) => setFormData({ ...formData, quantity: event.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="trays, kg, birds"
                  value={formData.unit}
                  onChange={(event) => setFormData({ ...formData, unit: event.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pricePerUnit">Price Per Unit</Label>
              <Input
                id="pricePerUnit"
                type="number"
                step="0.01"
                min="0"
                value={formData.pricePerUnit}
                onChange={(event) => setFormData({ ...formData, pricePerUnit: event.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="buyerName">Buyer Name</Label>
              <Input
                id="buyerName"
                placeholder="e.g., City Hotels Ltd"
                value={formData.buyerName}
                onChange={(event) => setFormData({ ...formData, buyerName: event.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional transaction notes"
                value={formData.notes}
                onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              Total Revenue: ${((Number(formData.quantity || '0') || 0) * (Number(formData.pricePerUnit || '0') || 0)).toFixed(2)}
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleSave}>
                {editingSale ? 'Save Changes' : 'Save Sale'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={closeSaleDialog}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the sale for {deleteTarget ? getSaleLabel(deleteTarget) : 'the selected item'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (!deleteTarget) return;
                deleteSalesRecord(deleteTarget.id);
                toast.success('Sale deleted');
                setDeleteTarget(null);
              }}
            >
              Delete sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
