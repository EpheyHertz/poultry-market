'use client'

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
  Package,
  AlertCircle,
  CheckCircle,
  Ticket,
  Truck,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  type: string;
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
  slug: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function CheckoutPage() {
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState({
    page: true,
    checkout: false,
    vouchers: false,
    validating: false
  });
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
    phone: '',
    reference: '',
    details: ''
  });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

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

  useEffect(() => {
    if (!user) return;

    const fetchAndValidateCartItems = async () => {
      const itemsParam = searchParams?.get('items');
      if (!itemsParam) {
        router.push('/customer/products');
        return;
      }

      try {
        setIsLoading(prev => ({ ...prev, validating: true }));
        const parsedItems = JSON.parse(decodeURIComponent(itemsParam));
        
        // Validate each product by refetching from the server
        const validatedItems = await Promise.all(
          parsedItems.map(async (item: any) => {
            try {
              const response = await fetch(`/api/products/${item.id}`);
              if (!response.ok) throw new Error('Product not found');
              
              const serverProduct = await response.json();
              
              // Compare critical fields
              if (
                serverProduct.price !== item.price ||
                serverProduct.sellerId !== item.sellerId ||
                serverProduct.isActive !== true
              ) {
                throw new Error('Product details have changed');
              }

              return {
                product: serverProduct,
                quantity: item.quantity
              };
            } catch (error) {
              console.error(`Validation failed for product ${item.id}:`, error);
              toast.error(`Product "${item.name}" is no longer available or has changed`);
              return null;
            }
          })
        );

        // Filter out any invalid items
        const validItems = validatedItems.filter(item => item !== null);
        
        if (validItems.length === 0) {
          toast.error('No valid items in your cart');
          router.push('/customer/products');
          return;
        }

        setCartItems(validItems);
      } catch (error) {
        console.error('Failed to parse or validate cart items:', error);
        toast.error('Invalid cart data');
        router.push('/customer/products');
      } finally {
        setIsLoading(prev => ({ ...prev, validating: false }));
      }
    };

    fetchAndValidateCartItems();
  }, [searchParams, router, user]);

  useEffect(() => {
    if (!user || cartItems.length === 0) return;

    const fetchAdditionalData = async () => {
      setIsLoading(prev => ({ ...prev, page: true }));
      try {
        const [vouchersResponse, deliveryVouchersResponse, deliveryFeesResponse] = 
          await Promise.all([
            fetch('/api/vouchers?active=true'),
            fetch('/api/delivery-vouchers'),
            fetch('/api/delivery-fees')
          ]);

        if (!vouchersResponse.ok) throw new Error('Failed to load vouchers');
        if (!deliveryVouchersResponse.ok) throw new Error('Failed to load delivery vouchers');
        if (!deliveryFeesResponse.ok) throw new Error('Failed to load delivery fees');

        const vouchersData = await vouchersResponse.json();
        const deliveryVouchersData = await deliveryVouchersResponse.json();
        const deliveryFeesData = await deliveryFeesResponse.json();

        setAvailableVouchers(vouchersData.vouchers || []);
        setAvailableDeliveryVouchers(deliveryVouchersData || []);
        setDeliveryFees(deliveryFeesData || []);

        // Set default delivery fee
        const defaultFee = deliveryFeesData.find((fee: any) => fee.isDefault) || deliveryFeesData[0];
        setSelectedDeliveryFee(defaultFee);
      } catch (error) {
        console.error('Data loading error:', error);
        toast.error('Failed to load some data. Please refresh.');
      } finally {
        setIsLoading(prev => ({ ...prev, page: false }));
      }
    };

    fetchAdditionalData();
  }, [user, cartItems]);


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
    return product?.price;
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const price = calculateItemPrice(item.product);
    return sum + (price * item.quantity);
  }, 0);

  const deliveryFee = selectedDeliveryFee ? selectedDeliveryFee.amount : 0;
  const finalDeliveryFee = Math.max(0, deliveryFee - deliveryDiscountAmount);
  const total = Math.max(0, subtotal - discountAmount + finalDeliveryFee);

  const applyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error('Please enter a voucher code');
      return;
    }

    setIsLoading(prev => ({ ...prev, vouchers: true }));
    try {
      const productTypes = Array.from(new Set(cartItems.map(item => item.product.type)));
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
    } finally {
      setIsLoading(prev => ({ ...prev, vouchers: false }));
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

    setIsLoading(prev => ({ ...prev, vouchers: true }));
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
        toast.error(`Minimum order amount for this voucher is Ksh ${voucher.minOrderAmount}`);
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
    } finally {
      setIsLoading(prev => ({ ...prev, vouchers: false }));
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
    
    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }

    if (!paymentDetails.phone.trim()) {
      toast.error('Please enter your M-Pesa phone number');
      return;
    }

    if (!paymentDetails.reference.trim()) {
      toast.error('Please enter the M-Pesa transaction code');
      return;
    }

    setIsLoading(prev => ({ ...prev, checkout: true }));

    try {
      const orderPayload = {
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: calculateItemPrice(item.product)
        })),
        total,
        subtotal,
        discountAmount,
        voucherCode: appliedVoucher?.code || null,
        deliveryFee: finalDeliveryFee,
        deliveryVoucherCode: appliedDeliveryVoucher?.code || null,
        deliveryAddress,
        paymentType:"BEFORE_DELIVERY",
        paymentPhone: paymentDetails.phone,
        paymentReference: paymentDetails.reference,
        paymentDetails: paymentDetails.details,
      
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (response.ok) {
        const order = await response.json();
        toast.success('Order placed successfully!');
        router.push(`/customer/orders`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order placement error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setIsLoading(prev => ({ ...prev, checkout: false }));
    }
  };

if (isLoading.page || isLoading.validating || !user) {
    return (
      <DashboardLayout user={user}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          {isLoading.validating && (
            <p className="ml-4">Validating your cart items...</p>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-8">
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
                {cartItems.map((item, index) => {
                  const price = calculateItemPrice(item.product);
                  const hasActiveDiscount = item?.product?.hasDiscount && 
                    item?.product?.discountStartDate && 
                    item?.product?.discountEndDate &&
                    new Date(item?.product?.discountStartDate) <= new Date() && 
                    new Date(item?.product?.discountEndDate) >= new Date();

                  return (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item?.product?.name}</h4>
                        <p className="text-sm text-gray-500">
                          Ksh {price.toFixed(2)} x {item?.quantity}
                          {hasActiveDiscount && (
                            <span className="ml-2 text-green-600">
                              (Discounted from Ksh {item?.product?.price.toFixed(2)})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Sold by: {item?.product?.seller?.name}
                        </p>
                      </div>
                      <span className="font-medium">
                        Ksh {(price * item?.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Ksh {subtotal.toFixed(2)}</span>
                  </div>

                  {appliedVoucher && discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Voucher Discount ({appliedVoucher.code}):</span>
                      <span>-Ksh {discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {selectedDeliveryFee && (
                    <div className="flex justify-between">
                      <span>Delivery Fee ({selectedDeliveryFee.name}):</span>
                      <span>Ksh {deliveryFee.toFixed(2)}</span>
                    </div>
                  )}

                  {appliedDeliveryVoucher && deliveryDiscountAmount > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Delivery Discount ({appliedDeliveryVoucher.code}):</span>
                      <span>-Ksh {deliveryDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>Ksh {total.toFixed(2)}</span>
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

                {availableVouchers.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Available vouchers from your cart sellers:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableVouchers
                        .filter(voucher => {
                          const sellerIds = Array.from(new Set(cartItems.map(item => item?.product?.sellerId)));
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
                                    : `Ksh ${voucher.discountValue} OFF`
                                  }
                                </p>
                                {voucher.minOrderAmount > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Min. order: Ksh {voucher.minOrderAmount}
                                  </p>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setVoucherCode(voucher.code)}
                                disabled={isLoading.vouchers}
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter voucher code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    disabled={isLoading.vouchers}
                  />
                  <Button 
                    onClick={applyVoucher} 
                    disabled={!voucherCode.trim() || isLoading.vouchers}
                  >
                    Apply
                  </Button>
                </div>

                {appliedVoucher && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        Voucher {appliedVoucher.code} applied (-Ksh {discountAmount.toFixed(2)})
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={removeVoucher}
                      disabled={isLoading.vouchers}
                    >
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
                                    : `Ksh ${voucher.discountValue} OFF`
                                  }
                                </p>
                                {voucher.minOrderAmount > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Min. order: Ksh {voucher.minOrderAmount}
                                  </p>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setDeliveryVoucherCode(voucher.code)}
                                disabled={isLoading.vouchers}
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter delivery voucher code"
                    value={deliveryVoucherCode}
                    onChange={(e) => setDeliveryVoucherCode(e.target.value.toUpperCase())}
                    disabled={isLoading.vouchers}
                  />
                  <Button 
                    onClick={applyDeliveryVoucher} 
                    disabled={!deliveryVoucherCode.trim() || isLoading.vouchers}
                  >
                    Apply
                  </Button>
                </div>

                {appliedDeliveryVoucher && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">
                        Delivery voucher {appliedDeliveryVoucher.code} applied (-Ksh {deliveryDiscountAmount.toFixed(2)})
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={removeDeliveryVoucher}
                      disabled={isLoading.vouchers}
                    >
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
                      disabled={isLoading.checkout}
                    />
                    <Label htmlFor={`delivery-${fee.id}`} className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{fee.name}</p>
                          {fee.description && (
                            <p className="text-sm text-gray-600">{fee.description}</p>
                          )}
                          {fee.zones?.length > 0 && (
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
                          <p className="font-bold">Ksh {fee.amount.toFixed(2)}</p>
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
            <CardContent className="space-y-4">
              {/* Delivery Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Delivery Address</span>
                </Label>
                <Textarea
                  id="address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your full delivery address..."
                  rows={3}
                  required
                  disabled={isLoading.checkout}
                />
              </div>

              {/* Payment Method - Only M-Pesa */}
              <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Payment Method</span>
              </Label>
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                <div className="bg-blue-100 p-2 rounded-full">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium">M-Pesa</span>
                <Badge variant="secondary" className="ml-auto">
                  Mobile Money
                </Badge>
              </div>
            </div>

            {/* M-Pesa Payment Instructions */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">How to pay via M-Pesa Till</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Open your M-Pesa app</li>
                      <li>Select <strong>Lipa na M-Pesa</strong></li>
                      <li>Select <strong>Pay Bill</strong></li>
                      <li>Enter Till Number: <strong>123456</strong></li>
                      <li>Enter Amount: <strong>Ksh {total.toFixed(2)}</strong></li>
                      <li>Enter your M-Pesa PIN and confirm payment</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* M-Pesa Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>M-Pesa Phone Number</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g. 254712345678"
              value={paymentDetails.phone}
              onChange={(e) => setPaymentDetails({ ...paymentDetails, phone: e.target.value })}
              required
              disabled={isLoading.checkout}
            />
            <p className="text-xs text-gray-500">
              The phone number you used to make the payment
            </p>
          </div>

          {/* M-Pesa Transaction Code */}
          <div className="space-y-2">
            <Label htmlFor="reference" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>M-Pesa Transaction Code</span>
            </Label>
            <Input
              id="reference"
              type="text"
              placeholder="e.g. OLA12H3K4L"
              value={paymentDetails.reference}
              onChange={(e) => setPaymentDetails({ ...paymentDetails, reference: e.target.value })}
              required
              disabled={isLoading.checkout}
            />
            <p className="text-xs text-gray-500">
              The transaction code from your M-Pesa payment confirmation message
            </p>
          </div>

          {/* M-Pesa Payment Details */}
          <div className="space-y-2">
            <Label htmlFor="details" className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>M-Pesa Payment Message (Optional)</span>
            </Label>
            <Textarea
              id="details"
              placeholder="Paste the full M-Pesa confirmation message here..."
              value={paymentDetails.details}
              onChange={(e) => setPaymentDetails({ ...paymentDetails, details: e.target.value })}
              rows={3}
              disabled={isLoading.checkout}
            />
            <p className="text-xs text-gray-500">
              Helps us verify your payment faster
            </p>
          </div>

          {/* Place Order Button */}
          <Button 
            onClick={handlePlaceOrder} 
            disabled={isLoading.checkout || !deliveryAddress || !paymentDetails.phone || !paymentDetails.reference}
            className="w-full mt-4"
            size="lg"
          >
            {isLoading.checkout ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Order...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Complete Order
              </span>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center mt-2">
            By placing your order, you agree to our Terms of Service
          </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}