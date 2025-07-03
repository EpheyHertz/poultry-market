'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  HandHeart, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

export default function SellerSponsorships() {
  const [user, setUser] = useState<any>(null);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyId: '',
    amount: '',
    description: '',
    terms: '',
    duration: '',
    benefits: []
  });
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'SELLER') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchSponsorships();
      fetchCompanies();
    }
  }, [user]);

  const fetchSponsorships = async () => {
    try {
      const response = await fetch('/api/sponsorships');
      if (response.ok) {
        const data = await response.json();
        setSponsorships(data.sponsorships);
      }
    } catch (error) {
      console.error('Failed to fetch sponsorships:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/users?role=COMPANY');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/sponsorships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Sponsorship application submitted successfully!');
        setShowForm(false);
        setFormData({
          companyId: '',
          amount: '',
          description: '',
          terms: '',
          duration: '',
          benefits: []
        });
        fetchSponsorships();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit sponsorship application');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'ACTIVE': return 'bg-blue-100 text-blue-800';
      case 'EXPIRED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return Clock;
      case 'APPROVED': return CheckCircle;
      case 'REJECTED': return XCircle;
      case 'ACTIVE': return CheckCircle;
      case 'EXPIRED': return XCircle;
      default: return Clock;
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sponsorships</h1>
            <p className="text-gray-600 mt-2">Apply for sponsorships from companies</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Apply for Sponsorship
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Apply for Sponsorship</DialogTitle>
                <DialogDescription>
                  Submit a sponsorship application to a company
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company</Label>
                  <select
                    id="companyId"
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Requested Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what you need sponsorship for..."
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Proposed Terms</Label>
                  <Textarea
                    id="terms"
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    placeholder="What can you offer in return?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (months)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="12"
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sponsorships List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Sponsorship Applications</CardTitle>
            <CardDescription>Track your sponsorship applications and active sponsorships</CardDescription>
          </CardHeader>
          <CardContent>
            {sponsorships.length === 0 ? (
              <div className="text-center py-8">
                <HandHeart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sponsorships yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Apply for your first sponsorship to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sponsorships.map((sponsorship) => {
                  const StatusIcon = getStatusIcon(sponsorship.status);
                  return (
                    <div key={sponsorship.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <StatusIcon className="h-8 w-8 text-gray-400" />
                          <div>
                            <h3 className="text-lg font-medium">
                              {sponsorship.company.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ${sponsorship.amount.toFixed(2)} • {sponsorship.duration ? `${sponsorship.duration} months` : 'No duration specified'}
                            </p>
                            <p className="text-xs text-gray-400">
                              Applied {new Date(sponsorship.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(sponsorship.status)}>
                            {sponsorship.status}
                          </Badge>
                          {sponsorship.status === 'ACTIVE' && (
                            <Badge variant="outline">
                              <DollarSign className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-600">{sponsorship.description}</p>
                      </div>
                      
                      {sponsorship.terms && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Terms:</p>
                          <p className="text-sm text-gray-600">{sponsorship.terms}</p>
                        </div>
                      )}
                      
                      {sponsorship.benefits && sponsorship.benefits.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Benefits:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {sponsorship.benefits.map((benefit: string, index: number) => (
                              <li key={index}>{benefit}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {sponsorship.status === 'ACTIVE' && sponsorship.endDate && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            Expires: {new Date(sponsorship.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}