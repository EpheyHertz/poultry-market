
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  CheckCircle,
  AlertCircle,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Delivery {
  id: string;
  orderId: string;
  status: string;
  address: string;
  trackingId: string;
  estimatedDelivery: string;
  actualDelivery: string;
  pickupTime: string;
  dispatchTime: string;
  deliveryNotes: string;
  agentName: string;
  agentPhone: string;
  vehicleInfo: string;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    total: number;
    customer: {
      id: string;
      name: string;
      phone: string;
      email: string;
    };
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      product: {
        id: string;
        name: string;
        seller: {
          id: string;
          name: string;
          phone: string;
          email: string;
        };
      };
    }>;
  };
}

export default function DeliveryAgentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [assignedDeliveries, setAssignedDeliveries] = useState<Delivery[]>([]);
  const [unassignedDeliveries, setUnassignedDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ deliveryId: '', status: '', notes: '' });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'DELIVERY_AGENT') {
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
      fetchDeliveries();
    }
  }, [user]);

  const fetchDeliveries = async () => {
    try {
      const [assignedRes, unassignedRes] = await Promise.all([
        fetch('/api/delivery/agent'),
        fetch('/api/delivery/unassigned')
      ]);

      if (assignedRes.ok) {
        const assignedData = await assignedRes.json();
        setAssignedDeliveries(assignedData.deliveries);
      }

      if (unassignedRes.ok) {
        const unassignedData = await unassignedRes.json();
        setUnassignedDeliveries(unassignedData.deliveries);
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    }
  };

  const handleSelfAssign = async (deliveryId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/delivery/${deliveryId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId: user.id }),
      });

      if (response.ok) {
        toast.success('Delivery assigned successfully!');
        fetchDeliveries();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to assign delivery');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdate.deliveryId || !statusUpdate.status) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/delivery/${statusUpdate.deliveryId}/update-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: statusUpdate.status,
          notes: statusUpdate.notes,
        }),
      });

      if (response.ok) {
        toast.success('Status updated successfully!');
        setStatusUpdate({ deliveryId: '', status: '', notes: '' });
        setShowStatusModal(false);
        fetchDeliveries();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP': return 'bg-yellow-100 text-yellow-800';
      case 'IN_TRANSIT': return 'bg-orange-100 text-orange-800';
      case 'OUT_FOR_DELIVERY': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Delivery Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your delivery assignments and track progress</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Agent ID</p>
              <p className="font-mono text-sm">{user.agentId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Coverage Area</p>
              <p className="text-sm">{user.coverageArea}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned Deliveries</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedDeliveries.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assignedDeliveries.filter(d => d.status === 'IN_TRANSIT').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assignedDeliveries.filter(d => 
                  d.status === 'DELIVERED' && 
                  new Date(d.actualDelivery).toDateString() === new Date().toDateString()
                ).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unassignedDeliveries.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Delivery Management */}
        <Tabs defaultValue="assigned" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assigned">My Deliveries</TabsTrigger>
            <TabsTrigger value="available">Available Deliveries</TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Deliveries</CardTitle>
                <CardDescription>Manage your current delivery assignments</CardDescription>
              </CardHeader>
              <CardContent>
                {assignedDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No assigned deliveries</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Check the available deliveries tab to self-assign orders.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedDeliveries.map((delivery) => (
                      <Card key={delivery.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">Order #{delivery.orderId}</CardTitle>
                              <CardDescription>
                                Tracking: {delivery.trackingId}
                              </CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(delivery.status)}>
                                {delivery.status.replace('_', ' ')}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setStatusUpdate({ deliveryId: delivery.id, status: '', notes: '' });
                                  setShowStatusModal(true);
                                }}
                              >
                                Update Status
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Customer Info */}
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center">
                                <User className="h-4 w-4 mr-2" />
                                Customer Details
                              </h4>
                              <div className="space-y-1 text-sm">
                                <p><strong>Name:</strong> {delivery.order.customer.name}</p>
                                <p><strong>Phone:</strong> {delivery.order.customer.phone}</p>
                                <p><strong>Email:</strong> {delivery.order.customer.email}</p>
                              </div>
                            </div>

                            {/* Delivery Address */}
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                Delivery Address
                              </h4>
                              <p className="text-sm">{delivery.address}</p>
                              {delivery.deliveryNotes && (
                                <p className="text-sm text-gray-600 mt-1">
                                  <strong>Notes:</strong> {delivery.deliveryNotes}
                                </p>
                              )}
                            </div>

                            {/* Order Items */}
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center">
                                <Package className="h-4 w-4 mr-2" />
                                Order Items
                              </h4>
                              <div className="space-y-1 text-sm">
                                {delivery.order.items.map((item) => (
                                  <div key={item.id} className="flex justify-between">
                                    <span>{item.product.name} x{item.quantity}</span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                  </div>
                                ))}
                                <div className="border-t pt-1 font-semibold">
                                  <div className="flex justify-between">
                                    <span>Total:</span>
                                    <span>{formatCurrency(delivery.order.total)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Timeline */}
                            <div>
                              <h4 className="font-semibold mb-2 flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                Timeline
                              </h4>
                              <div className="space-y-1 text-sm">
                                <p><strong>Created:</strong> {new Date(delivery.createdAt).toLocaleString()}</p>
                                {delivery.pickupTime && (
                                  <p><strong>Picked Up:</strong> {new Date(delivery.pickupTime).toLocaleString()}</p>
                                )}
                                {delivery.dispatchTime && (
                                  <p><strong>Dispatched:</strong> {new Date(delivery.dispatchTime).toLocaleString()}</p>
                                )}
                                {delivery.actualDelivery && (
                                  <p><strong>Delivered:</strong> {new Date(delivery.actualDelivery).toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="available" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Deliveries</CardTitle>
                <CardDescription>Self-assign deliveries in your coverage area</CardDescription>
              </CardHeader>
              <CardContent>
                {unassignedDeliveries.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No available deliveries</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      All deliveries in your area have been assigned.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {unassignedDeliveries.map((delivery) => (
                      <Card key={delivery.id} className="border-l-4 border-l-green-500">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">Order #{delivery.orderId}</CardTitle>
                              <CardDescription>
                                Total: {formatCurrency(delivery.order.total)}
                              </CardDescription>
                            </div>
                            <Button
                              onClick={() => handleSelfAssign(delivery.id)}
                              disabled={isLoading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isLoading ? 'Assigning...' : 'Self Assign'}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-2">Customer</h4>
                              <p className="text-sm">{delivery.order.customer.name}</p>
                              <p className="text-sm text-gray-600">{delivery.order.customer.phone}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Delivery Address</h4>
                              <p className="text-sm">{delivery.address}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Status Update Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Update Delivery Status</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusUpdate.status} onValueChange={(value) => setStatusUpdate({...statusUpdate, status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                      <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                      <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={statusUpdate.notes}
                    onChange={(e) => setStatusUpdate({...statusUpdate, notes: e.target.value})}
                    placeholder="Add any additional notes..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStatusUpdate} disabled={isLoading}>
                    {isLoading ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
