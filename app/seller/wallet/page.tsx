'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  RefreshCw,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Smartphone,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
} from 'lucide-react';

// ── Types ───────────────────────────────────

interface WalletInfo {
  id: string;
  intasendId: string;
  walletType: string;
  currency: string;
  label: string;
  canDisburse: boolean;
  currentBalance: number;
  availableBalance: number;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  fee: number;
  netAmount: number;
  runningBalance: number | null;
  currency: string;
  invoiceId: string | null;
  mpesaReference: string | null;
  trackingId: string | null;
  externalReference: string | null;
  narrative: string | null;
  failedReason: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Helpers ──────────────────────────────────

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
    WITHDRAWAL_MPESA: 'M-Pesa Withdrawal',
    WITHDRAWAL_B2B: 'B2B Payment',
    WITHDRAWAL_BANK: 'Bank Transfer',
    INTERNAL_IN: 'Transfer In',
    INTERNAL_OUT: 'Transfer Out',
    COMMISSION: 'Commission',
    REFUND: 'Refund',
    SALE_CREDIT: 'Sale Credit',
  };
  return map[type] || type;
}

function txTypeIcon(type: string) {
  switch (type) {
    case 'DEPOSIT': case 'SALE_CREDIT': case 'INTERNAL_IN': case 'REFUND':
      return <ArrowDownToLine className="h-4 w-4 text-green-600" />;
    case 'WITHDRAWAL_MPESA': case 'WITHDRAWAL_B2B': case 'WITHDRAWAL_BANK':
    case 'INTERNAL_OUT': case 'COMMISSION':
      return <ArrowUpFromLine className="h-4 w-4 text-red-600" />;
    default:
      return <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />;
  }
}

function isIncoming(type: string) {
  return ['DEPOSIT', 'SALE_CREDIT', 'INTERNAL_IN', 'REFUND'].includes(type);
}

// ── Component ───────────────────────────────

export default function SellerWalletPage() {
  const router = useRouter();
  const { toast } = useToast();

  // ── State
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [activeWallet, setActiveWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Create form
  const [newLabel, setNewLabel] = useState('');

  // Deposit form
  const [depositMethod, setDepositMethod] = useState<'mpesa' | 'checkout'>('mpesa');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState('');

  // Withdraw form
  const [withdrawMethod, setWithdrawMethod] = useState<'mpesa' | 'b2b' | 'bank'>('mpesa');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawName, setWithdrawName] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawBankCode, setWithdrawBankCode] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawAccountType, setWithdrawAccountType] = useState<'PayBill' | 'TillNumber'>('PayBill');

  // Transfer form
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Transaction filter
  const [txFilter, setTxFilter] = useState<string>('all');

  // ── Fetch Wallets
  const fetchWallets = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      if (data.wallets) {
        setWallets(data.wallets);
        if (!activeWallet && data.wallets.length > 0) {
          setActiveWallet(data.wallets[0]);
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load wallets', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, activeWallet]);

  // ── Fetch Transactions
  const fetchTransactions = useCallback(async (walletId: string, page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (txFilter !== 'all') params.set('type', txFilter);

      const res = await fetch(`/api/wallet/${walletId}/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      console.error('Failed to fetch transactions');
    }
  }, [txFilter]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  useEffect(() => {
    if (activeWallet) fetchTransactions(activeWallet.id);
  }, [activeWallet, fetchTransactions]);

  // ── Refresh balance
  const refreshBalance = async () => {
    if (!activeWallet) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/wallet/${activeWallet.id}`);
      const data = await res.json();
      if (data.wallet) {
        setActiveWallet(data.wallet);
        setWallets((prev) => prev.map((w) => (w.id === data.wallet.id ? data.wallet : w)));
      }
    } catch { /* already handles */ }
    setRefreshing(false);
  };

  // ── Create wallet
  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Wallet created', description: data.wallet.label });
      setShowCreate(false);
      setNewLabel('');
      fetchWallets();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  // ── Deposit
  const handleDeposit = async () => {
    if (!activeWallet) return;
    setProcessing(true);
    try {
      const body: any = {
        walletId: activeWallet.id,
        amount: parseFloat(depositAmount),
        method: depositMethod,
      };
      if (depositMethod === 'mpesa') {
        body.phoneNumber = depositPhone;
      } else {
        body.email = '';
        body.redirectUrl = window.location.href;
      }

      const res = await fetch('/api/wallet/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (depositMethod === 'checkout' && data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
      }

      toast({ title: 'Success', description: data.message });
      setShowDeposit(false);
      setDepositAmount('');
      setDepositPhone('');
      // Refresh after brief delay
      setTimeout(() => {
        refreshBalance();
        fetchTransactions(activeWallet.id);
      }, 3000);
    } catch (e: any) {
      toast({ title: 'Deposit failed', description: e.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  // ── Withdraw
  const handleWithdraw = async () => {
    if (!activeWallet) return;
    setProcessing(true);
    try {
      const body: any = {
        walletId: activeWallet.id,
        amount: parseFloat(withdrawAmount),
        method: withdrawMethod,
      };

      if (withdrawMethod === 'mpesa') {
        body.recipientName = withdrawName;
        body.mpesaNumber = withdrawPhone;
      } else if (withdrawMethod === 'b2b') {
        body.businessName = withdrawName;
        body.accountType = withdrawAccountType;
        body.account = withdrawAccount;
      } else {
        body.accountName = withdrawName;
        body.bankAccount = withdrawAccount;
        body.bankCode = withdrawBankCode;
      }

      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: 'Success', description: data.message });
      setShowWithdraw(false);
      resetWithdrawForm();
      setTimeout(() => {
        refreshBalance();
        fetchTransactions(activeWallet.id);
      }, 3000);
    } catch (e: any) {
      toast({ title: 'Withdrawal failed', description: e.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  // ── Transfer
  const handleTransfer = async () => {
    if (!activeWallet) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromWalletId: activeWallet.id,
          toWalletId: transferTargetId,
          amount: parseFloat(transferAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: 'Transfer complete' });
      setShowTransfer(false);
      setTransferTargetId('');
      setTransferAmount('');
      refreshBalance();
      fetchTransactions(activeWallet.id);
    } catch (e: any) {
      toast({ title: 'Transfer failed', description: e.message, variant: 'destructive' });
    }
    setProcessing(false);
  };

  const resetWithdrawForm = () => {
    setWithdrawAmount('');
    setWithdrawName('');
    setWithdrawPhone('');
    setWithdrawAccount('');
    setWithdrawBankCode('');
  };

  // ── Calculate totals
  const totalBalance = wallets.reduce((s, w) => s + w.currentBalance, 0);
  const totalAvailable = wallets.reduce((s, w) => s + w.availableBalance, 0);

  if (loading) {
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
        {/* ── Header ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6" /> Wallet
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage your funds, deposits, and withdrawals
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refreshBalance} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Wallet
            </Button>
          </div>
        </div>

        {/* ── Summary Cards ──────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatKES(totalBalance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Available Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatKES(totalAvailable)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Wallets</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{wallets.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Wallet selector ────────────────────── */}
        {wallets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Wallets Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first wallet to start receiving payments.</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create Wallet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wallet List */}
            <div className="space-y-3">
              {wallets.map((w) => (
                <Card
                  key={w.id}
                  className={`cursor-pointer transition-colors hover:border-primary ${
                    activeWallet?.id === w.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setActiveWallet(w)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{w.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.walletType} {w.isPrimary && '· Primary'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatKES(w.currentBalance)}</p>
                        <p className="text-xs text-muted-foreground">
                          Avail: {formatKES(w.availableBalance)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Active Wallet Detail */}
            {activeWallet && (
              <div className="lg:col-span-2 space-y-4">
                {/* Wallet info + actions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{activeWallet.label}</CardTitle>
                        <CardDescription>{activeWallet.walletType} Wallet · {activeWallet.currency}</CardDescription>
                      </div>
                      {activeWallet.isPrimary && <Badge>Primary</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatKES(activeWallet.currentBalance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
                        <p className="text-xl font-bold">{formatKES(activeWallet.availableBalance)}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setShowDeposit(true)}>
                        <ArrowDownToLine className="h-4 w-4 mr-1" /> Deposit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowWithdraw(true)} disabled={!activeWallet.canDisburse}>
                        <ArrowUpFromLine className="h-4 w-4 mr-1" /> Withdraw
                      </Button>
                      {wallets.length > 1 && (
                        <Button size="sm" variant="outline" onClick={() => setShowTransfer(true)}>
                          <ArrowLeftRight className="h-4 w-4 mr-1" /> Transfer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Transactions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Transactions</CardTitle>
                      <Select value={txFilter} onValueChange={setTxFilter}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="DEPOSIT">Deposits</SelectItem>
                          <SelectItem value="WITHDRAWAL_MPESA">M-Pesa Out</SelectItem>
                          <SelectItem value="WITHDRAWAL_BANK">Bank Out</SelectItem>
                          <SelectItem value="SALE_CREDIT">Sale Credits</SelectItem>
                          <SelectItem value="COMMISSION">Commission</SelectItem>
                          <SelectItem value="REFUND">Refunds</SelectItem>
                          <SelectItem value="INTERNAL_IN">Transfer In</SelectItem>
                          <SelectItem value="INTERNAL_OUT">Transfer Out</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No transactions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {txTypeIcon(tx.type)}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{txTypeLabel(tx.type)}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {tx.narrative || tx.externalReference || '—'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(tx.createdAt).toLocaleDateString('en-KE', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className={`text-sm font-semibold ${isIncoming(tx.type) ? 'text-green-600' : 'text-red-600'}`}>
                                {isIncoming(tx.type) ? '+' : '-'}{formatKES(tx.amount)}
                              </p>
                              <Badge variant={statusVariant(tx.status)} className="text-xs">
                                {tx.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                          Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                        </p>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={pagination.page <= 1}
                            onClick={() => fetchTransactions(activeWallet.id, pagination.page - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => fetchTransactions(activeWallet.id, pagination.page + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ══════════ DIALOGS ══════════ */}

        {/* Create Wallet Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Wallet</DialogTitle>
              <DialogDescription>Create a new IntaSend wallet.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Wallet Label</Label>
                <Input
                  placeholder="e.g. Sales Wallet"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={processing || !newLabel.trim()}>
                {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deposit Dialog */}
        <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deposit Funds</DialogTitle>
              <DialogDescription>Add money to {activeWallet?.label}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Method</Label>
                <Select value={depositMethod} onValueChange={(v: any) => setDepositMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">
                      <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> M-Pesa STK Push</span>
                    </SelectItem>
                    <SelectItem value="checkout">
                      <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Card / Checkout</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (KES)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>
              {depositMethod === 'mpesa' && (
                <div>
                  <Label>M-Pesa Phone Number</Label>
                  <Input
                    placeholder="e.g. 0712345678"
                    value={depositPhone}
                    onChange={(e) => setDepositPhone(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeposit(false)}>Cancel</Button>
              <Button
                onClick={handleDeposit}
                disabled={processing || !depositAmount || (depositMethod === 'mpesa' && !depositPhone)}
              >
                {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {depositMethod === 'mpesa' ? 'Send STK Push' : 'Open Checkout'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription>
                Available: {formatKES(activeWallet?.availableBalance || 0)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Method</Label>
                <Select value={withdrawMethod} onValueChange={(v: any) => setWithdrawMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">
                      <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> M-Pesa</span>
                    </SelectItem>
                    <SelectItem value="b2b">
                      <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> PayBill / Till</span>
                    </SelectItem>
                    <SelectItem value="bank">
                      <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Bank (PesaLink)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (KES)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>{withdrawMethod === 'mpesa' ? 'Recipient Name' : withdrawMethod === 'b2b' ? 'Business Name' : 'Account Name'}</Label>
                <Input
                  value={withdrawName}
                  onChange={(e) => setWithdrawName(e.target.value)}
                />
              </div>
              {withdrawMethod === 'mpesa' && (
                <div>
                  <Label>M-Pesa Number</Label>
                  <Input
                    placeholder="0712345678"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                  />
                </div>
              )}
              {withdrawMethod === 'b2b' && (
                <>
                  <div>
                    <Label>Account Type</Label>
                    <Select value={withdrawAccountType} onValueChange={(v: any) => setWithdrawAccountType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PayBill">PayBill</SelectItem>
                        <SelectItem value="TillNumber">Till Number</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Account / Till Number</Label>
                    <Input
                      value={withdrawAccount}
                      onChange={(e) => setWithdrawAccount(e.target.value)}
                    />
                  </div>
                </>
              )}
              {withdrawMethod === 'bank' && (
                <>
                  <div>
                    <Label>Bank Account Number</Label>
                    <Input
                      value={withdrawAccount}
                      onChange={(e) => setWithdrawAccount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Bank Code</Label>
                    <Input
                      placeholder="e.g. 63"
                      value={withdrawBankCode}
                      onChange={(e) => setWithdrawBankCode(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">KCB: 01, Equity: 68, Co-op: 11, NCBA: 07</p>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWithdraw(false)}>Cancel</Button>
              <Button onClick={handleWithdraw} disabled={processing || !withdrawAmount || !withdrawName}>
                {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Withdraw
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Dialog */}
        <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Between Wallets</DialogTitle>
              <DialogDescription>
                From: {activeWallet?.label} (Avail: {formatKES(activeWallet?.availableBalance || 0)})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>To Wallet</Label>
                <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets
                      .filter((w) => w.id !== activeWallet?.id)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.label} ({formatKES(w.currentBalance)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (KES)</Label>
                <Input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransfer(false)}>Cancel</Button>
              <Button onClick={handleTransfer} disabled={processing || !transferTargetId || !transferAmount}>
                {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
