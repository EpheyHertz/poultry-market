'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, CreditCard, Truck } from 'lucide-react';
import { toast } from 'sonner';

export default function Checkout() {
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState('BEFORE_DELIVERY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({
    phone: '',
    reference: '',
    details: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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
    // Get cart items from URL params or localStorage
    const items = searchParams.get('items');
    if (items) {
      try {
        setCartItems(JSON.parse(decodeURIComponent(items)));
      } catch (error) {
        console.error('Failed to parse cart items:', error);
        router.push('/customer/products');
      }
    } else {
      router.push('/customer/products');
    }
  }, [searchParams, router]);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        deliveryAddress,
        paymentType,
        paymentDetails: paymentType === 'BEFORE_DELIVERY' ? paymentDetails : null
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        const order = await response.json();
        toast.success('Order placed successfully!');
        router.push(`/customer/orders`);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to place order');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">Review your order and complete your purchase</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        ${item.price.toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card>
            <CardHeader>
              <CardTitle>Checkout Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePlaceOrder} className="space-y-6">
                {/* Delivery Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center space-x-2">
                    <Truck className="h-4 w-4" />
                    <span>Delivery Address</span>
                  </Label>
                  <Textarea
                    id="address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your full delivery address..."
                    rows={3}
                    required
                  />
                </div>

                {/* Payment Type */}
                <div className="space-y-4">
                  <Label className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Payment Option</span>
                  </Label>
                  
                  <RadioGroup value={paymentType} onValueChange={setPaymentType}>
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="BEFORE_DELIVERY" id="before" />
                      <div className="flex-1">
                        <Label htmlFor="before" className="font-medium">Pay Before Delivery</Label>
                        <p className="text-sm text-gray-500">
                          Pay via M-Pesa now. Order will be processed after payment verification.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 border rounded-lg">
                      <RadioGroupItem value="AFTER_DELIVERY" id="after" />
                      <div className="flex-1">
                        <Label htmlFor="after" className="font-medium">Pay After Delivery</Label>
                        <p className="text-sm text-gray-500">
                          Pay when you receive your order. Submit payment details after delivery.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Payment Details (if paying before delivery) */}
                {paymentType === 'BEFORE_DELIVERY' && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium">M-Pesa Payment Details</h4>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={paymentDetails.phone}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, phone: e.target.value })}
                        placeholder="254712345678"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reference">Transaction Reference</Label>
                      <Input
                        id="reference"
                        value={paymentDetails.reference}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, reference: e.target.value })}
                        placeholder="ABC123DEF4"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="details">M-Pesa Confirmation Message</Label>
                      <Textarea
                        id="details"
                        value={paymentDetails.details}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, details: e.target.value })}
                        placeholder="Paste your M-Pesa confirmation message here..."
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Placing Order...' : 'Place Order'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}