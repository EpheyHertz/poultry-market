'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Phone,
  MapPin,
  Car,
  CreditCard,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDeliveryAgents() {
  const [user, setUser] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    agentId: '',
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
    coverageArea: '',
    avatar: ''
  });
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
      fetchAgents();
    }
  }, [user, statusFilter]);

  const fetchAgents = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('approved', statusFilter);
      
      const response = await fetch(`/api/delivery-agents?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Failed to fetch delivery agents:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/delivery-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Delivery agent added successfully!');
        setShowForm(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          agentId: '',
          vehicleType: '',
          vehicleNumber: '',
          licenseNumber: '',
          coverageArea: '',
          avatar: ''
        });
        fetchAgents();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add delivery agent');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (agentId: string, approved: boolean) => {
    try {
      const response = await fetch(`/api/delivery-agents/${agentId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved }),
      });

      if (response.ok) {
        toast.success(`Agent ${approved ? 'approved' : 'suspended'} successfully!`);
        fetchAgents();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update agent status');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    }
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.agentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Delivery Agents</h1>
            <p className="text-gray-600 mt-2">Manage delivery personnel and their assignments</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Delivery Agent</DialogTitle>
                <DialogDescription>
                  Create a new delivery agent account
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agentId">Agent ID</Label>
                    <Input
                      id="agentId"
                      value={formData.agentId}
                      onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                      placeholder="AG001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Vehicle Type</Label>
                    <Input
                      id="vehicleType"
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                      placeholder="Motorcycle, Van, Truck"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                    <Input
                      id="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                      placeholder="ABC-123"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="coverageArea">Coverage Area</Label>
                    <Input
                      id="coverageArea"
                      value={formData.coverageArea}
                      onChange={(e) => setFormData({ ...formData, coverageArea: e.target.value })}
                      placeholder="City, Region"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar">Profile Picture URL</Label>
                  <Input
                    id="avatar"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Adding...' : 'Add Agent'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                  placeholder="Search agents..."
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
                <option value="">All Agents</option>
                <option value="true">Approved</option>
                <option value="false">Pending Approval</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Agents List */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Agents ({filteredAgents.length})</CardTitle>
            <CardDescription>Manage delivery personnel and their status</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAgents.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No agents found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add delivery agents to manage deliveries.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAgents.map((agent) => (
                  <div key={agent.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={agent.avatar} alt={agent.name} />
                          <AvatarFallback>
                            {agent.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-medium">{agent.name}</h3>
                          <p className="text-sm text-gray-500">{agent.email}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            {agent.agentId && (
                              <div className="flex items-center space-x-1">
                                <CreditCard className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{agent.agentId}</span>
                              </div>
                            )}
                            {agent.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{agent.phone}</span>
                              </div>
                            )}
                            {agent.coverageArea && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{agent.coverageArea}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <Badge className={agent.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {agent.isApproved ? 'Approved' : 'Pending'}
                          </Badge>
                          <Badge className={agent.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                            {agent.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>

                        <div className="flex space-x-2">
                          {!agent.isApproved ? (
                            <Button
                              size="sm"
                              onClick={() => handleApproval(agent.id, true)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApproval(agent.id, false)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Suspend
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Vehicle Info */}
                    {(agent.vehicleType || agent.vehicleNumber) && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Car className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">Vehicle Information</p>
                            <p className="text-sm text-gray-600">
                              {agent.vehicleType} {agent.vehicleNumber && `- ${agent.vehicleNumber}`}
                            </p>
                            {agent.licenseNumber && (
                              <p className="text-xs text-gray-500">License: {agent.licenseNumber}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recent Deliveries */}
                    {agent.deliveries && agent.deliveries.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">Recent Deliveries</p>
                        <div className="space-y-1">
                          {agent.deliveries.slice(0, 3).map((delivery: any) => (
                            <div key={delivery.id} className="flex justify-between text-xs text-gray-600">
                              <span>Delivery #{delivery.id.slice(-8)}</span>
                              <span className="capitalize">{delivery.status.toLowerCase().replace('_', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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