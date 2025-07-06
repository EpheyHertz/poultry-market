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
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryVoucherCode, setDeliveryVoucherCode] = useState('');
  const [deliveryDiscount, setDeliveryDiscount] = useState(0);
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
        fetchDeliveryFee();
      } catch (error) {
        console.error('Failed to parse cart items:', error);
        router.push('/customer/products');
      }
    } else {
      router.push('/customer/products');
    }
  }, [searchParams, router]);

  const fetchDeliveryFee = async () => {
    try {
      const response = await fetch('/api/delivery-fees');
      if (response.ok) {
        const fees = await response.json();
        const defaultFee = fees.find((fee: any) => fee.isDefault) || fees[0];
        if (defaultFee) {
          setDeliveryFee(defaultFee.amount);
        }
      }
    } catch (error) {
      console.error('Failed to fetch delivery fee:', error);
    }
  };

  const validateDeliveryVoucher = async () => {
    if (!deliveryVoucherCode.trim()) return;
    
    try {
      const response = await fetch(`/api/delivery-vouchers?code=${deliveryVoucherCode}`);
      if (response.ok) {
        const voucher = await response.json();
        const subtotal = calculateSubtotal();
        
        if (voucher.minOrderAmount && subtotal < voucher.minOrderAmount) {
          toast.error(`Minimum order amount for this voucher is $${voucher.minOrderAmount}`);
          return;
        }
        
        let discount = 0;
        if (voucher.discountType === 'PERCENTAGE') {
          discount = (deliveryFee * voucher.discountValue) / 100;
        } else {
          discount = Math.min(voucher.discountValue, deliveryFee);
        }
        
        setDeliveryDiscount(discount);
        toast.success(`Delivery voucher applied! $${discount.toFixed(2)} discount`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Invalid voucher code');
        setDeliveryDiscount(0);
      }
    } catch (error) {
      toast.error('Failed to validate voucher');
      setDeliveryDiscount(0);
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const finalDeliveryFee = Math.max(0, deliveryFee - deliveryDiscount);
    return subtotal + finalDeliveryFee;
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
        paymentDetails: paymentType === 'BEFORE_DELIVERY' ? paymentDetails : null,
        deliveryFee: Math.max(0, deliveryFee - deliveryDiscount),
        deliveryVoucherCode: deliveryVoucherCode || null,
        deliveryDiscount
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
                        Ksh {item.price.toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium">
                      Ksh {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Ksh {calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery fee:</span>
                    <span>Ksh {deliveryFee.toFixed(2)}</span>
                  </div>
                  {deliveryDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Delivery discount:</span>
                      <span>-Ksh {deliveryDiscount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span>Ksh {calculateTotal().toFixed(2)}</span>
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

                {/* Delivery Voucher */}
                <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium">Delivery Voucher (Optional)</h4>
                  <div className="flex space-x-2">
                    <Input
                      value={deliveryVoucherCode}
                      onChange={(e) => setDeliveryVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Enter delivery voucher code"
                    />
                    <Button type="button" onClick={validateDeliveryVoucher} variant="outline">
                      Apply
                    </Button>
                  </div>
                  {deliveryDiscount > 0 && (
                    <p className="text-sm text-green-600">
                      Voucher applied! You save Ksh {deliveryDiscount.toFixed(2)} on delivery
                    </p>
                  )}
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