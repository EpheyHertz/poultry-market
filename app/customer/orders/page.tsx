'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  MessageCircle,
  Download,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    images: string[];
    seller: {
      id: string;
      name: string;
      role: string;
    };
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  voucherCode: string;
  paymentStatus: string;
  deliveryFee:number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  delivery?: {
    id: string;
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
  };
  invoice?: {
    id: string;
    fileName: string;
    filePath: string;
  };
}

export default function CustomerOrders() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'CUSTOMER') {
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

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const downloadInvoice = async (orderId: string) => {
    try {
      const response = await fetch(`/api/invoices/${orderId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${orderId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Invoice downloaded successfully!');
      } else {
        toast.error('Failed to download invoice');
      }
    } catch (error) {
      toast.error('An error occurred while downloading invoice');
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

  const getDeliveryStatusColor = (status: string) => {
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

  const getProgressSteps = (order: Order) => {
    const steps = [
      { key: 'PENDING', label: 'Order Placed', icon: Package },
      { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
      { key: 'PACKED', label: 'Packed', icon: Package },
      { key: 'DISPATCHED', label: 'Dispatched', icon: Truck },
      { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: MapPin },
      { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
    ];

    const currentIndex = steps.findIndex(step => step.key === order.status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-600 mt-2">Track your order history and delivery status</p>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start shopping to place your first order.
                </p>
                <Button 
                  onClick={() => router.push('/products')}
                  className="mt-4"
                >
                  Browse Products
                </Button>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">Order #{order.id}</CardTitle>
                      <CardDescription>
                        Placed on {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      {order.delivery && (
                        <Badge className={getDeliveryStatusColor(order.delivery.status)}>
                          {order.delivery.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Order Details */}
                    <div>
                      <h4 className="font-semibold mb-3">Order Summary</h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.product.name} x{item.quantity}</span>
                            <span>{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(order.subtotal)}</span>
                          </div>
                          {order.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Discount {order.voucherCode ? `(${order.voucherCode})` : ''}:</span>
                              <span>-{formatCurrency(order.discountAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold">
                            <span>Delivery Fee:</span>
                            <span>{formatCurrency(order.deliveryFee)}</span>
                            <span>Total:</span>
                            <span>{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Tracking */}
                    {order.delivery && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center">
                          <Truck className="h-4 w-4 mr-2" />
                          Delivery Tracking
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm font-medium">Tracking ID: {order.delivery.trackingId}</p>
                            <p className="text-sm text-gray-600">Status: {order.delivery.status.replace('_', ' ')}</p>
                          </div>

                          {order.delivery.agentName && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <h5 className="font-medium text-sm mb-1 flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                Delivery Agent
                              </h5>
                              <p className="text-sm">{order.delivery.agentName}</p>
                              {order.delivery.agentPhone && (
                                <p className="text-sm text-gray-600 flex items-center">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {order.delivery.agentPhone}
                                </p>
                              )}
                            </div>
                          )}

                          {order.delivery.deliveryNotes && (
                            <div className="bg-yellow-50 p-3 rounded-lg">
                              <h5 className="font-medium text-sm mb-1 flex items-center">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Latest Update
                              </h5>
                              <p className="text-sm">{order.delivery.deliveryNotes}</p>
                            </div>
                          )}

                          {/* Delivery Timeline */}
                          <div className="space-y-2">
                            <h5 className="font-medium text-sm">Delivery Timeline</h5>
                            <div className="space-y-1 text-xs">
                              {order.delivery.pickupTime && (
                                <div className="flex justify-between">
                                  <span>Picked up:</span>
                                  <span>{new Date(order.delivery.pickupTime).toLocaleString()}</span>
                                </div>
                              )}
                              {order.delivery.dispatchTime && (
                                <div className="flex justify-between">
                                  <span>Dispatched:</span>
                                  <span>{new Date(order.delivery.dispatchTime).toLocaleString()}</span>
                                </div>
                              )}
                              {order.delivery.actualDelivery && (
                                <div className="flex justify-between">
                                  <span>Delivered:</span>
                                  <span>{new Date(order.delivery.actualDelivery).toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Steps */}
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Order Progress</h4>
                    <div className="flex items-center space-x-4 overflow-x-auto">
                      {getProgressSteps(order).map((step, index) => (
                        <div key={step.key} className="flex items-center space-x-2 min-w-0">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                          }`}>
                            <step.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${
                              step.completed ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {step.label}
                            </p>
                          </div>
                          {index < getProgressSteps(order).length - 1 && (
                            <div className={`flex-shrink-0 w-8 h-0.5 ${
                              step.completed ? 'bg-green-500' : 'bg-gray-200'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center justify-between">
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
                      {order.status === 'DELIVERED' && order.invoice && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadInvoice(order.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Invoice
                        </Button>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Payment: <span className={`font-medium ${
                        order.paymentStatus === 'APPROVED' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {order.paymentStatus}
                      </span>
                    </div>
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