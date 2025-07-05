
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
  DollarSign,
  Calendar,
  User
} from 'lucide-react';
import { toast } from 'sonner';

export default function CompanySponsorships() {
  const [user, setUser] = useState<any>(null);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    sellerId: '',
    amount: '',
    description: '',
    terms: '',
    duration: '',
    benefits: ''
  });
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'COMPANY') {
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
      fetchSellers();
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

  const fetchSellers = async () => {
    try {
      const response = await fetch('/api/users?role=SELLER');
      if (response.ok) {
        const data = await response.json();
        setSellers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch sellers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const benefitsArray = formData.benefits 
        ? formData.benefits.split('\n').filter(b => b.trim())
        : [];

      const response = await fetch('/api/sponsorships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          benefits: benefitsArray,
          amount: parseFloat(formData.amount),
          duration: formData.duration ? parseInt(formData.duration) : null
        }),
      });

      if (response.ok) {
        toast.success('Sponsorship proposal created successfully!');
        setShowForm(false);
        setFormData({
          sellerId: '',
          amount: '',
          description: '',
          terms: '',
          duration: '',
          benefits: ''
        });
        fetchSponsorships();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create sponsorship');
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
            <p className="text-gray-600 mt-2">Manage your sponsorship proposals and partnerships</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Sponsorship
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Sponsorship Proposal</DialogTitle>
                <DialogDescription>
                  Propose a sponsorship partnership with a seller
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sellerId">Select Seller</Label>
                  <select
                    id="sellerId"
                    value={formData.sellerId}
                    onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Choose a seller...</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name} ({seller.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Sponsorship Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (months)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the sponsorship proposal..."
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    placeholder="Specify terms and conditions..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="benefits">Benefits (one per line)</Label>
                  <Textarea
                    id="benefits"
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    placeholder="Product promotion&#10;Brand visibility&#10;Marketing support"
                    rows={4}
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Creating...' : 'Create Sponsorship'}
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
        <div className="space-y-6">
          {sponsorships.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <HandHeart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sponsorships yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create sponsorship proposals to support sellers.
                </p>
              </CardContent>
            </Card>
          ) : (
            sponsorships.map((sponsorship) => (
              <Card key={sponsorship.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <User className="h-5 w-5" />
                        <span>{sponsorship.seller?.name}</span>
                      </CardTitle>
                      <CardDescription>
                        Created on {new Date(sponsorship.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(sponsorship.status)}>
                      {sponsorship.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-700">{sponsorship.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="font-medium">${sponsorship.amount.toFixed(2)}</span>
                      </div>
                      {sponsorship.duration && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span>{sponsorship.duration} months</span>
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        {sponsorship.seller?.email}
                      </div>
                    </div>

                    {sponsorship.benefits && sponsorship.benefits.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Benefits Offered:</h4>
                        <ul className="text-sm text-gray-600 list-disc pl-4">
                          {sponsorship.benefits.map((benefit: string, index: number) => (
                            <li key={index}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {sponsorship.terms && (
                      <div>
                        <h4 className="font-medium mb-1">Terms:</h4>
                        <p className="text-sm text-gray-600">{sponsorship.terms}</p>
                      </div>
                    )}

                    {sponsorship.status === 'APPROVED' && sponsorship.startDate && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          <CheckCircle className="inline h-4 w-4 mr-1" />
                          Active since {new Date(sponsorship.startDate).toLocaleDateString()}
                          {sponsorship.endDate && ` until ${new Date(sponsorship.endDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    )}

                    {sponsorship.status === 'REJECTED' && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-800">
                          <XCircle className="inline h-4 w-4 mr-1" />
                          This sponsorship proposal was declined
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
