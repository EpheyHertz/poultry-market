
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  Calendar,
  Building,
  User
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSponsorships() {
  const [user, setUser] = useState<any>(null);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [selectedSponsorship, setSelectedSponsorship] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'ADMIN') {
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
    }
  }, [user, statusFilter]);

  const fetchSponsorships = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await fetch(`/api/sponsorships?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSponsorships(data.sponsorships);
      }
    } catch (error) {
      console.error('Failed to fetch sponsorships:', error);
    }
  };

  const handleSponsorshipAction = async (sponsorshipId: string, action: 'APPROVE' | 'REJECT') => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/sponsorships/${sponsorshipId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast.success(`Sponsorship ${action.toLowerCase()}d successfully!`);
        setSelectedSponsorship(null);
        fetchSponsorships();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to process sponsorship');
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

  const filteredSponsorships = sponsorships.filter(sponsorship => 
    sponsorship.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sponsorship.seller?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sponsorship.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sponsorship Management</h1>
          <p className="text-gray-600 mt-2">Review and manage sponsorship applications</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search sponsorships..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Sponsorships</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Sponsorships List */}
        <Card>
          <CardHeader>
            <CardTitle>Sponsorships ({filteredSponsorships.length})</CardTitle>
            <CardDescription>Review sponsorship applications and partnerships</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSponsorships.length === 0 ? (
              <div className="text-center py-8">
                <HandHeart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sponsorships found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Sponsorship applications will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSponsorships.map((sponsorship) => (
                  <div key={sponsorship.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">{sponsorship.company?.name}</span>
                          <span className="text-gray-400">→</span>
                          <User className="h-5 w-5 text-green-500" />
                          <span className="font-medium">{sponsorship.seller?.name}</span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{sponsorship.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>${sponsorship.amount.toFixed(2)}</span>
                          </div>
                          {sponsorship.duration && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{sponsorship.duration} months</span>
                            </div>
                          )}
                          <span>{new Date(sponsorship.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(sponsorship.status)}>
                          {sponsorship.status}
                        </Badge>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSponsorship(sponsorship)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Sponsorship Details</DialogTitle>
                              <DialogDescription>
                                Review sponsorship application and take action
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedSponsorship && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium mb-1">Company</h4>
                                    <p className="text-sm text-gray-600">{selectedSponsorship.company?.name}</p>
                                    <p className="text-xs text-gray-500">{selectedSponsorship.company?.email}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Seller</h4>
                                    <p className="text-sm text-gray-600">{selectedSponsorship.seller?.name}</p>
                                    <p className="text-xs text-gray-500">{selectedSponsorship.seller?.email}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-1">Description</h4>
                                  <p className="text-sm text-gray-600">{selectedSponsorship.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium mb-1">Amount</h4>
                                    <p className="text-sm text-gray-600">${selectedSponsorship.amount.toFixed(2)}</p>
                                  </div>
                                  {selectedSponsorship.duration && (
                                    <div>
                                      <h4 className="font-medium mb-1">Duration</h4>
                                      <p className="text-sm text-gray-600">{selectedSponsorship.duration} months</p>
                                    </div>
                                  )}
                                </div>

                                {selectedSponsorship.terms && (
                                  <div>
                                    <h4 className="font-medium mb-1">Terms</h4>
                                    <p className="text-sm text-gray-600">{selectedSponsorship.terms}</p>
                                  </div>
                                )}

                                {selectedSponsorship.benefits && selectedSponsorship.benefits.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-1">Benefits</h4>
                                    <ul className="text-sm text-gray-600 list-disc pl-4">
                                      {selectedSponsorship.benefits.map((benefit: string, index: number) => (
                                        <li key={index}>{benefit}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {selectedSponsorship.status === 'PENDING' && (
                                  <div className="flex space-x-2 pt-4 border-t">
                                    <Button
                                      onClick={() => handleSponsorshipAction(selectedSponsorship.id, 'APPROVE')}
                                      disabled={isLoading}
                                      className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button
                                      onClick={() => handleSponsorshipAction(selectedSponsorship.id, 'REJECT')}
                                      disabled={isLoading}
                                      variant="destructive"
                                      className="flex-1"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
