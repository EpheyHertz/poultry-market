'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ShoppingCart, 
  CreditCard, 
  MapPin, 
  User, 
  Package,
  AlertCircle,
  CheckCircle,
  Ticket,
  Percent,
  DollarSign,
  Truck,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryAgent, setDeliveryAgent] = useState<any>(null);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [availableDeliveryVouchers, setAvailableDeliveryVouchers] = useState<any[]>([]);
  const [deliveryFees, setDeliveryFees] = useState<any[]>([]);
  const [selectedDeliveryFee, setSelectedDeliveryFee] = useState<any>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [appliedDeliveryVoucher, setAppliedDeliveryVoucher] = useState<any>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [deliveryVoucherCode, setDeliveryVoucherCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryDiscountAmount, setDeliveryDiscountAmount] = useState(0);
  const [paymentDetails, setPaymentDetails] = useState({
    method: 'MPESA',
    phone: '',
    notes: ''
  });
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
    if (user) {
      fetchCartItems();
      fetchAvailableVouchers();
      fetchDeliveryVouchers();
      fetchDeliveryFees();
    }
  }, [user]);

  const fetchCartItems = async () => {
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const data = await response.json();
        setCartItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch cart items:', error);
    }
  };

  const fetchAvailableVouchers = async () => {
    try {
      const response = await fetch('/api/vouchers?active=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableVouchers(data.vouchers || []);
      }
    } catch (error) {
      console.error('Failed to fetch vouchers:', error);
    }
  };

  const fetchDeliveryVouchers = async () => {
    try {
      const response = await fetch('/api/delivery-vouchers');
      if (response.ok) {
        const data = await response.json();
        setAvailableDeliveryVouchers(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch delivery vouchers:', error);
    }
  };

  const fetchDeliveryFees = async () => {
    try {
      const response = await fetch('/api/delivery-fees');
      if (response.ok) {
        const data = await response.json();
        setDeliveryFees(data || []);
        // Set default delivery fee
        const defaultFee = data.find((fee: any) => fee.isDefault);
        if (defaultFee) {
          setSelectedDeliveryFee(defaultFee);
        } else if (data.length > 0) {
          setSelectedDeliveryFee(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch delivery fees:', error);
    }
  };

  const applyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error('Please enter a voucher code');
      return;
    }

    try {
      const productTypes = [...new Set(cartItems.map(item => item.product.type))];
      const response = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherCode.toUpperCase(),
          orderTotal: subtotal,
          productTypes
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAppliedVoucher(data.voucher);
        setDiscountAmount(data.discountAmount);
        toast.success('Voucher applied successfully!');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Invalid voucher code');
      }
    } catch (error) {
      toast.error('Failed to apply voucher');
    }
  };

  const applyDeliveryVoucher = async () => {
    if (!deliveryVoucherCode.trim()) {
      toast.error('Please enter a delivery voucher code');
      return;
    }

    if (!selectedDeliveryFee) {
      toast.error('Please select a delivery option first');
      return;
    }

    try {
      const voucher = availableDeliveryVouchers.find(v => 
        v.code.toLowerCase() === deliveryVoucherCode.toLowerCase() && v.isActive
      );

      if (!voucher) {
        toast.error('Invalid delivery voucher code');
        return;
      }

      // Check expiry
      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
        toast.error('Delivery voucher has expired');
        return;
      }

      // Check usage limit
      if (voucher.usedCount >= voucher.maxUses) {
        toast.error('Delivery voucher usage limit reached');
        return;
      }

      // Check minimum order amount
      if (voucher.minOrderAmount > 0 && subtotal < voucher.minOrderAmount) {
        toast.error(`Minimum order amount for this voucher is $${voucher.minOrderAmount}`);
        return;
      }

      let discount = 0;
      if (voucher.discountType === 'PERCENTAGE') {
        discount = (selectedDeliveryFee.amount * voucher.discountValue) / 100;
      } else if (voucher.discountType === 'FIXED_AMOUNT') {
        discount = Math.min(voucher.discountValue, selectedDeliveryFee.amount);
      } else if (voucher.discountType === 'FREE_SHIPPING') {
        discount = selectedDeliveryFee.amount;
      }

      setAppliedDeliveryVoucher(voucher);
      setDeliveryDiscountAmount(discount);
      toast.success('Delivery voucher applied successfully!');
    } catch (error) {
      toast.error('Failed to apply delivery voucher');
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setDiscountAmount(0);
    setVoucherCode('');
    toast.success('Voucher removed');
  };

  const removeDeliveryVoucher = () => {
    setAppliedDeliveryVoucher(null);
    setDeliveryDiscountAmount(0);
    setDeliveryVoucherCode('');
    toast.success('Delivery voucher removed');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product.hasDiscount && 
                  item.product.discountStartDate <= new Date() && 
                  item.product.discountEndDate >= new Date()
      ? item.product.discountType === 'PERCENTAGE'
        ? item.product.price * (1 - item.product.discountAmount / 100)
        : item.product.price - item.product.discountAmount
      : item.product.price;
    return sum + (price * item.quantity);
  }, 0);

  const deliveryFee = selectedDeliveryFee ? selectedDeliveryFee.amount : 0;
  const finalDeliveryFee = deliveryFee - deliveryDiscountAmount;
  const total = subtotal - discountAmount + finalDeliveryFee;

  const orderData = {
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.hasDiscount && 
                 item.product.discountStartDate <= new Date() && 
                 item.product.discountEndDate >= new Date()
            ? item.product.discountType === 'PERCENTAGE'
              ? item.product.price * (1 - item.product.discountAmount / 100)
              : item.product.price - item.product.discountAmount
            : item.product.price
        })),
        total,
        subtotal,
        discountAmount,
        voucherCode: appliedVoucher?.code || null,
        deliveryFee: finalDeliveryFee,
        deliveryVoucherCode: appliedDeliveryVoucher?.code || null,
        paymentMethod: paymentDetails.method,
        paymentPhone: paymentDetails.phone,
        notes: paymentDetails.notes
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
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {appliedVoucher && discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Voucher Discount ({appliedVoucher.code}):</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {selectedDeliveryFee && (
                  <div className="flex justify-between">
                    <span>Delivery Fee ({selectedDeliveryFee.name}):</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}

                {appliedDeliveryVoucher && deliveryDiscountAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Delivery Discount ({appliedDeliveryVoucher.code}):</span>
                    <span>-${deliveryDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              </div>
            </CardContent>
          </Card>

          {/* Vouchers Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Discount Vouchers
              </CardTitle>
              <CardDescription>Apply vouchers to get discounts on your order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Vouchers */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Product Vouchers
                </h4>

                {/* Available vouchers from sellers */}
                {availableVouchers.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Available vouchers from your cart sellers:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableVouchers
                        .filter(voucher => {
                          // Filter vouchers that are applicable to current cart
                          const sellerIds = [...new Set(cartItems.map(item => item.product.sellerId))];
                          return sellerIds.includes(voucher.createdById);
                        })
                        .slice(0, 4)
                        .map(voucher => (
                          <div key={voucher.id} className="p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-mono font-bold text-sm">{voucher.code}</p>
                                <p className="text-xs text-gray-600">{voucher.name}</p>
                                <p className="text-sm font-semibold text-green-600">
                                  {voucher.discountType === 'PERCENTAGE' 
                                    ? `${voucher.discountValue}% OFF`
                                    : `$${voucher.discountValue} OFF`
                                  }
                                </p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setVoucherCode(voucher.code)}
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Manual voucher input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter voucher code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  />
                  <Button onClick={applyVoucher} disabled={!voucherCode.trim()}>
                    Apply
                  </Button>
                </div>

                {appliedVoucher && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        Voucher {appliedVoucher.code} applied (-${discountAmount.toFixed(2)})
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeVoucher}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Delivery Vouchers */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery Vouchers
                </h4>

                {/* Available delivery vouchers */}
                {availableDeliveryVouchers.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Available delivery vouchers:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableDeliveryVouchers
                        .filter(voucher => voucher.isActive)
                        .slice(0, 4)
                        .map(voucher => (
                          <div key={voucher.id} className="p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-mono font-bold text-sm">{voucher.code}</p>
                                <p className="text-xs text-gray-600">{voucher.name}</p>
                                <p className="text-sm font-semibold text-blue-600">
                                  {voucher.discountType === 'PERCENTAGE' 
                                    ? `${voucher.discountValue}% OFF`
                                    : voucher.discountType === 'FREE_SHIPPING'
                                    ? 'FREE SHIPPING'
                                    : `$${voucher.discountValue} OFF`
                                  }
                                </p>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setDeliveryVoucherCode(voucher.code)}
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Manual delivery voucher input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter delivery voucher code"
                    value={deliveryVoucherCode}
                    onChange={(e) => setDeliveryVoucherCode(e.target.value.toUpperCase())}
                  />
                  <Button onClick={applyDeliveryVoucher} disabled={!deliveryVoucherCode.trim()}>
                    Apply
                  </Button>
                </div>

                {appliedDeliveryVoucher && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">
                        Delivery voucher {appliedDeliveryVoucher.code} applied (-${deliveryDiscountAmount.toFixed(2)})
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeDeliveryVoucher}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveryFees.map((fee) => (
                  <div key={fee.id} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={`delivery-${fee.id}`}
                      name="delivery"
                      checked={selectedDeliveryFee?.id === fee.id}
                      onChange={() => setSelectedDeliveryFee(fee)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Label htmlFor={`delivery-${fee.id}`} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{fee.name}</p>
                          {fee.description && (
                            <p className="text-sm text-gray-600">{fee.description}</p>
                          )}
                          {fee.zones.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {fee.zones.map((zone: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {zone}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${fee.amount.toFixed(2)}</p>
                          {fee.isDefault && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Delivery Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Delivery Address</span>
                </Label>
                <Textarea
                  id="address"
                  // value={deliveryAddress}
                  // onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your full delivery address..."
                  rows={3}
                  required
                />
              </div>

              {/* Delivery Agent */}
              <div className="space-y-2">
                <Label htmlFor="agent" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Delivery Agent</span>
                </Label>
                <Select disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select delivery agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent1">Agent 1</SelectItem>
                    <SelectItem value="agent2">Agent 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment" className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Payment Method</span>
                </Label>
                <Select value={paymentDetails.method} onValueChange={(value) => setPaymentDetails({ ...paymentDetails, method: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MPESA">M-Pesa</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Phone */}
              {paymentDetails.method === 'MPESA' && (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>M-Pesa Phone Number</span>
                  </Label>
                  <Input
                    id="phone"
                    placeholder="Enter your M-Pesa phone number"
                    value={paymentDetails.phone}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, phone: e.target.value })}
                    required
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Additional Notes</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes for the order"
                  value={paymentDetails.notes}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <Button onClick={handlePlaceOrder} disabled={isLoading} className="w-full">
                {isLoading ? 'Placing Order...' : 'Place Order'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}