'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import { Truck, MapPin, Phone, Star, Clock, CheckCircle, Package } from 'lucide-react';

export default function DeliveryPartnerDashboard() {
  const [partner, setPartner] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', phone: '', vehicleType: '', vehiclePlate: '', location: '', coverageAreas: '' });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [partnerRes, myJobsRes, availRes] = await Promise.all([
        fetch('/api/delivery-partners?mine=true'),
        fetch('/api/delivery-jobs?view=my'),
        fetch('/api/delivery-jobs?view=available'),
      ]);
      if (partnerRes.ok) setPartner(await partnerRes.json());
      if (myJobsRes.ok) setJobs(await myJobsRes.json());
      if (availRes.ok) setAvailableJobs(await availRes.json());
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!regForm.name || !regForm.phone || !regForm.vehicleType) {
      toast.error('Name, phone, and vehicle type are required');
      return;
    }
    try {
      const res = await fetch('/api/delivery-partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regForm,
          coverageAreas: regForm.coverageAreas.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Registered as delivery partner');
      setShowRegister(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function toggleAvailability() {
    try {
      await fetch('/api/delivery-partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !partner.isAvailable }),
      });
      toast.success(partner.isAvailable ? 'Now offline' : 'Now available');
      fetchData();
    } catch { toast.error('Failed to update'); }
  }

  async function handleJobAction(jobId: string, action: string) {
    try {
      const res = await fetch('/api/delivery-jobs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Job ${action}ed`);
      fetchData();
    } catch (error: any) { toast.error(error.message); }
  }

  const statusColor = (s: string) => {
    if (s === 'DELIVERED') return 'bg-green-100 text-green-800';
    if (s === 'IN_TRANSIT' || s === 'PICKED_UP') return 'bg-blue-100 text-blue-800';
    if (s === 'FAILED' || s === 'CANCELLED') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6" /> Delivery Partner</h1>

        {!partner && !showRegister && (
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Truck className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="text-gray-500">Register as a delivery partner to accept delivery jobs</p>
              <Button onClick={() => setShowRegister(true)}>Register Now</Button>
            </CardContent>
          </Card>
        )}

        {showRegister && (
          <Card>
            <CardHeader><CardTitle>Register as Delivery Partner</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} placeholder="+254..." /></div>
                <div><Label>Vehicle Type</Label><Input value={regForm.vehicleType} onChange={(e) => setRegForm({ ...regForm, vehicleType: e.target.value })} placeholder="Motorcycle, Van, etc." /></div>
                <div><Label>Vehicle Plate</Label><Input value={regForm.vehiclePlate} onChange={(e) => setRegForm({ ...regForm, vehiclePlate: e.target.value })} /></div>
              </div>
              <div><Label>Location</Label><Input value={regForm.location} onChange={(e) => setRegForm({ ...regForm, location: e.target.value })} placeholder="Nairobi" /></div>
              <div><Label>Coverage Areas (comma-separated)</Label><Input value={regForm.coverageAreas} onChange={(e) => setRegForm({ ...regForm, coverageAreas: e.target.value })} placeholder="Nairobi, Kiambu, Thika" /></div>
              <div className="flex gap-2">
                <Button onClick={handleRegister}>Register</Button>
                <Button variant="outline" onClick={() => setShowRegister(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {partner && (
          <>
            {/* Partner Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={partner.isAvailable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {partner.isAvailable ? 'Available' : 'Offline'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={toggleAvailability}>
                      {partner.isAvailable ? 'Go Offline' : 'Go Online'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Completed Jobs</p>
                  <p className="text-2xl font-bold">{partner.completedJobs}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" /> {partner.rating?.toFixed(1) || '0.0'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500">Vehicle</p>
                  <p className="text-lg font-medium">{partner.vehicleType}</p>
                  {partner.vehiclePlate && <p className="text-sm text-gray-500">{partner.vehiclePlate}</p>}
                </CardContent>
              </Card>
            </div>

            {/* Available Jobs */}
            {availableJobs.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Available Jobs</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {availableJobs.map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between border-b last:border-0 pb-3">
                      <div>
                        <p className="font-medium">Order: {job.order?.orderNumber}</p>
                        <p className="text-sm text-gray-500">{job.pickupAddress} → {job.deliveryAddress}</p>
                        <p className="text-sm font-bold text-green-600">Fee: {formatCurrency(job.fee)}</p>
                      </div>
                      <Button size="sm" onClick={() => handleJobAction(job.id, 'accept')}>Accept</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* My Jobs */}
            <Card>
              <CardHeader><CardTitle className="text-lg">My Deliveries</CardTitle></CardHeader>
              <CardContent>
                {jobs.length === 0 ? <p className="text-gray-500 text-sm">No deliveries yet</p> : (
                  <div className="space-y-3">
                    {jobs.map((job: any) => (
                      <div key={job.id} className="flex items-center justify-between border-b last:border-0 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Order: {job.order?.orderNumber}</p>
                            <Badge className={statusColor(job.status)}>{job.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">{job.pickupAddress} → {job.deliveryAddress}</p>
                          {job.notes && <p className="text-xs text-gray-400">{job.notes}</p>}
                          <p className="text-sm font-bold text-green-600">Fee: {formatCurrency(job.fee)}</p>
                        </div>
                        <div className="flex gap-1">
                          {job.status === 'ACCEPTED' && (
                            <Button size="sm" variant="outline" onClick={() => handleJobAction(job.id, 'pickup')}>Pick Up</Button>
                          )}
                          {job.status === 'PICKED_UP' && (
                            <Button size="sm" variant="outline" onClick={() => handleJobAction(job.id, 'transit')}>In Transit</Button>
                          )}
                          {job.status === 'IN_TRANSIT' && (
                            <Button size="sm" onClick={() => handleJobAction(job.id, 'deliver')}>Delivered</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
