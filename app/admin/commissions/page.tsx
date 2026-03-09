'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Percent, Plus, Edit, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

interface SellerWithCommission {
  id: string;
  name: string;
  email: string;
  role: string;
  commission: {
    id?: string;
    rate: number;
    isActive: boolean;
    totalCommission: number;
    totalSales: number;
  };
  stats: { products: number; orders: number; posSales: number };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminCommissions() {
  const [user, setUser] = useState<any>(null);
  const [sellers, setSellers] = useState<SellerWithCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSeller, setEditingSeller] = useState<SellerWithCommission | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sellerId: '',
    commissionRate: 5,
    isActive: true,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'ADMIN') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch {
        router.push('/auth/login');
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) fetchCommissions();
  }, [user]);

  const fetchCommissions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/commissions');
      if (res.ok) {
        const data = await res.json();
        setSellers(data.sellers || []);
      }
    } catch (e) {
      console.error('Failed to fetch commissions:', e);
      toast.error('Failed to load commissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        sellerId: editingSeller ? editingSeller.id : formData.sellerId,
        rate: formData.commissionRate,
      };

      const res = await fetch('/api/admin/commissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success('Commission saved');
        setIsDialogOpen(false);
        setEditingSeller(null);
        fetchCommissions();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save commission');
      }
    } catch {
      toast.error('Failed to save commission');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (seller: SellerWithCommission) => {
    setEditingSeller(seller);
    setFormData({
      sellerId: seller.id,
      commissionRate: seller.commission.rate,
      isActive: seller.commission.isActive,
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditingSeller(null);
    setFormData({ sellerId: '', commissionRate: 5, isActive: true, notes: '' });
    setIsDialogOpen(true);
  };

  const filtered = sellers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return <div>Loading...</div>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Commission Management</h1>
            <p className="text-muted-foreground mt-1">Configure seller commission rates</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" /> Set Commission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSeller ? 'Update Commission' : 'Set Seller Commission'}
                </DialogTitle>
                <DialogDescription>
                  {editingSeller
                    ? `Editing commission for ${editingSeller.name}`
                    : 'Set a commission rate for a seller'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {!editingSeller && (
                  <div className="space-y-2">
                    <Label>Seller ID</Label>
                    <Input
                      placeholder="Enter seller ID"
                      value={formData.sellerId}
                      onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Commission Rate (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={formData.commissionRate}
                    onChange={(e) =>
                      setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="Reason for rate change..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingSeller ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sellers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sellers.length}</div>
              <p className="text-xs text-muted-foreground">With commission rates</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Commission Rate</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sellers.length > 0
                  ? (sellers.reduce((s, c) => s + c.commission.rate, 0) / sellers.length).toFixed(1)
                  : '0'}
                %
              </div>
              <p className="text-xs text-muted-foreground">Across active sellers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission Earned</CardTitle>
              <Percent className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(sellers.reduce((s, c) => s + c.commission.totalCommission, 0))}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + List */}
        <Card>
          <CardHeader>
            <CardTitle>Seller Commissions</CardTitle>
            <CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sellers..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No commissions configured yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((seller) => (
                  <div
                    key={seller.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{seller.name}</p>
                        <p className="text-sm text-muted-foreground">{seller.email}</p>
                      </div>
                      <Badge variant={seller.commission.isActive ? 'default' : 'secondary'}>
                        {seller.commission.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold text-lg">{seller.commission.rate}%</p>
                        <p className="text-xs text-muted-foreground">Rate</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          {formatCurrency(seller.commission.totalCommission)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          of {formatCurrency(seller.commission.totalSales)} sales
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openEdit(seller)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
