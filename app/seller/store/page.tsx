'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import {
  Store, Package, ShoppingCart, Wallet, TrendingUp,
  AlertTriangle, ArrowUpRight, Settings, ExternalLink, Eye,
} from 'lucide-react';

export default function StoreSetupPage() {
  const [store, setStore] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<'overview' | 'settings'>('overview');
  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    location: '',
    contactPhone: '',
    themeColor: '#16a34a',
  });

  useEffect(() => {
    fetchStore();
  }, []);

  async function fetchStore() {
    try {
      const res = await fetch('/api/store');
      if (res.ok) {
        const data = await res.json();
        setStore(data);
        setForm({
          storeName: data.storeName || '',
          storeDescription: data.storeDescription || '',
          location: data.location || '',
          contactPhone: data.contactPhone || '',
          themeColor: data.themeColor || '#16a34a',
        });
        // Fetch dashboard
        const dashRes = await fetch('/api/store/dashboard');
        if (dashRes.ok) setDashboard(await dashRes.json());
      }
    } catch {
      // No store yet
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.storeName || form.storeName.length < 2) {
      toast.error('Store name must be at least 2 characters');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Store created!');
      fetchStore();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create store');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate() {
    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success('Store updated');
      fetchStore();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update store');
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // No store — show creation form
  if (!store) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto p-6 space-y-6">
          <div className="text-center space-y-2">
            <Store className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold">Create Your Store</h1>
            <p className="text-gray-500">Set up your storefront to start selling</p>
          </div>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label>Store Name *</Label>
                <Input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} placeholder="My Poultry Farm" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.storeDescription} onChange={(e) => setForm({ ...form, storeDescription: e.target.value })} placeholder="Tell customers about your store..." />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Nairobi, Kenya" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+254..." />
              </div>
              <div>
                <Label>Theme Color</Label>
                <div className="flex items-center gap-3">
                  <Input type="color" value={form.themeColor} onChange={(e) => setForm({ ...form, themeColor: e.target.value })} className="w-16 h-10 p-1" />
                  <span className="text-sm text-gray-500">{form.themeColor}</span>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create Store'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const metrics = dashboard?.metrics;
  const wallet = dashboard?.store?.storeWallet;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Store className="h-6 w-6" /> {store.storeName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={store.status === 'ACTIVE' ? 'default' : 'secondary'}>{store.status}</Badge>
              {store.verificationLevel !== 'NONE' && (
                <Badge variant="outline">{store.verificationLevel.replace(/_/g, ' ')}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(`/storefront/${store.storeSlug}`, '_blank')}>
              <Eye className="h-4 w-4 mr-1" /> View Store
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTab(tab === 'settings' ? 'overview' : 'settings')}>
              <Settings className="h-4 w-4 mr-1" /> {tab === 'settings' ? 'Dashboard' : 'Settings'}
            </Button>
          </div>
        </div>

        {tab === 'settings' ? (
          <Card>
            <CardHeader><CardTitle>Store Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Store Name</Label>
                <Input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.storeDescription} onChange={(e) => setForm({ ...form, storeDescription: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Theme Color</Label>
                <div className="flex items-center gap-3">
                  <Input type="color" value={form.themeColor} onChange={(e) => setForm({ ...form, themeColor: e.target.value })} className="w-16 h-10 p-1" />
                  <span className="text-sm text-gray-500">{form.themeColor}</span>
                </div>
              </div>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Today&apos;s Orders</p>
                      <p className="text-2xl font-bold">{metrics?.todayOrders || 0}</p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Monthly Revenue</p>
                      <p className="text-2xl font-bold">{formatCurrency(metrics?.monthRevenue || 0)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Available Balance</p>
                      <p className="text-2xl font-bold">{formatCurrency(wallet?.availableBalance || 0)}</p>
                    </div>
                    <Wallet className="h-8 w-8 text-purple-500" />
                  </div>
                  {(wallet?.escrowBalance || 0) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">In escrow: {formatCurrency(wallet.escrowBalance)}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Products</p>
                      <p className="text-2xl font-bold">{store._count?.products || 0}</p>
                    </div>
                    <Package className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Products + Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Top Products (30 days)</CardTitle></CardHeader>
                <CardContent>
                  {dashboard?.topProducts?.length ? (
                    <div className="space-y-3">
                      {dashboard.topProducts.map((p: any, i: number) => (
                        <div key={p.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono text-gray-400 w-6">#{i + 1}</span>
                            <span className="font-medium">{p.productName}</span>
                          </div>
                          <Badge variant="outline">{p.quantitySold} sold</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No sales data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Low Stock Alert</CardTitle></CardHeader>
                <CardContent>
                  {dashboard?.lowStock?.length ? (
                    <div className="space-y-3">
                      {dashboard.lowStock.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <span className="font-medium">{p.name}</span>
                          <Badge variant={p.stock === 0 ? 'destructive' : 'secondary'}>
                            {p.stock} left
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">All stocked up!</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Recent Orders</CardTitle></CardHeader>
              <CardContent>
                {dashboard?.recentOrders?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-2 font-medium">Order</th>
                          <th className="pb-2 font-medium">Customer</th>
                          <th className="pb-2 font-medium">Items</th>
                          <th className="pb-2 font-medium">Total</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.recentOrders.map((order: any) => (
                          <tr key={order.id} className="border-b last:border-0">
                            <td className="py-2 font-mono text-xs">{order.orderNumber}</td>
                            <td className="py-2">{order.customer?.name || 'N/A'}</td>
                            <td className="py-2">{order.items?.length || 0}</td>
                            <td className="py-2 font-medium">{formatCurrency(order.total)}</td>
                            <td className="py-2"><Badge variant="outline">{order.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No recent orders</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => window.location.href = '/seller/store/products'}>
                <Package className="h-5 w-5" />
                <span>Manage Products</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => window.location.href = '/seller/store/wallet'}>
                <Wallet className="h-5 w-5" />
                <span>Wallet & Withdrawals</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-1" onClick={() => window.location.href = '/seller/store/verification'}>
                <ArrowUpRight className="h-5 w-5" />
                <span>Verification</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
