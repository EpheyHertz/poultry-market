'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { Shield, CheckCircle, Clock, XCircle, Upload, Award } from 'lucide-react';

const LEVELS = [
  { value: 'IDENTITY_VERIFIED', label: 'Identity Verified', desc: 'Submit government ID for identity verification' },
  { value: 'FARM_VERIFIED', label: 'Farm Verified', desc: 'Submit farm photos and location proof' },
  { value: 'CERTIFIED_SUPPLIER', label: 'Certified Supplier', desc: 'Submit business registration and certifications' },
];

export default function StoreVerificationPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    requestedLevel: '',
    identityDocuments: [] as string[],
    farmPhotos: [] as string[],
    businessDocuments: [] as string[],
    additionalNotes: '',
  });

  useEffect(() => {
    fetch('/api/store/verification')
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!form.requestedLevel) { toast.error('Select a verification level'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/store/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Verification request submitted');
      setShowForm(false);
      // Refresh data
      const newData = await fetch('/api/store/verification').then((r) => r.json());
      setData(newData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  const statusBadge = (s: string) => {
    if (s === 'APPROVED') return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
    if (s === 'REJECTED') return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Store Verification</h1>
          <Button onClick={() => setShowForm(!showForm)} disabled={loading}>
            {showForm ? 'Cancel' : 'Request Verification'}
          </Button>
        </div>

        {/* Current Level */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Current Verification Level</p>
                <p className="text-lg font-bold">{data?.currentLevel?.replace(/_/g, ' ') || 'NONE'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Form */}
        {showForm && (
          <Card>
            <CardHeader><CardTitle>Submit Verification Request</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Verification Level</Label>
                <Select value={form.requestedLevel} onValueChange={(v) => setForm({ ...form, requestedLevel: v })}>
                  <SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label} — {l.desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Identity Documents (URLs, comma-separated)</Label>
                <Input
                  value={form.identityDocuments.join(', ')}
                  onChange={(e) => setForm({ ...form, identityDocuments: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Upload document URLs"
                />
              </div>
              <div>
                <Label>Farm Photos (URLs, comma-separated)</Label>
                <Input
                  value={form.farmPhotos.join(', ')}
                  onChange={(e) => setForm({ ...form, farmPhotos: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Upload farm photo URLs"
                />
              </div>
              <div>
                <Label>Business Documents (URLs, comma-separated)</Label>
                <Input
                  value={form.businessDocuments.join(', ')}
                  onChange={(e) => setForm({ ...form, businessDocuments: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Upload document URLs"
                />
              </div>
              <div>
                <Label>Additional Notes</Label>
                <Textarea value={form.additionalNotes} onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })} />
              </div>
              <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
            </CardContent>
          </Card>
        )}

        {/* History */}
        <Card>
          <CardHeader><CardTitle>Verification History</CardTitle></CardHeader>
          <CardContent>
            {data?.requests?.length ? (
              <div className="space-y-4">
                {data.requests.map((req: any) => (
                  <div key={req.id} className="flex items-start justify-between border-b last:border-0 pb-4">
                    <div>
                      <p className="font-medium">{req.requestedLevel.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                      {req.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">Reason: {req.rejectionReason}</p>
                      )}
                    </div>
                    {statusBadge(req.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No verification requests yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
