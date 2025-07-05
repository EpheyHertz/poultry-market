
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  User, 
  Truck, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  voucherCode: string;
  paymentStatus: string;
  paymentType: string;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
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
        role: string;
        email: string;
        phone: string;
      };
    };
  }>;
  delivery?: {
    id: string;
    status: string;
    address: string;
    trackingId: string;
    agentName: string;
    agentPhone: string;
    estimatedDelivery: string;
    actualDelivery: string;
  };
  payment?: {
    id: string;
    method: string;
    status: string;
    amount: number;
    transactionCode: string;
  };
}

export default function AdminOrders() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
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
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [orders, filterStatus, searchTerm]);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?admin=true');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: rejectionReason.trim()
        }),
      });

      if (response.ok) {
        toast.success('Order rejected successfully');
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedOrder(null);
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

  const handleApproveOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CONFIRMED'
        }),
      });

      if (response.ok) {
        toast.success('Order approved successfully');
        fetchOrders();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to approve order');
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
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'REJECTED': return 'bg-gray-100 text-gray-800';
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
      case 'REFUNDED': return 'bg-purple-100 text-purple-800';
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

  const getOrderEvents = (order: Order) => {
    const events = [
      {
        type: 'ORDER_PLACED',
        timestamp: order.createdAt,
        description: 'Order placed by customer',
        icon: Package,
        color: 'text-blue-600'
      }
    ];

    if (order.status === 'CONFIRMED') {
      events.push({
        type: 'ORDER_CONFIRMED',
        timestamp: order.updatedAt,
        description: 'Order confirmed by admin',
        icon: CheckCircle,
        color: 'text-green-600'
      });
    }

    if (order.status === 'REJECTED') {
      events.push({
        type: 'ORDER_REJECTED',
        timestamp: order.updatedAt,
        description: `Order rejected: ${order.rejectionReason}`,
        icon: XCircle,
        color: 'text-red-600'
      });
    }

    if (order.delivery) {
      events.push({
        type: 'DELIVERY_CREATED',
        timestamp: order.delivery.estimatedDelivery,
        description: 'Delivery scheduled',
        icon: Truck,
        color: 'text-purple-600'
      });

      if (order.delivery.actualDelivery) {
        events.push({
          type: 'DELIVERED',
          timestamp: order.delivery.actualDelivery,
          description: 'Order delivered successfully',
          icon: CheckCircle,
          color: 'text-green-600'
        });
      }
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
            <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600 mt-2">Monitor and manage all customer orders</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'CONFIRMED').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'DELIVERED').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(orders.reduce((sum, o) => sum + o.total, 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Orders</Label>
                <Input
                  id="search"
                  placeholder="Search by order ID, customer name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="md:w-48">
                <Label htmlFor="status">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PACKED">Packed</SelectItem>
                    <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>All customer orders with detailed information</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your filters or search criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                          <CardDescription>
                            {new Date(order.createdAt).toLocaleDateString()} • {formatCurrency(order.total)}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                            {order.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Customer Info */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Customer
                          </h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Name:</strong> {order.customer.name}</p>
                            <p><strong>Email:</strong> {order.customer.email}</p>
                            <p><strong>Phone:</strong> {order.customer.phone}</p>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center">
                            <Package className="h-4 w-4 mr-2" />
                            Items & Sellers
                          </h4>
                          <div className="space-y-1 text-sm">
                            {order.items.map((item) => (
                              <div key={item.id}>
                                <p>{item.product.name} x{item.quantity}</p>
                                <p className="text-gray-600">
                                  Seller: {item.product.seller.name} ({item.product.seller.role})
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery Info */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center">
                            <Truck className="h-4 w-4 mr-2" />
                            Delivery
                          </h4>
                          {order.delivery ? (
                            <div className="space-y-1 text-sm">
                              <p><strong>Status:</strong> {order.delivery.status.replace('_', ' ')}</p>
                              <p><strong>Tracking:</strong> {order.delivery.trackingId}</p>
                              {order.delivery.agentName && (
                                <>
                                  <p><strong>Agent:</strong> {order.delivery.agentName}</p>
                                  <p><strong>Phone:</strong> {order.delivery.agentPhone}</p>
                                </>
                              )}
                              <p><strong>Address:</strong> {order.delivery.address}</p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No delivery assigned</p>
                          )}
                        </div>
                      </div>

                      {/* Order Summary */}
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center text-sm">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        {order.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-sm text-green-600">
                            <span>Discount {order.voucherCode ? `(${order.voucherCode})` : ''}:</span>
                            <span>-{formatCurrency(order.discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center font-semibold border-t pt-2">
                          <span>Total:</span>
                          <span>{formatCurrency(order.total)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          {order.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveOrder(order.id)}
                                disabled={isLoading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowRejectModal(true);
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Payment: {order.paymentType.replace('_', ' ')} • {order.paymentStatus}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Modal */}
        {showDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Order #{selectedOrder.id}</h2>
                    <p className="text-gray-600">
                      Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setShowDetails(false)}>
                    Close
                  </Button>
                </div>

                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Order Details</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <User className="h-5 w-5 mr-2" />
                            Customer Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p><strong>Name:</strong> {selectedOrder.customer.name}</p>
                            <p><strong>Email:</strong> {selectedOrder.customer.email}</p>
                            <p><strong>Phone:</strong> {selectedOrder.customer.phone}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Package className="h-5 w-5 mr-2" />
                            Order Items
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {selectedOrder.items.map((item) => (
                              <div key={item.id} className="border-b pb-2">
                                <div className="flex justify-between">
                                  <span>{item.product.name}</span>
                                  <span>{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Quantity: {item.quantity} • Price: {formatCurrency(item.price)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Seller: {item.product.seller.name} ({item.product.seller.role})
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {selectedOrder.delivery && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <Truck className="h-5 w-5 mr-2" />
                              Delivery Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <p><strong>Status:</strong> {selectedOrder.delivery.status.replace('_', ' ')}</p>
                              <p><strong>Tracking ID:</strong> {selectedOrder.delivery.trackingId}</p>
                              <p><strong>Address:</strong> {selectedOrder.delivery.address}</p>
                              {selectedOrder.delivery.agentName && (
                                <>
                                  <p><strong>Agent:</strong> {selectedOrder.delivery.agentName}</p>
                                  <p><strong>Agent Phone:</strong> {selectedOrder.delivery.agentPhone}</p>
                                </>
                              )}
                              {selectedOrder.delivery.estimatedDelivery && (
                                <p><strong>Estimated Delivery:</strong> {new Date(selectedOrder.delivery.estimatedDelivery).toLocaleDateString()}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Order Timeline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {getOrderEvents(selectedOrder).map((event, index) => (
                            <div key={index} className="flex items-start space-x-4">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 ${event.color}`}>
                                <event.icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{event.description}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(event.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="payment" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Payment Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Payment Type</Label>
                              <p className="text-sm">{selectedOrder.paymentType.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <Label>Payment Status</Label>
                              <Badge className={getPaymentStatusColor(selectedOrder.paymentStatus)}>
                                {selectedOrder.paymentStatus}
                              </Badge>
                            </div>
                          </div>
                          
                          {selectedOrder.payment && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Payment Method</Label>
                                <p className="text-sm">{selectedOrder.payment.method}</p>
                              </div>
                              <div>
                                <Label>Transaction Code</Label>
                                <p className="text-sm font-mono">{selectedOrder.payment.transactionCode}</p>
                              </div>
                            </div>
                          )}

                          <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span>Subtotal:</span>
                              <span>{formatCurrency(selectedOrder.subtotal)}</span>
                            </div>
                            {selectedOrder.discountAmount > 0 && (
                              <div className="flex justify-between items-center text-green-600">
                                <span>Discount {selectedOrder.voucherCode ? `(${selectedOrder.voucherCode})` : ''}:</span>
                                <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center font-semibold border-t pt-2">
                              <span>Total:</span>
                              <span>{formatCurrency(selectedOrder.total)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}

        {/* Reject Order Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                Reject Order
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reason">Rejection Reason</Label>
                  <Textarea
                    id="reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejecting this order..."
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRejectOrder} 
                    disabled={isLoading || !rejectionReason.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoading ? 'Rejecting...' : 'Reject Order'}
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
