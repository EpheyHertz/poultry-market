'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import { Wallet, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [transactionRef, setTransactionRef] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => { fetchWithdrawals(); }, [filter]);

  async function fetchWithdrawals() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/withdrawals?status=${filter}`);
      if (res.ok) setWithdrawals((await res.json()).withdrawals || []);
    } catch { toast.error('Failed to fetch'); }
    finally { setLoading(false); }
  }

  async function handleAction(withdrawalId: string, action: 'approve' | 'reject') {
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId, action,
          transactionRef: action === 'approve' ? transactionRef : undefined,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(action === 'approve' ? 'Withdrawal approved' : 'Withdrawal rejected');
      setActionId(null);
      setTransactionRef('');
      setRejectionReason('');
      fetchWithdrawals();
    } catch (error: any) { toast.error(error.message); }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6" /> Withdrawal Requests</h1>

        <div className="flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'all'].map((s) => (
            <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>

        {loading ? <p className="text-gray-500">Loading...</p> : withdrawals.length === 0 ? <p className="text-gray-500">No withdrawals</p> : (
          <div className="space-y-4">
            {withdrawals.map((w: any) => (
              <Card key={w.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{formatCurrency(w.amount)}</span>
                        <Badge variant="outline">{w.method}</Badge>
                        <Badge variant={w.status === 'APPROVED' ? 'default' : w.status === 'REJECTED' ? 'destructive' : 'secondary'}>{w.status}</Badge>
                      </div>
                      <p className="text-sm">Store: <strong>{w.store?.storeName}</strong> ({w.store?.owner?.name})</p>
                      <p className="text-sm text-gray-500">
                        {w.accountName && `Account: ${w.accountName} | `}
                        {w.mpesaNumber && `M-Pesa: ${w.mpesaNumber} | `}
                        {w.bankName && `Bank: ${w.bankName} (${w.bankAccount}) | `}
                        {w.paypalEmail && `PayPal: ${w.paypalEmail} | `}
                        {new Date(w.createdAt).toLocaleString()}
                      </p>
                      {w.rejectionReason && <p className="text-sm text-red-600">Reason: {w.rejectionReason}</p>}
                      {w.transactionRef && <p className="text-sm text-green-600">Ref: {w.transactionRef}</p>}
                    </div>
                    {w.status === 'PENDING' && (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        {actionId === w.id ? (
                          <div className="space-y-2">
                            <Input placeholder="Transaction ref (optional)" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} />
                            <Button size="sm" onClick={() => handleAction(w.id, 'approve')}><CheckCircle className="h-4 w-4 mr-1" /> Confirm Approve</Button>
                            <Textarea placeholder="Rejection reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                            <Button size="sm" variant="destructive" onClick={() => handleAction(w.id, 'reject')}><XCircle className="h-4 w-4 mr-1" /> Confirm Reject</Button>
                            <Button size="sm" variant="outline" onClick={() => setActionId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => setActionId(w.id)}>Review</Button>
                        )}
                      </div>
                    )}
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
