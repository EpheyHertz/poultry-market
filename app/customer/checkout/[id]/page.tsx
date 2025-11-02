'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingCart, 
  CreditCard, 
  MapPin, 
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  ArrowLeft,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { formatProductTypeLabel } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  type: string;
  customType?: string | null;
  images: string[];
  sellerId: string;
  isActive: boolean;
  hasDiscount: boolean;
  discountType: string | null;
  discountAmount: number | null;
  discountStartDate: string | null;
  discountEndDate: string | null;
  seller: {
    id: string;
    name: string;
    role: string;
    dashboardSlug: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CheckoutSession {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  quantity: number;
  totalAmount: number;
  paymentType: string;
  deliveryAddress?: string;
  deliveryCounty?: string;
  deliveryProvince?: string;
  deliveryFee: number;
  isCompleted: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export default function CheckoutSessionPage() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const sessionId = params?.id as string;

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) throw new Error('Unauthorized');
        
        const userData = await response.json();
        if (userData.role !== 'CUSTOMER') {
          throw new Error('Unauthorized access');
        }
        setUser(userData);
      } catch (error) {
        console.error('Authentication error:', error);
        toast.error('Please login to continue');
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  // Fetch checkout session
  useEffect(() => {
    if (!user || !sessionId) return;

    const fetchSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/checkout/session/${sessionId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Checkout session not found');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view this session');
          } else {
            throw new Error('Failed to load checkout session');
          }
        }
        
        const sessionData = await response.json();
        setSession(sessionData);
      } catch (error) {
        console.error('Session fetch error:', error);
        setError(error instanceof Error ? error.message : 'Failed to load session');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [user, sessionId]);

  // Calculate discounted price
  const calculateItemPrice = (product: Product) => {
    if (product?.hasDiscount && 
        product.discountStartDate && 
        product.discountEndDate &&
        new Date(product.discountStartDate) <= new Date() && 
        new Date(product.discountEndDate) >= new Date()) {
      
      if (product.discountType === 'PERCENTAGE' && product.discountAmount) {
        return product.price * (1 - product.discountAmount / 100);
      } else if (product.discountType === 'FIXED_AMOUNT' && product.discountAmount) {
        return Math.max(0, product.price - product.discountAmount);
      }
    }
    return product?.price || 0;
  };

  // Handle session actions
  const handleDeleteSession = async () => {
    if (!session || session.isCompleted) return;

    if (!confirm('Are you sure you want to cancel this checkout session? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/checkout/session/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      toast.success('Checkout session cancelled successfully');
      router.push('/customer/products');
    } catch (error) {
      console.error('Delete session error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel session');
    }
  };

  const handleContinueCheckout = () => {
    if (!session || session.isCompleted) return;
    router.push(`/customer/checkout?session=${sessionId}`);
  };

  if (isLoading || !user) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading checkout session...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !session) {
    return (
      <DashboardLayout user={user}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Checkout session not found'}
            </AlertDescription>
          </Alert>

          <div className="mt-6 text-center">
            <Button onClick={() => router.push('/customer/products')}>
              Browse Products
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isExpired = new Date(session.expiresAt) < new Date();
  const itemPrice = calculateItemPrice(session.product);
  const hasActiveDiscount = session.product?.hasDiscount && 
    session.product?.discountStartDate && 
    session.product?.discountEndDate &&
    new Date(session.product?.discountStartDate) <= new Date() && 
    new Date(session.product?.discountEndDate) >= new Date();

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Checkout Session</h1>
            <p className="text-gray-600 mt-1">Session ID: {session.id}</p>
          </div>
          <div className="text-right">
            <Badge 
              variant={session.isCompleted ? "default" : isExpired ? "destructive" : "secondary"}
              className="mb-2"
            >
              {session.isCompleted ? "Completed" : isExpired ? "Expired" : "Active"}
            </Badge>
          </div>
        </div>

        {/* Status Alert */}
        {isExpired && !session.isCompleted && (
          <Alert variant="destructive">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This checkout session has expired. You&apos;ll need to create a new session to purchase this product.
            </AlertDescription>
          </Alert>
        )}

        {session.isCompleted && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              This checkout session has been completed successfully.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {session.product.images && session.product.images.length > 0 && (
                    <div className="flex-shrink-0">
                      <Image 
                        src={session.product.images[0]} 
                        alt={session.product.name}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{session.product.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{session.product.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{formatProductTypeLabel(session.product.type, session.product.customType)}</Badge>
                      {hasActiveDiscount && (
                        <Badge variant="secondary" className="text-green-600">
                          {session.product.discountType === 'PERCENTAGE' 
                            ? `${session.product.discountAmount}% OFF`
                            : `Ksh ${session.product.discountAmount} OFF`
                          }
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Seller:</span>
                    <p>{session.product.seller.name}</p>
                  </div>
                  <div>
                    <span className="font-medium">Stock Available:</span>
                    <p>{session.product.stock} units</p>
                  </div>
                  <div>
                    <span className="font-medium">Unit Price:</span>
                    <div>
                      <span className="font-semibold">Ksh {itemPrice.toFixed(2)}</span>
                      {hasActiveDiscount && (
                        <span className="text-gray-500 line-through ml-2">
                          Ksh {session.product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Quantity:</span>
                    <p>{session.quantity} units</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            {(session.deliveryAddress || session.deliveryCounty) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {session.deliveryCounty && (
                    <div>
                      <span className="font-medium text-sm">County:</span>
                      <p>{session.deliveryCounty}</p>
                    </div>
                  )}
                  {session.deliveryProvince && (
                    <div>
                      <span className="font-medium text-sm">Province:</span>
                      <p>{session.deliveryProvince}</p>
                    </div>
                  )}
                  {session.deliveryAddress && (
                    <div>
                      <span className="font-medium text-sm">Address:</span>
                      <p className="text-gray-600">{session.deliveryAddress}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-sm">Delivery Fee:</span>
                    <p>Ksh {session.deliveryFee.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Session Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Created:</span>
                    <p>{new Date(session.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Expires:</span>
                    <p className={isExpired ? "text-red-600" : ""}>
                      {new Date(session.expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Payment Type:</span>
                    <p>{session.paymentType || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className={session.isCompleted ? "text-green-600" : isExpired ? "text-red-600" : "text-blue-600"}>
                      {session.isCompleted ? "Completed" : isExpired ? "Expired" : "Active"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal ({session.quantity} items):</span>
                    <span>Ksh {(itemPrice * session.quantity).toFixed(2)}</span>
                  </div>
                  
                  {hasActiveDiscount && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Product Discount:</span>
                      <span>-Ksh {((session.product.price - itemPrice) * session.quantity).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee:</span>
                    <span>Ksh {session.deliveryFee.toFixed(2)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>Ksh {session.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!session.isCompleted && !isExpired && (
                  <Button 
                    onClick={handleContinueCheckout}
                    className="w-full"
                    size="lg"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Continue Checkout
                  </Button>
                )}

                {!session.isCompleted && (
                  <Button 
                    onClick={handleDeleteSession}
                    variant="destructive"
                    className="w-full"
                    size="sm"
                  >
                    Cancel Session
                  </Button>
                )}

                <Button 
                  onClick={() => router.push('/customer/products')}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Browse Products
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
