'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import { Wallet, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, XCircle, Ban } from 'lucide-react';

export default function StoreWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    method: 'MPESA',
    accountName: '',
    mpesaNumber: '',
    mpesaTillNumber: '',
    bankName: '',
    bankAccount: '',
    bankCode: '',
    paypalEmail: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [walletRes, withdrawalsRes] = await Promise.all([
        fetch('/api/store/wallet'),
        fetch('/api/store/withdrawals'),
      ]);
      if (walletRes.ok) {
        const data = await walletRes.json();
        setWallet(data.wallet);
        setTransactions(data.transactions || []);
      }
      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data.withdrawals || []);
      }
    } catch {
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdraw() {
    const amt = parseFloat(withdrawForm.amount);
    if (!amt || amt <= 0) { toast.error('Enter valid amount'); return; }
    if (amt > (wallet?.availableBalance || 0)) { toast.error('Insufficient balance'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/store/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...withdrawForm, amount: amt }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Withdrawal request submitted');
      setShowWithdrawForm(false);
      setWithdrawForm({ amount: '', method: 'MPESA', accountName: '', mpesaNumber: '', mpesaTillNumber: '', bankName: '', bankAccount: '', bankCode: '', paypalEmail: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit withdrawal');
    } finally {
      setSubmitting(false);
    }
  }

  const statusIcon = (s: string) => {
    if (s === 'COMPLETED' || s === 'APPROVED') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === 'REJECTED') return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" /> Store Wallet</h1>
          <Button onClick={() => setShowWithdrawForm(!showWithdrawForm)}>
            <ArrowUpRight className="h-4 w-4 mr-1" /> Withdraw
          </Button>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Available</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(wallet?.availableBalance || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">In Escrow</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(wallet?.escrowBalance || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Pending Withdrawal</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(wallet?.pendingBalance || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Total Earned</p>
              <p className="text-2xl font-bold">{formatCurrency(wallet?.totalEarned || 0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Withdrawal Form */}
        {showWithdrawForm && (
          <Card>
            <CardHeader><CardTitle>Request Withdrawal</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Amount (KES)</Label>
                  <Input type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <Label>Method</Label>
                  <Select value={withdrawForm.method} onValueChange={(v) => setWithdrawForm({ ...withdrawForm, method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MPESA">M-Pesa</SelectItem>
                      <SelectItem value="MPESA_TILL">M-Pesa Till</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="PAYPAL">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Account Name</Label>
                <Input value={withdrawForm.accountName} onChange={(e) => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })} />
              </div>
              {withdrawForm.method === 'MPESA' && (
                <div><Label>M-Pesa Number</Label><Input value={withdrawForm.mpesaNumber} onChange={(e) => setWithdrawForm({ ...withdrawForm, mpesaNumber: e.target.value })} placeholder="+254..." /></div>
              )}
              {withdrawForm.method === 'MPESA_TILL' && (
                <div><Label>Till Number</Label><Input value={withdrawForm.mpesaTillNumber} onChange={(e) => setWithdrawForm({ ...withdrawForm, mpesaTillNumber: e.target.value })} /></div>
              )}
              {withdrawForm.method === 'BANK_TRANSFER' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Bank Name</Label><Input value={withdrawForm.bankName} onChange={(e) => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })} /></div>
                  <div><Label>Account Number</Label><Input value={withdrawForm.bankAccount} onChange={(e) => setWithdrawForm({ ...withdrawForm, bankAccount: e.target.value })} /></div>
                  <div><Label>Bank Code</Label><Input value={withdrawForm.bankCode} onChange={(e) => setWithdrawForm({ ...withdrawForm, bankCode: e.target.value })} /></div>
                </div>
              )}
              {withdrawForm.method === 'PAYPAL' && (
                <div><Label>PayPal Email</Label><Input type="email" value={withdrawForm.paypalEmail} onChange={(e) => setWithdrawForm({ ...withdrawForm, paypalEmail: e.target.value })} /></div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleWithdraw} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
                <Button variant="outline" onClick={() => setShowWithdrawForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal History */}
        <Card>
          <CardHeader><CardTitle>Withdrawal History</CardTitle></CardHeader>
          <CardContent>
            {withdrawals.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w: any) => (
                      <tr key={w.id} className="border-b last:border-0">
                        <td className="py-2">{new Date(w.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 font-medium">{formatCurrency(w.amount)}</td>
                        <td className="py-2">{w.method}</td>
                        <td className="py-2 flex items-center gap-1">{statusIcon(w.status)} {w.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No withdrawals yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader><CardTitle>Wallet Transactions</CardTitle></CardHeader>
          <CardContent>
            {transactions.length ? (
              <div className="space-y-3">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{tx.narrative || tx.type}</p>
                      <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.type.includes('RELEASE') || tx.type.includes('CREDIT') ? 'text-green-600' : 'text-gray-900'}`}>
                        {tx.type.includes('WITHDRAWAL') ? '-' : '+'}{formatCurrency(tx.netAmount || tx.amount)}
                      </p>
                      {tx.fee > 0 && <p className="text-xs text-gray-500">Fee: {formatCurrency(tx.fee)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No transactions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
