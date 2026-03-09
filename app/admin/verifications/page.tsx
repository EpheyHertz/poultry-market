'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { Shield, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [filter]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verifications?status=${filter}`);
      if (res.ok) setVerifications((await res.json()).verifications || []);
    } catch { toast.error('Failed to fetch'); }
    finally { setLoading(false); }
  }

  async function handleAction(verificationId: string, action: 'approve' | 'reject') {
    try {
      const res = await fetch('/api/admin/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId, action, rejectionReason: action === 'reject' ? rejectionReason : undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(action === 'approve' ? 'Verification approved' : 'Verification rejected');
      setRejectingId(null);
      setRejectionReason('');
      fetchData();
    } catch (error: any) { toast.error(error.message); }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Store Verifications</h1>

        <div className="flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'all'].map((s) => (
            <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>

        {loading ? <p className="text-gray-500">Loading...</p> : verifications.length === 0 ? <p className="text-gray-500">No requests</p> : (
          <div className="space-y-4">
            {verifications.map((v: any) => (
              <Card key={v.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{v.store?.storeName}</p>
                      <p className="text-sm text-gray-500">Owner: {v.store?.owner?.name} ({v.store?.owner?.email})</p>
                      <p className="text-sm">Requested: <strong>{v.requestedLevel.replace(/_/g, ' ')}</strong></p>
                      <p className="text-sm text-gray-500">Current: {v.store?.verificationLevel?.replace(/_/g, ' ') || 'NONE'}</p>
                    </div>
                    <Badge variant={v.status === 'APPROVED' ? 'default' : v.status === 'REJECTED' ? 'destructive' : 'secondary'}>{v.status}</Badge>
                  </div>

                  {/* Documents */}
                  <div className="space-y-2">
                    {v.identityDocuments?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Identity Documents:</p>
                        <div className="flex gap-2">{v.identityDocuments.map((d: string, i: number) => (
                          <a key={i} href={d} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs underline">Doc {i + 1}</a>
                        ))}</div>
                      </div>
                    )}
                    {v.farmPhotos?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Farm Photos:</p>
                        <div className="flex gap-2 flex-wrap">{v.farmPhotos.map((p: string, i: number) => (
                          <div key={i} className="h-16 w-16 rounded border overflow-hidden relative">
                            <Image src={p} alt={`Farm ${i + 1}`} fill className="object-cover" />
                          </div>
                        ))}</div>
                      </div>
                    )}
                    {v.additionalNotes && <p className="text-sm">Notes: {v.additionalNotes}</p>}
                  </div>

                  {v.status === 'PENDING' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => handleAction(v.id, 'approve')}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      {rejectingId === v.id ? (
                        <div className="flex-1 flex gap-2">
                          <Textarea placeholder="Reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="text-sm flex-1" />
                          <Button size="sm" variant="destructive" onClick={() => handleAction(v.id, 'reject')}>Confirm</Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(v.id)}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      )}
                    </div>
                  )}
                  {v.rejectionReason && <p className="text-sm text-red-600">Rejection: {v.rejectionReason}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
