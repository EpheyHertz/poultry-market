'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck,
  Eye,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminOrders() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
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
      fetchOrders();
    }
  }, [user, statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: rejectionReason }),
      });

      if (response.ok) {
        toast.success('Order rejected successfully!');
        setSelectedOrder(null);
        setRejectionReason('');
        fetchOrders();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to reject order');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignDelivery = async (orderId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/orders/${orderId}/assign-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Delivery assigned successfully!');
        fetchOrders();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'PACKED': return 'bg-purple-100 text-purple-800';
      case 'DISPATCHED': return 'bg-indigo-100 text-indigo-800';
      case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <div>Loading...</div>;
  }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return Clock;
            case 'CONFIRMED': return CheckCircle;
            case 'REJECTED': return XCircle;
            case 'DELIVERED': return Package;
            default: return Package;
        }
    };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-2">Approve, reject, and track all orders in the system</p>
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
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="">All Orders</SelectItem> */}
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PACKED">Packed</SelectItem>
                  <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>Manage all orders in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <ShoppingCart className="h-8 w-8 text-gray-400" />
                        <div>
                          <h3 className="text-lg font-medium">
                            Order #{order.id.slice(-8)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {order.customer.name} • {order.customer.email}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                            Payment: {order.paymentStatus}
                          </Badge>
                          <p className="text-sm font-medium mt-1">${order.total.toFixed(2)}</p>
                        </div>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Order Management</DialogTitle>
                              <DialogDescription>
                                Manage order #{order.id.slice(-8)}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                              {/* Order Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-medium mb-2">Customer Information</h4>
                                  <div className="space-y-1 text-sm">
                                    <p><strong>Name:</strong> {order.customer.name}</p>
                                    <p><strong>Email:</strong> {order.customer.email}</p>
                                    <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium mb-2">Order Status</h4>
                                  <div className="space-y-2">
                                    <Badge className={getStatusColor(order.status)}>
                                      {order.status.replace('_', ' ')}
                                    </Badge>
                                    <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                                      Payment: {order.paymentStatus}
                                    </Badge>
                                    <p className="text-sm">
                                      <strong>Payment Type:</strong> {order.paymentType.replace('_', ' ')}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Order Items */}
                              <div>
                                <h4 className="font-medium mb-2">Order Items</h4>
                                <div className="space-y-2">
                                  {order.items.map((item: any) => (
                                    <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                      <div>
                                        <span className="font-medium">{item.product.name}</span>
                                        <span className="text-gray-500 ml-2">x{item.quantity}</span>
                                      </div>
                                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between items-center pt-2 border-t font-medium">
                                    <span>Total:</span>
                                    <span>${order.total.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Delivery Information */}
                              {order.delivery && (
                                <div>
                                  <h4 className="font-medium mb-2">Delivery Information</h4>
                                  <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm"><strong>Address:</strong> {order.delivery.address}</p>
                                    <p className="text-sm"><strong>Tracking ID:</strong> {order.delivery.trackingId}</p>
                                    <p className="text-sm"><strong>Status:</strong> {order.delivery.status}</p>
                                    {order.delivery.agentName && (
                                      <p className="text-sm"><strong>Agent:</strong> {order.delivery.agentName}</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Payment Details */}
                              {order.paymentDetails && (
                                <div>
                                  <h4 className="font-medium mb-2">Payment Details</h4>
                                  <div className="p-3 bg-green-50 rounded-lg">
                                    <p className="text-sm"><strong>Phone:</strong> {order.paymentPhone}</p>
                                    <p className="text-sm"><strong>Reference:</strong> {order.paymentReference}</p>
                                    <p className="text-sm"><strong>Details:</strong> {order.paymentDetails}</p>
                                  </div>
                                </div>
                              )}

                              {/* Rejection Reason */}
                              {order.status === 'REJECTED' && order.rejectionReason && (
                                <div>
                                  <h4 className="font-medium mb-2">Rejection Reason</h4>
                                  <div className="p-3 bg-red-50 rounded-lg">
                                    <p className="text-sm">{order.rejectionReason}</p>
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex space-x-2 pt-4 border-t">
                                {order.status === 'PENDING' && (
                                  <>
                                    <Button
                                      onClick={() => handleAssignDelivery(order.id)}
                                      disabled={isLoading}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve & Assign Delivery
                                    </Button>

                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="destructive">
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Reject Order
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Reject Order</DialogTitle>
                                          <DialogDescription>
                                            Please provide a reason for rejecting this order
                                          </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-4">
                                          <div className="space-y-2">
                                            <Label htmlFor="reason">Rejection Reason</Label>
                                            <Textarea
                                              id="reason"
                                              value={rejectionReason}
                                              onChange={(e) => setRejectionReason(e.target.value)}
                                              placeholder="Explain why this order is being rejected..."
                                              rows={3}
                                              required
                                            />
                                          </div>

                                          <div className="flex space-x-2">
                                            <Button
                                              onClick={handleRejectOrder}
                                              disabled={isLoading || !rejectionReason.trim()}
                                              variant="destructive"
                                              className="flex-1"
                                            >
                                              {isLoading ? 'Rejecting...' : 'Reject Order'}
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  </>
                                )}

                                {order.status === 'CONFIRMED' && !order.delivery && (
                                  <Button
                                    onClick={() => handleAssignDelivery(order.id)}
                                    disabled={isLoading}
                                  >
                                    <Truck className="h-4 w-4 mr-2" />
                                    Assign Delivery
                                  </Button>
                                )}
                              </div>
                            </div>
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