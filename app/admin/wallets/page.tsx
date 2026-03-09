'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet,
  Search,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface AdminWallet {
  id: string;
  intasendId: string;
  walletType: string;
  currency: string;
  label: string;
  canDisburse: boolean;
  currentBalance: number;
  availableBalance: number;
  isPrimary: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    avatar: string | null;
  };
  _count: { transactions: number };
}

interface Aggregates {
  totalBalance: number;
  totalAvailable: number;
  walletCount: number;
  monthlyDeposits: number;
  monthlyDepositCount: number;
  monthlyWithdrawals: number;
  monthlyWithdrawalCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  fee: number;
  netAmount: number;
  narrative: string | null;
  createdAt: string;
}

function formatKES(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'COMPLETED': return 'default';
    case 'PENDING': return 'outline';
    case 'PROCESSING': return 'secondary';
    case 'FAILED': case 'CANCELLED': return 'destructive';
    default: return 'outline';
  }
}

function txTypeLabel(type: string) {
  const map: Record<string, string> = {
    DEPOSIT: 'Deposit',
    WITHDRAWAL_MPESA: 'M-Pesa Out',
    WITHDRAWAL_B2B: 'B2B',
    WITHDRAWAL_BANK: 'Bank Out',
    INTERNAL_IN: 'Transfer In',
    INTERNAL_OUT: 'Transfer Out',
    COMMISSION: 'Commission',
    REFUND: 'Refund',
    SALE_CREDIT: 'Sale Credit',
  };
  return map[type] || type;
}

export default function AdminWalletsPage() {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<AdminWallet[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Detail modal
  const [selectedWallet, setSelectedWallet] = useState<AdminWallet | null>(null);
  const [walletTxs, setWalletTxs] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const fetchWallets = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (searchTerm) params.set('search', searchTerm);
      const res = await fetch(`/api/admin/wallets?${params}`);
      const data = await res.json();
      if (data.wallets) {
        setWallets(data.wallets);
        setPagination(data.pagination);
        setAggregates(data.aggregates);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load wallets', variant: 'destructive' });
    }
    setLoading(false);
  }, [searchTerm, toast]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  const handleSearch = () => setSearchTerm(search);

  const viewDetails = async (wallet: AdminWallet) => {
    setSelectedWallet(wallet);
    setTxLoading(true);
    try {
      const res = await fetch(`/api/wallet/${wallet.id}?limit=20`);
      const data = await res.json();
      setWalletTxs(data.transactions || []);
    } catch {
      setWalletTxs([]);
    }
    setTxLoading(false);
  };

  if (loading && wallets.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Platform Wallets
          </h1>
          <p className="text-muted-foreground text-sm">Monitor all user wallets and transactions</p>
        </div>

        {/* Aggregate Cards */}
        {aggregates && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Total Balance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-green-600">{formatKES(aggregates.totalBalance)}</p>
                <p className="text-xs text-muted-foreground">{aggregates.walletCount} wallets</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">{formatKES(aggregates.totalAvailable)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <ArrowDownToLine className="h-3 w-3" /> Monthly Deposits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-blue-600">{formatKES(aggregates.monthlyDeposits)}</p>
                <p className="text-xs text-muted-foreground">{aggregates.monthlyDepositCount} transactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <ArrowUpFromLine className="h-3 w-3" /> Monthly Withdrawals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-orange-600">{formatKES(aggregates.monthlyWithdrawals)}</p>
                <p className="text-xs text-muted-foreground">{aggregates.monthlyWithdrawalCount} transactions</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Search by user name, email, or wallet label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="max-w-md"
          />
          <Button variant="outline" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Wallets Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Wallet</th>
                    <th className="text-right p-3 font-medium">Balance</th>
                    <th className="text-right p-3 font-medium">Available</th>
                    <th className="text-center p-3 font-medium">Txns</th>
                    <th className="text-center p-3 font-medium">Type</th>
                    <th className="text-center p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w) => (
                    <tr key={w.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <p className="font-medium">{w.user.name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{w.user.email}</p>
                        <Badge variant="outline" className="text-xs mt-0.5">{w.user.role}</Badge>
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{w.label}</p>
                        {w.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                      </td>
                      <td className="p-3 text-right font-mono">{formatKES(w.currentBalance)}</td>
                      <td className="p-3 text-right font-mono">{formatKES(w.availableBalance)}</td>
                      <td className="p-3 text-center">{w._count.transactions}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="text-xs">{w.walletType}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button size="sm" variant="ghost" onClick={() => viewDetails(w)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {wallets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No wallets found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </p>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" disabled={pagination.page <= 1} onClick={() => fetchWallets(pagination.page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchWallets(pagination.page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wallet Detail Modal */}
        <Dialog open={!!selectedWallet} onOpenChange={(o) => !o && setSelectedWallet(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Wallet Details</DialogTitle>
            </DialogHeader>
            {selectedWallet && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Owner</p>
                    <p className="font-medium">{selectedWallet.user.name || selectedWallet.user.email}</p>
                    <Badge variant="outline" className="text-xs">{selectedWallet.user.role}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Wallet</p>
                    <p className="font-medium">{selectedWallet.label}</p>
                    <p className="text-xs text-muted-foreground">IntaSend: {selectedWallet.intasendId.slice(0, 12)}...</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-lg font-bold text-green-600">{formatKES(selectedWallet.currentBalance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="text-lg font-bold">{formatKES(selectedWallet.availableBalance)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recent Transactions</h4>
                  {txLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                  ) : walletTxs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">No transactions.</p>
                  ) : (
                    <div className="space-y-2">
                      {walletTxs.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center py-2 px-2 rounded hover:bg-muted/50 text-sm">
                          <div>
                            <p className="font-medium">{txTypeLabel(tx.type)}</p>
                            <p className="text-xs text-muted-foreground">{tx.narrative || '—'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString('en-KE', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-medium">{formatKES(tx.amount)}</p>
                            <Badge variant={statusVariant(tx.status)} className="text-xs">{tx.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
