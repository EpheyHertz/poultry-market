'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import { CheckCircle, XCircle, Clock, Package, Eye } from 'lucide-react';

export default function AdminDeliveryApprovalsPage() {
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProofs();
  }, [filter]);

  async function fetchProofs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/delivery-approvals?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setProofs(data.proofs || []);
      }
    } catch {
      toast.error('Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(orderId: string, action: 'approve' | 'reject') {
    try {
      const res = await fetch('/api/admin/delivery-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action, rejectionReason: action === 'reject' ? rejectionReason : undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(action === 'approve' ? 'Approved — escrow released' : 'Rejected');
      setRejectingId(null);
      setRejectionReason('');
      fetchProofs();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Delivery Approvals</h1>

        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map((s) => (
            <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : proofs.length === 0 ? (
          <p className="text-gray-500">No {filter} proofs</p>
        ) : (
          <div className="space-y-4">
            {proofs.map((proof: any) => (
              <Card key={proof.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Proof Images */}
                    <div className="flex gap-2 flex-wrap">
                      {proof.proofImages?.map((img: string, i: number) => (
                        <div key={i} className="h-24 w-24 rounded border overflow-hidden relative">
                          <Image src={img} alt={`Proof ${i + 1}`} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                    {/* Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{proof.order?.orderNumber}</span>
                        <Badge variant="outline">{proof.order?.status}</Badge>
                        <Badge>{proof.order?.escrowStatus}</Badge>
                      </div>
                      <p className="text-sm">Store: <strong>{proof.order?.store?.storeName || 'N/A'}</strong></p>
                      <p className="text-sm">Customer: {proof.order?.customer?.name} → Seller: {proof.order?.seller?.name}</p>
                      <p className="text-sm">Total: <strong>{formatCurrency(proof.order?.total || 0)}</strong> | Escrow: {formatCurrency(proof.order?.escrowAmount || 0)}</p>
                      {proof.deliveryNote && <p className="text-sm text-gray-600">Note: {proof.deliveryNote}</p>}
                      <p className="text-xs text-gray-500">Submitted by {proof.submittedBy?.name} on {new Date(proof.submittedAt).toLocaleString()}</p>
                    </div>
                    {/* Actions */}
                    {!proof.isApproved && filter === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => handleAction(proof.orderId, 'approve')}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        {rejectingId === proof.orderId ? (
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Rejection reason..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="text-sm"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" variant="destructive" onClick={() => handleAction(proof.orderId, 'reject')}>Confirm</Button>
                              <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setRejectingId(proof.orderId)}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
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
