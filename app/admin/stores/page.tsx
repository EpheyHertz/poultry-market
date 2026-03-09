'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import { Store, Search, Shield, Ban, CheckCircle } from 'lucide-react';

export default function AdminStoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { fetchStores(); }, [page, search, statusFilter]);

  async function fetchStores() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/stores?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStores(data.stores || []);
        setPagination(data.pagination);
      }
    } catch { toast.error('Failed to fetch stores'); }
    finally { setLoading(false); }
  }

  async function updateStatus(storeId: string, status: string) {
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Store ${status.toLowerCase()}`);
      fetchStores();
    } catch (error: any) { toast.error(error.message); }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="h-6 w-6" /> Store Management</h1>

        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search stores..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'ALL' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? <p className="text-gray-500">Loading...</p> : stores.length === 0 ? <p className="text-gray-500">No stores found</p> : (
          <div className="space-y-4">
            {stores.map((store: any) => (
              <Card key={store.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{store.storeName}</span>
                        <Badge variant={store.status === 'ACTIVE' ? 'default' : store.status === 'SUSPENDED' ? 'destructive' : 'secondary'}>{store.status}</Badge>
                        <Badge variant="outline">{store.storeType}</Badge>
                        {store.verificationLevel !== 'NONE' && <Badge className="bg-green-100 text-green-800"><Shield className="h-3 w-3 mr-1" />{store.verificationLevel.replace(/_/g, ' ')}</Badge>}
                      </div>
                      <p className="text-sm">Owner: {store.owner?.name} ({store.owner?.email})</p>
                      <p className="text-sm text-gray-500">Slug: {store.storeSlug} | Products: {store._count?.products} | Orders: {store._count?.orders}</p>
                      {store.storeWallet && (
                        <p className="text-sm">
                          Balance: <strong>{formatCurrency(store.storeWallet.availableBalance)}</strong> |
                          Escrow: {formatCurrency(store.storeWallet.escrowBalance)} |
                          Earned: {formatCurrency(store.storeWallet.totalEarned)} |
                          Withdrawn: {formatCurrency(store.storeWallet.totalWithdrawn)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {store.status !== 'ACTIVE' && (
                        <Button size="sm" onClick={() => updateStatus(store.id, 'ACTIVE')}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Activate
                        </Button>
                      )}
                      {store.status !== 'SUSPENDED' && (
                        <Button size="sm" variant="destructive" onClick={() => updateStatus(store.id, 'SUSPENDED')}>
                          <Ban className="h-4 w-4 mr-1" /> Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
