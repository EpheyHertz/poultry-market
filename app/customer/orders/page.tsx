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
  ShoppingCart, 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  CreditCard,
  Star,
  MessageSquare,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerOrders() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    phone: '',
    reference: '',
    mpesaMessage: ''
  });
  const [reviewForm, setReviewForm] = useState({
    productId: '',
    rating: 5,
    comment: '',
    images: []
  });
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const handlePaymentSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentForm),
      });

      if (response.ok) {
        toast.success('Payment details submitted successfully!');
        setShowPaymentDialog(false);
        setPaymentForm({ phone: '', reference: '', mpesaMessage: '' });
        fetchOrders();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit payment');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewForm),
      });

      if (response.ok) {
        toast.success('Review submitted successfully!');
        setShowReviewDialog(false);
        setReviewForm({ productId: '', rating: 5, comment: '', images: [] });
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to submit review');
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
      case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return Clock;
      case 'CONFIRMED': return CheckCircle;
      case 'PACKED': return Package;
      case 'OUT_FOR_DELIVERY': return Truck;
      case 'DELIVERED': return CheckCircle;
      default: return Clock;
    }
  };

  const canSubmitPayment = (order: any) => {
    return (order.paymentType === 'BEFORE_DELIVERY' && order.paymentStatus === 'UNPAID') ||
           (order.paymentType === 'AFTER_DELIVERY' && order.status === 'DELIVERED' && order.paymentStatus !== 'APPROVED');
  };

  const canReview = (order: any) => {
    return order.status === 'DELIVERED';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-2">Track your orders and manage payments</p>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start shopping to see your orders here.
                </p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              return (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <StatusIcon className="h-5 w-5" />
                          <span>Order #{order.id.slice(-8)}</span>
                        </CardTitle>
                        <CardDescription>
                          Placed on {new Date(order.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                          Payment: {order.paymentStatus}
                        </Badge>
                        <Badge variant="outline">
                          {order.paymentType.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Order Items */}
                      <div>
                        <h4 className="font-medium mb-2">Items:</h4>
                        <div className="space-y-2">
                          {order.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-gray-500 ml-2">x{item.quantity}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                                {canReview(order) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setReviewForm({ ...reviewForm, productId: item.product.id });
                                      setShowReviewDialog(true);
                                    }}
                                  >
                                    <Star className="h-4 w-4 mr-1" />
                                    Review
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">Total:</span>
                        <span className="text-xl font-bold">${order.total.toFixed(2)}</span>
                      </div>

                      {/* Delivery Info */}
                      {order.delivery && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium mb-1 flex items-center">
                            <Truck className="h-4 w-4 mr-2" />
                            Delivery Tracking
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Tracking ID:</span>
                              <span className="font-medium">{order.delivery.trackingId}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Status:</span>
                              <Badge variant="outline" className="text-xs">
                                {order.delivery.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            {order.delivery.agentName && (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Delivery Agent:</span>
                                  <span className="font-medium">{order.delivery.agentName}</span>
                                </div>
                                {order.delivery.agentPhone && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Agent Phone:</span>
                                    <a href={`tel:${order.delivery.agentPhone}`} className="text-blue-600 hover:underline">
                                      {order.delivery.agentPhone}
                                    </a>
                                  </div>
                                )}
                                {order.delivery.vehicleInfo && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Vehicle:</span>
                                    <span className="font-medium">{order.delivery.vehicleInfo}</span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="pt-2 border-t">
                              <p className="text-sm text-gray-600">Address: {order.delivery.address}</p>
                            </div>
                            {order.delivery.deliveryNotes && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-gray-600">Notes: {order.delivery.deliveryNotes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Payment Actions */}
                      {canSubmitPayment(order) && (
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowPaymentDialog(true);
                            }}
                            className="flex-1"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Submit Payment
                          </Button>
                        </div>
                      )}

                      {/* Payment Details */}
                      {order.paymentDetails && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-medium mb-1">Payment Details</h4>
                          <p className="text-sm text-gray-600">Phone: {order.paymentPhone}</p>
                          <p className="text-sm text-gray-600">Reference: {order.paymentReference}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Payment Details</DialogTitle>
              <DialogDescription>
                Enter your M-Pesa payment details for order #{selectedOrder?.id.slice(-8)}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handlePaymentSubmission} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number Used</Label>
                <Input
                  id="phone"
                  value={paymentForm.phone}
                  onChange={(e) => setPaymentForm({ ...paymentForm, phone: e.target.value })}
                  placeholder="254712345678"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Transaction Reference</Label>
                <Input
                  id="reference"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="ABC123DEF4"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpesaMessage">M-Pesa Confirmation Message</Label>
                <Textarea
                  id="mpesaMessage"
                  value={paymentForm.mpesaMessage}
                  onChange={(e) => setPaymentForm({ ...paymentForm, mpesaMessage: e.target.value })}
                  placeholder="Paste your M-Pesa confirmation message here..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Submitting...' : 'Submit Payment'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
              <DialogDescription>
                Share your experience with this product
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleReviewSubmission} className="space-y-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className={`p-1 ${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      <Star className="h-6 w-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Review</Label>
                <Textarea
                  id="comment"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Write your review here..."
                  rows={4}
                  required
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowReviewDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}