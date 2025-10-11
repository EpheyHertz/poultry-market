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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingCart, 
  CreditCard, 
  MapPin, 
  Package,
  AlertCircle,
  CheckCircle,
  Truck,
  Clock,
  Info,
  DollarSign,
  Ticket,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';
import { Suspense } from 'react';
import axios from 'axios';
import { KENYA_COUNTIES, KENYA_PROVINCES, COUNTY_TO_PROVINCE } from '@/lib/kenya-locations';

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

interface DeliveryOption {
  sellerId: string;
  sellerName: string;
  sellerRole: string;
  items: CartItem[];
  subtotal: number;
  canDeliver: boolean;
  deliveryAvailable: boolean;
  paymentOptions: string[];
  deliveryFee: number;
  freeDeliveryEligible: boolean;
  deliveryMessage: string;
  requiresPlatformDelivery: boolean;
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

function EnhancedCheckoutContent() {
  const [user, setUser] = useState<any>(null);
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSessionMode, setIsSessionMode] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState({
    county: '',
    province: ''
  });
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState('BEFORE_DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<'STK_PUSH' | 'MANUAL'>('STK_PUSH'); // New payment method state
  const [paymentDetails, setPaymentDetails] = useState({
    phone: '',
    reference: '',
    details: ''
  });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isLoading, setIsLoading] = useState({
    page: true,
    deliveryOptions: false,
    checkout: false,
    vouchers: false,
    validating: false,
    stkPush: false,
    paymentCheck: false
  });
  const [step, setStep] = useState(1); // 1: Location, 2: Review Delivery, 3: Payment, 4: Confirm
  
  // Payment status checking states
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<{
    checking: boolean;
    result: any;
    error: string | null;
  }>({
    checking: false,
    result: null,
    error: null
  });
  
  // Voucher and discount states
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [availableDeliveryVouchers, setAvailableDeliveryVouchers] = useState<any[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [appliedDeliveryVoucher, setAppliedDeliveryVoucher] = useState<any>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [deliveryVoucherCode, setDeliveryVoucherCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [deliveryDiscountAmount, setDeliveryDiscountAmount] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Fetch user and validate
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

    const fetchCheckoutData = async () => {
      const sessionId = searchParams?.get('session');
      const itemsParam = searchParams?.get('items');
      
      // Determine if this is session mode or cart mode
      if (sessionId) {
        setIsSessionMode(true);
        await fetchCheckoutSession(sessionId);
      } else if (itemsParam) {
        setIsSessionMode(false);
        await fetchAndValidateCartItems(itemsParam);
      } else {
        toast.error('No checkout data found');
        router.push('/customer/products');
      }
    };

    const fetchCheckoutSession = async (sessionId: string) => {
      try {
        setIsLoading(prev => ({ ...prev, validating: true }));
        const response = await fetch(`/api/checkout/session/${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Session not found or expired');
        }
        
        const session = await response.json();
        
        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
          throw new Error('Session has expired');
        }
        
        // Check if session is already completed
        if (session.isCompleted) {
          throw new Error('Session has already been completed');
        }
        
        setCheckoutSession(session);
        setDeliveryAddress(session.deliveryAddress || '');
        setDeliveryLocation({
          county: session.deliveryCounty || '',
          province: session.deliveryProvince || ''
        });

        // Convert session to cart format for unified processing
        setCartItems([{
          product: session.product,
          quantity: session.quantity
        }]);
        
        // For session mode, skip location and delivery steps if we have the data
        if (session.deliveryCounty) {
          setStep(3); // Go to payment step
        } else {
          setStep(1); // Still need location
        }
      } catch (error) {
        console.error('Session fetch error:', error);
        toast.error(error instanceof Error ? error.message : 'Invalid session');
        router.push('/customer/products');
      } finally {
        setIsLoading(prev => ({ ...prev, validating: false }));
      }
    };

    const fetchAndValidateCartItems = async (itemsParam: string) => {
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
        setIsLoading(prev => ({ ...prev, validating: false, page: false }));
      }
    };

    fetchCheckoutData();
  }, [searchParams, router, user]);

  // Fetch voucher data
  useEffect(() => {
    if (!user || cartItems.length === 0) return;

    const fetchVoucherData = async () => {
      try {
        const [vouchersResponse, deliveryVouchersResponse] = 
          await Promise.all([
            fetch('/api/vouchers?active=true'),
            fetch('/api/delivery-vouchers')
          ]);

        if (vouchersResponse.ok) {
          const vouchersData = await vouchersResponse.json();
          setAvailableVouchers(vouchersData.vouchers || []);
        }

        if (deliveryVouchersResponse.ok) {
          const deliveryVouchersData = await deliveryVouchersResponse.json();
          setAvailableDeliveryVouchers(deliveryVouchersData || []);
        }
      } catch (error) {
        console.error('Failed to load voucher data:', error);
      } finally {
        setIsLoading(prev => ({ ...prev, page: false }));
      }
    };

    fetchVoucherData();
  }, [user, cartItems.length]);

  // Calculate delivery options when location changes (only for cart mode)
  const calculateDeliveryOptions = async () => {
    if (!deliveryLocation.county || cartItems.length === 0) return;

    setIsLoading(prev => ({ ...prev, deliveryOptions: true }));

    try {
      const items = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        sellerId: item.product.sellerId
      }));

      const response = await fetch('/api/checkout/delivery-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          deliveryLocation
        })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate delivery options');
      }

      const data = await response.json();
      setDeliveryOptions(data.deliveryOptions);

      if (!data.canProceedWithOrder) {
        toast.error(data.message);
      } else {
        setStep(2);
      }

    } catch (error) {
      console.error('Error calculating delivery options:', error);
      toast.error('Failed to calculate delivery options');
    } finally {
      setIsLoading(prev => ({ ...prev, deliveryOptions: false }));
    }
  };

  // Handle county selection
  const handleCountyChange = (county: string) => {
    const province = COUNTY_TO_PROVINCE[county];
    setDeliveryLocation({ county, province });
  };

  // Calculate item price with discounts
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

  // Helper rounding function
  const customRound = (value: number) => {
    return value % 1 <= 0.4 ? Math.floor(value) : Math.ceil(value);
  };

  // Calculate totals with voucher discounts
  const subtotal = cartItems.reduce((sum, item) => {
    const price = calculateItemPrice(item.product);
    return sum + (price * item.quantity);
  }, 0);

  const totalDeliveryFee = isSessionMode 
    ? (checkoutSession?.deliveryFee || 0)
    : deliveryOptions.reduce((sum, option) => sum + option.deliveryFee, 0);
  
  const rawFinalDeliveryFee = Math.max(0, totalDeliveryFee - deliveryDiscountAmount);
  const finalDeliveryFee = customRound(rawFinalDeliveryFee);
  
  const rawTotal = Math.max(0, subtotal - discountAmount + finalDeliveryFee);
  const grandTotal = customRound(rawTotal);

  // Voucher application functions
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
        discount = (totalDeliveryFee * voucher.discountValue) / 100;
      } else if (voucher.discountType === 'FIXED_AMOUNT') {
        discount = Math.min(voucher.discountValue, totalDeliveryFee);
      } else if (voucher.discountType === 'FREE_SHIPPING') {
        discount = totalDeliveryFee;
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

  // Check payment status by reference
  const checkPaymentStatus = async () => {
    if (!paymentReference.trim()) {
      toast.error('Please enter a transaction reference');
      return;
    }

    setIsLoading(prev => ({ ...prev, paymentCheck: true }));
    setPaymentStatus(prev => ({ ...prev, checking: true, error: null }));

    try {
      const response = await fetch(`/api/payments/reference/${encodeURIComponent(paymentReference.trim())}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.customerMessage || 'Failed to check payment status');
      }

      const data = await response.json();
      
      setPaymentStatus(prev => ({ 
        ...prev, 
        checking: false, 
        result: data,
        error: null 
      }));

      if (data.isSuccessful) {
        toast.success('Payment verified successfully!');
        // Auto-fill the payment details if payment is successful
        setPaymentDetails(prev => ({ 
          ...prev, 
          reference: paymentReference.trim(),
          phone: data.phone || prev.phone 
        }));
        setPaymentMethod('MANUAL'); // Switch to manual mode since we have a reference
      } else if (data.status === 'PENDING') {
        toast.info('Payment is still pending. Please wait or check again later.');
      } else if (data.status === 'FAILED') {
        toast.error(`Payment failed: ${data.resultDescription || 'Unknown error'}`);
      } else {
        toast.info(`Payment status: ${data.status}`);
      }

    } catch (error) {
      console.error('Payment status check error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to check payment status';
      setPaymentStatus(prev => ({ 
        ...prev, 
        checking: false, 
        error: errorMessage
      }));
      toast.error(errorMessage);
    } finally {
      setIsLoading(prev => ({ ...prev, paymentCheck: false }));
    }
  };

  // Handle Pay Via Link (New STK Push replacement)
  const handleStkPush = async () => {
    if (!paymentDetails.phone) {
      toast.error('Please enter your M-Pesa phone number');
      return;
    }

    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address first');
      return;
    }

    setIsLoading(prev => ({ ...prev, stkPush: true }));

    try {
      // Step 1: Initiate payment via the pay-via-link API
      toast.info('Initiating payment...');
      
      const paymentResponse = await axios.post('/api/payments/pay-via-link', {
        phone: paymentDetails.phone.replace(/\s/g, ''), // Remove spaces
        amount: grandTotal,
        link_slug: 'poultry-market',
      });

      console.log('Payment initiated:', paymentResponse.data);

      // Check if payment was successful
      if (paymentResponse.data.success && paymentResponse.data.data.success) {
        toast.success('Payment completed successfully!');
        
        // Step 2: Create the order with payment confirmed
        let orderPayload;

        if (isSessionMode && checkoutSession) {
          orderPayload = {
            items: [{
              productId: checkoutSession.product.id,
              quantity: checkoutSession.quantity,
              price: calculateItemPrice(checkoutSession.product)
            }],
            total: grandTotal,
            subtotal,
            discountAmount,
            voucherCode: appliedVoucher?.code || null,
            deliveryFee: finalDeliveryFee,
            deliveryVoucherCode: appliedDeliveryVoucher?.code || null,
            deliveryAddress,
            deliveryCounty: deliveryLocation.county,
            deliveryProvince: deliveryLocation.province,
            paymentType: 'MPESA',
            paymentPreference: 'BEFORE_DELIVERY',
            paymentDetails: {
              phone: paymentDetails.phone,
              reference: paymentResponse.data.data?.data?.TransactionReference || 
                        paymentResponse.data.data?.data?.transactionReference ||
                        paymentResponse.data.data?.reference ||
                        `LINK_${Date.now()}`,
              details: 'Payment via Link - Auto Processed',
              method: 'STK_PUSH',
              paymentConfirmed: true
            },
            sessionId: checkoutSession.id,
            paymentConfirmed: true
          };
        } else {
          orderPayload = {
            deliveryOptions,
            deliveryLocation,
            paymentPreference: 'BEFORE_DELIVERY',
            paymentType: 'MPESA',
            paymentDetails: {
              phone: paymentDetails.phone,
              reference: paymentResponse.data.data?.data?.TransactionReference || 
                        paymentResponse.data.data?.data?.transactionReference ||
                        paymentResponse.data.data?.reference ||
                        `LINK_${Date.now()}`,
              details: 'Payment via Link - Auto Processed',
              method: 'STK_PUSH',
              paymentConfirmed: true
            },
            deliveryAddress,
            items: cartItems.map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
              price: calculateItemPrice(item.product)
            })),
            total: grandTotal,
            subtotal,
            discountAmount,
            voucherCode: appliedVoucher?.code || null,
            deliveryFee: finalDeliveryFee,
            deliveryVoucherCode: appliedDeliveryVoucher?.code || null,
            deliveryDiscountAmount,
            paymentConfirmed: true
          };
        }

        // Create the order
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          throw new Error(errorData.error || 'Failed to create order after payment');
        }

        const orderData = await orderResponse.json();

        // Mark session as completed if in session mode
        if (isSessionMode && checkoutSession) {
          await fetch(`/api/checkout/session/${checkoutSession.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isCompleted: true })
          });
        }

        toast.success('Order created successfully!');
        router.push(`/customer/orders/${orderData.order.id}?payment_status=completed`);
        
      } else {
        // Payment failed or pending
        const errorMsg = paymentResponse.data.data?.message || 
                        paymentResponse.data.data?.customerMessage || 
                        paymentResponse.data.error ||
                        'Payment failed';
        toast.error(`Payment failed: ${errorMsg}`);
        
        // Show fallback options
        toast.info('Please try manual payment or contact support');
      }

    } catch (error) {
      console.error('Payment error:', error);
      
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error || 
                        error.response?.data?.customerMessage || 
                        error.response?.data?.message ||
                        error.message;
        toast.error(`Payment failed: ${errorMsg}`);
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to process payment');
      }
      
      // Show fallback option
      toast.info('You can try manual payment using the "Manual M-Pesa" option above');
      
    } finally {
      setIsLoading(prev => ({ ...prev, stkPush: false }));
    }
  };

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }

    if (selectedPaymentType === 'BEFORE_DELIVERY') {
      if (!paymentDetails.phone) {
        toast.error('Please enter your M-Pesa phone number');
        return;
      }
      
      if (paymentMethod === 'MANUAL' && !paymentDetails.reference) {
        toast.error('Please enter the M-Pesa transaction code');
        return;
      }
    }

    setIsLoading(prev => ({ ...prev, checkout: true }));

    try {
      let orderPayload;

      if (isSessionMode && checkoutSession) {
        // Session-based checkout (single product)
        orderPayload = {
          items: [{
            productId: checkoutSession.product.id,
            quantity: checkoutSession.quantity,
            price: calculateItemPrice(checkoutSession.product)
          }],
          total: grandTotal,
          subtotal,
          discountAmount,
          voucherCode: appliedVoucher?.code || null,
          deliveryFee: finalDeliveryFee,
          deliveryVoucherCode: appliedDeliveryVoucher?.code || null,
          deliveryAddress,
          deliveryCounty: deliveryLocation.county,
          deliveryProvince: deliveryLocation.province,
          paymentType: selectedPaymentType === 'BEFORE_DELIVERY' ? 'MPESA' : null,
          paymentDetails: selectedPaymentType === 'BEFORE_DELIVERY' ? {
            phone: paymentDetails.phone,
            reference: paymentMethod === 'MANUAL' ? paymentDetails.reference : null,
            details: paymentDetails.details,
            method: paymentMethod
          } : null,
          sessionId: checkoutSession.id
        };
      } else {
        // Cart-based checkout (multiple products)
        const defaultPaymentMethod = selectedPaymentType === 'AFTER_DELIVERY' ? null : 'MPESA';
        
        orderPayload = {
          deliveryOptions,
          deliveryLocation,
          paymentPreference: selectedPaymentType,
          paymentType: defaultPaymentMethod,
          paymentDetails: selectedPaymentType === 'BEFORE_DELIVERY' ? {
            ...paymentDetails,
            method: paymentMethod
          } : null,
          deliveryAddress,
          items: cartItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            price: calculateItemPrice(item.product)
          })),
          total: grandTotal,
          subtotal,
          discountAmount,
          voucherCode: appliedVoucher?.code || null,
          deliveryFee: finalDeliveryFee,
          deliveryVoucherCode: appliedDeliveryVoucher?.code || null,
          deliveryDiscountAmount
        };
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const data = await response.json();

      // Handle STK Push response
      if (data.stkPush) {
        if (data.stkPush.initiated) {
          toast.success(`STK Push sent to ${paymentDetails.phone}. Please check your phone and complete the payment.`);
          router.push(`/customer/orders/${data.order.id}?payment_status=pending`);
        } else if (data.stkPush.fallbackToManual) {
          // STK Push service unavailable, fallback to manual payment
          toast.error('STK Push service is temporarily unavailable');
          toast.info('Order created - Please pay manually using M-Pesa');
          
          // Show manual payment instructions
          const instructions = data.stkPush.manualPaymentInstructions;
          if (instructions) {
            toast.success(
              `Pay KSH ${instructions.amount} to Paybill ${instructions.paybill}, Account: ${instructions.accountNumber}`,
              { duration: 10000 }
            );
          }
          
          router.push(`/customer/orders/${data.order.id}?payment_status=manual_required&fallback=true`);
        } else if (data.stkPush.error) {
          toast.error(`STK Push failed: ${data.stkPush.error}`);
          toast.info('Order created but payment needs to be completed manually.');
          router.push('/customer/orders');
        }
      } else {
        // Regular order without STK Push
        toast.success(data.message || 'Order placed successfully!');
        router.push('/customer/orders');
      }

      // Mark session as completed if in session mode
      if (isSessionMode && checkoutSession) {
        await fetch(`/api/checkout/session/${checkoutSession.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isCompleted: true })
        });
      }

    } catch (error) {
      console.error('Order creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create order');
    } finally {
      setIsLoading(prev => ({ ...prev, checkout: false }));
    }
  };

  if (isLoading.page || isLoading.validating || !user) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">
              {isLoading.validating ? 'Loading checkout session...' : 'Loading checkout...'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-2">
            {isSessionMode ? 'Complete your secure purchase' : 'Complete your order with enhanced delivery system'}
          </p>
          {checkoutSession && (
            <div className="mt-2 text-sm text-gray-500">
              Session expires: {new Date(checkoutSession.expiresAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center space-x-2 sm:space-x-4 mb-8 overflow-x-auto pb-2">
          {[
            { step: 1, title: 'Delivery Location', icon: MapPin },
            { step: 2, title: 'Review Options', icon: Package },
            { step: 3, title: 'Vouchers & Payment', icon: CreditCard },
            { step: 4, title: 'Confirm', icon: CheckCircle }
          ].map(({ step: stepNum, title, icon: Icon }) => (
            <div key={stepNum} className="flex items-center flex-shrink-0">
              <div className={`flex items-center space-x-1 sm:space-x-2 p-1.5 sm:p-2 rounded-lg ${
                step >= stepNum ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
              }`}>
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium hidden sm:inline">{title}</span>
                <span className="text-xs font-medium sm:hidden">{stepNum}</span>
              </div>
              {stepNum < 4 && <div className="w-4 sm:w-8 h-0.5 bg-gray-200 mx-1 sm:mx-2" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Delivery Location */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Select Delivery Location
                  </CardTitle>
                  <CardDescription>
                    Choose your county to see available delivery options from sellers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="county">Delivery County</Label>
                    <Select value={deliveryLocation.county} onValueChange={handleCountyChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your county" />
                      </SelectTrigger>
                      <SelectContent>
                        {KENYA_COUNTIES.map(county => (
                          <SelectItem key={county} value={county}>
                            {county} ({COUNTY_TO_PROVINCE[county]} Province)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {deliveryLocation.county && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-blue-800 font-medium">
                        Delivering to: {deliveryLocation.county}, {deliveryLocation.province} Province
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={isSessionMode ? () => setStep(3) : calculateDeliveryOptions}
                    disabled={!deliveryLocation.county || isLoading.deliveryOptions}
                    className="w-full"
                  >
                    {isLoading.deliveryOptions ? 'Calculating...' : 
                     isSessionMode ? 'Continue to Payment' : 'Check Delivery Options'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Review Delivery Options (only for cart mode) */}
            {step === 2 && !isSessionMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Delivery Options
                  </CardTitle>
                  <CardDescription>
                    Review delivery options from each seller
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {deliveryOptions.map((option, index) => (
                    <div key={option.sellerId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{option.sellerName}</h3>
                          <Badge variant={option.sellerRole === 'COMPANY' ? 'default' : 'secondary'}>
                            {option.sellerRole}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Subtotal</p>
                          <p className="font-semibold">Ksh {option.subtotal.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Items */}
                        <div className="space-y-2">
                          {option.items.map(item => (
                            <div key={item.product.id} className="flex justify-between text-sm">
                              <span>{item.product.name} x {item.quantity}</span>
                              <span>Ksh {(item.product.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Delivery Info */}
                        <div className="flex items-center space-x-2 text-sm">
                          <Truck className="h-4 w-4" />
                          <span className={option.canDeliver ? 'text-green-600' : 'text-red-600'}>
                            {option.deliveryMessage}
                          </span>
                        </div>

                        {/* Delivery Fee */}
                        <div className="flex justify-between font-medium">
                          <span>Delivery Fee:</span>
                          <span className={option.freeDeliveryEligible ? 'text-green-600' : ''}>
                            {option.deliveryFee === 0 ? 'FREE' : `Ksh ${option.deliveryFee.toFixed(2)}`}
                          </span>
                        </div>

                        {/* Payment Options */}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">Payment Options:</span>
                          {option.paymentOptions.map(paymentType => (
                            <Badge key={paymentType} variant="outline" className="text-xs">
                              {paymentType === 'BEFORE_DELIVERY' ? 'Prepaid' : 'Cash on Delivery'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button onClick={() => setStep(3)} className="flex-1">
                      Continue to Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Vouchers & Payment Details */}
            {step === 3 && (
              <div className="space-y-6">
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

                {/* Payment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment & Delivery Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Payment Type Selection */}
                    <div>
                      <Label>Payment Preference</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div 
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedPaymentType === 'BEFORE_DELIVERY' 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedPaymentType('BEFORE_DELIVERY')}
                        >
                          <div className="flex items-center space-x-3">
                            <CreditCard className="h-5 w-5" />
                            <div>
                              <p className="font-medium">Pay Now (M-Pesa)</p>
                              <p className="text-sm text-gray-600">Secure prepaid payment</p>
                            </div>
                          </div>
                        </div>

                        {(!isSessionMode && deliveryOptions.some(option => option.paymentOptions.includes('AFTER_DELIVERY'))) && (
                          <div 
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedPaymentType === 'AFTER_DELIVERY' 
                                ? 'border-green-500 bg-green-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedPaymentType('AFTER_DELIVERY')}
                          >
                            <div className="flex items-center space-x-3">
                              <DollarSign className="h-5 w-5" />
                              <div>
                                <p className="font-medium">Cash on Delivery</p>
                                <p className="text-sm text-gray-600">Pay when you receive</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Payment Details (for prepaid) */}
                    {selectedPaymentType === 'BEFORE_DELIVERY' && (
                      <div className="space-y-6">
                        <h4 className="font-medium">M-Pesa Payment Method</h4>
                        
                        {/* Payment Method Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div 
                            className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentMethod === 'STK_PUSH' 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setPaymentMethod('STK_PUSH')}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                paymentMethod === 'STK_PUSH' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                              }`}>
                                {paymentMethod === 'STK_PUSH' && (
                                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                )}
                              </div>
                              <div>
                                <h5 className="font-medium text-sm">Pay via Link</h5>
                                <p className="text-xs text-gray-500">Instant payment processing</p>
                              </div>
                            </div>
                          </div>
                          
                          <div 
                            className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentMethod === 'MANUAL' 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setPaymentMethod('MANUAL')}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                paymentMethod === 'MANUAL' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                              }`}>
                                {paymentMethod === 'MANUAL' && (
                                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                )}
                              </div>
                              <div>
                                <h5 className="font-medium text-sm">Manual M-Pesa</h5>
                                <p className="text-xs text-gray-500">Enter transaction code</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pay via Link Instructions */}
                        {paymentMethod === 'STK_PUSH' && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-blue-400" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-sm font-medium text-blue-800">Pay via Link Payment</h3>
                                <div className="mt-2 text-sm text-blue-700">
                                  <p>Click &ldquo;Pay Now&rdquo; to process your payment instantly.</p>
                                  <ol className="list-decimal pl-5 space-y-1 mt-2">
                                    <li>Enter your M-Pesa phone number below</li>
                                    <li>Click &ldquo;Pay Now&rdquo; button</li>
                                    <li>Payment will be processed automatically</li>
                                    <li>Complete payment of <strong>Ksh {grandTotal.toFixed(2)}</strong></li>
                                  </ol>
                                  <div className="mt-3 p-2 bg-blue-100 rounded">
                                    <p className="text-xs">
                                      <strong>If payment fails:</strong> Switch to &ldquo;Manual M-Pesa&rdquo; method above and use our{' '}
                                      <a 
                                        href="https://lipia-online.vercel.app/link/poultry-market" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="underline hover:text-blue-800"
                                      >
                                        online payment portal
                                      </a>
                                      {' '}or traditional M-Pesa to complete payment.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Manual Payment Instructions */}
                        {paymentMethod === 'MANUAL' && (
                          <div className="space-y-4">
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                              <div className="flex">
                                <div className="flex-shrink-0">
                                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-yellow-800">Manual M-Pesa Payment Options</h3>
                                  <div className="mt-2 text-sm text-yellow-700">
                                    <p>Choose one of the following payment methods:</p>
                                    
                                    {/* Online Payment Option */}
                                    <div className="mt-4 p-3 bg-white rounded-lg border">
                                      <h4 className="font-semibold text-yellow-800 mb-2">Option 1: Pay Online (Recommended)</h4>
                                      <p className="mb-2">Use our secure online payment portal:</p>
                                      <a 
                                        href="https://lipia-online.vercel.app/link/poultry-market" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                      >
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        Pay Online - Ksh {grandTotal.toFixed(2)}
                                      </a>
                                      <p className="text-xs mt-2">After payment, copy the transaction reference and paste it below.</p>
                                    </div>

                                    {/* Traditional M-Pesa Option */}
                                    <div className="mt-3 p-3 bg-white rounded-lg border">
                                      <h4 className="font-semibold text-yellow-800 mb-2">Option 2: Traditional M-Pesa</h4>
                                      <ol className="list-decimal pl-5 space-y-1">
                                        <li>Open your M-Pesa app</li>
                                        <li>Select <strong>Lipa na M-Pesa</strong> → <strong>Pay Bill</strong></li>
                                        <li>Enter PayBill Number: <strong>200999</strong></li>
                                        <li>Enter Account Number: <strong>0133160030472</strong></li>
                                        <li>Enter Amount: <strong>Ksh {grandTotal.toFixed(2)}</strong></li>
                                        <li>Enter your M-Pesa PIN and confirm</li>
                                        <li>Copy the transaction code from the M-Pesa message</li>
                                      </ol>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Payment Status Checker */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-800 mb-3">Check Payment Status</h4>
                              <p className="text-sm text-blue-700 mb-3">
                                If you have already made a payment, enter the transaction reference to verify it:
                              </p>
                              <div className="flex gap-2">
                                <Input
                                  value={paymentReference}
                                  onChange={(e) => setPaymentReference(e.target.value.toUpperCase())}
                                  placeholder="Enter transaction reference (e.g., QA12BC3DEF)"
                                  className="flex-1 text-base uppercase"
                                  disabled={isLoading.paymentCheck}
                                />
                                <Button
                                  onClick={checkPaymentStatus}
                                  disabled={!paymentReference.trim() || isLoading.paymentCheck}
                                  variant="outline"
                                  size="sm"
                                >
                                  {isLoading.paymentCheck ? 'Checking...' : 'Verify'}
                                </Button>
                              </div>
                              
                              {/* Payment Status Result */}
                              {paymentStatus.result && (
                                <div className={`mt-3 p-3 rounded-lg ${
                                  paymentStatus.result.isSuccessful 
                                    ? 'bg-green-100 border border-green-300' 
                                    : paymentStatus.result.status === 'PENDING'
                                    ? 'bg-yellow-100 border border-yellow-300'
                                    : 'bg-red-100 border border-red-300'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    {paymentStatus.result.isSuccessful ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : paymentStatus.result.status === 'PENDING' ? (
                                      <Clock className="h-4 w-4 text-yellow-600" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-red-600" />
                                    )}
                                    <span className={`text-sm font-medium ${
                                      paymentStatus.result.isSuccessful 
                                        ? 'text-green-800' 
                                        : paymentStatus.result.status === 'PENDING'
                                        ? 'text-yellow-800'
                                        : 'text-red-800'
                                    }`}>
                                      {paymentStatus.result.isSuccessful ? 'Payment Verified!' : 
                                       paymentStatus.result.status === 'PENDING' ? 'Payment Pending' :
                                       'Payment Failed'}
                                    </span>
                                  </div>
                                  {paymentStatus.result.isSuccessful && (
                                    <div className="text-xs text-green-700 mt-1">
                                      Amount: Ksh {paymentStatus.result.amount} | Phone: {paymentStatus.result.phone}
                                      {paymentStatus.result.receipt && (
                                        <span> | Receipt: {paymentStatus.result.receipt}</span>
                                      )}
                                    </div>
                                  )}
                                  {paymentStatus.result.resultDescription && (
                                    <div className="text-xs mt-1">
                                      {paymentStatus.result.resultDescription}
                                    </div>
                                  )}
                                </div>
                              )}

                              {paymentStatus.error && (
                                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-800">Error</span>
                                  </div>
                                  <div className="text-xs text-red-700 mt-1">{paymentStatus.error}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Phone Number Input */}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="paymentPhone">M-Pesa Phone Number *</Label>
                            <Input
                              id="paymentPhone"
                              value={paymentDetails.phone}
                              onChange={(e) => setPaymentDetails(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="0712345678"
                              className="text-base" // Better for mobile
                              required
                            />
                            <p className="text-sm text-gray-500 mt-1">
                              Enter the phone number registered with M-Pesa (e.g., 0712345678)
                            </p>
                          </div>

                          {/* Transaction Code Input (Manual Only) */}
                          {paymentMethod === 'MANUAL' && (
                            <div>
                              <Label htmlFor="paymentReference">M-Pesa Transaction Code *</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="paymentReference"
                                  value={paymentDetails.reference}
                                  onChange={(e) => {
                                    const value = e.target.value.toUpperCase();
                                    setPaymentDetails(prev => ({ ...prev, reference: value }));
                                    setPaymentReference(value); // Sync with payment checker
                                  }}
                                  placeholder="QA12BC3DEF"
                                  className="text-base uppercase flex-1" // Better for mobile
                                  required
                                />
                                {paymentDetails.reference && (
                                  <Button
                                    type="button"
                                    onClick={checkPaymentStatus}
                                    disabled={!paymentDetails.reference.trim() || isLoading.paymentCheck}
                                    variant="outline"
                                    size="sm"
                                  >
                                    {isLoading.paymentCheck ? 'Verifying...' : 'Verify'}
                                  </Button>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                Enter the transaction code from your M-Pesa confirmation message or online payment
                              </p>
                              
                              {/* Verification Status */}
                              {paymentDetails.reference === paymentReference && paymentStatus.result && (
                                <div className={`mt-2 p-2 rounded text-xs ${
                                  paymentStatus.result.isSuccessful 
                                    ? 'bg-green-100 text-green-800 border border-green-300' 
                                    : paymentStatus.result.status === 'PENDING'
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                    : 'bg-red-100 text-red-800 border border-red-300'
                                }`}>
                                  {paymentStatus.result.isSuccessful ? (
                                    <span className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Payment verified successfully!
                                    </span>
                                  ) : paymentStatus.result.status === 'PENDING' ? (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Payment is still processing...
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Payment verification failed
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* STK Push Pay Now Button */}
                          {paymentMethod === 'STK_PUSH' && paymentDetails.phone && deliveryAddress && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                                <div className="flex-1">
                                  <h4 className="font-medium text-green-800">Ready to Pay with STK Push</h4>
                                  <p className="text-sm text-green-600 mt-1">
                                    Amount: <strong>Ksh {grandTotal.toFixed(2)}</strong> • Phone: {paymentDetails.phone}
                                  </p>
                                </div>
                                <Button
                                  onClick={handleStkPush}
                                  disabled={isLoading.stkPush || !paymentDetails.phone || !deliveryAddress}
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2.5 text-sm font-medium w-full sm:w-auto"
                                  size="lg"
                                >
                                  {isLoading.stkPush ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                      <span>Sending STK Push...</span>
                                    </>
                                  ) : (
                                    <>
                                      💳 Pay Now - Ksh {grandTotal.toFixed(2)}
                                    </>
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-green-600 mt-2">
                                You&apos;ll receive a push notification on your phone to complete payment
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Additional Details */}
                        <div>
                          <Label htmlFor="paymentDetails">Additional Details (Optional)</Label>
                          <Textarea
                            id="paymentDetails"
                            value={paymentDetails.details}
                            onChange={(e) => setPaymentDetails(prev => ({ ...prev, details: e.target.value }))}
                            placeholder="Any additional payment information..."
                          />
                        </div>
                      </div>
                    )}

                    {/* Delivery Address */}
                    <div>
                      <Label htmlFor="deliveryAddress">Delivery Address</Label>
                      <Textarea
                        id="deliveryAddress"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Enter your full delivery address..."
                        required
                      />
                    </div>

                    <div className="flex space-x-4">
                      <Button variant="outline" onClick={() => setStep(isSessionMode ? 1 : 2)}>
                        Back
                      </Button>
                      <Button onClick={() => setStep(4)} className="flex-1">
                        Review Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 4: Confirm Order */}
            {step === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Confirm Your Order
                  </CardTitle>
                  <CardDescription>
                    Review all details before placing your order
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Order Summary */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Order Summary</h4>
                    {isSessionMode ? (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{checkoutSession?.product.seller.name}</span>
                          <span className="font-medium">Ksh {grandTotal.toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>{checkoutSession?.product.name} x {checkoutSession?.quantity}</span>
                            <span>Ksh {(calculateItemPrice(checkoutSession?.product!) * checkoutSession?.quantity!).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium text-gray-800">
                            <span>Delivery:</span>
                            <span>{totalDeliveryFee === 0 ? 'FREE' : `Ksh ${totalDeliveryFee.toFixed(2)}`}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      deliveryOptions.map(option => (
                        <div key={option.sellerId} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{option.sellerName}</span>
                            <span className="font-medium">Ksh {(option.subtotal + option.deliveryFee).toFixed(2)}</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            {option.items.map(item => (
                              <div key={item.product.id} className="flex justify-between">
                                <span>{item.product.name} x {item.quantity}</span>
                                <span>Ksh {(calculateItemPrice(item.product) * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium text-gray-800">
                              <span>Delivery:</span>
                              <span>{option.deliveryFee === 0 ? 'FREE' : `Ksh ${option.deliveryFee.toFixed(2)}`}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Delivery Info */}
                  <div>
                    <h4 className="font-medium mb-2">Delivery Information</h4>
                    <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                      <p><strong>Location:</strong> {deliveryLocation.county}, {deliveryLocation.province} Province</p>
                      <p><strong>Address:</strong> {deliveryAddress}</p>
                      <p><strong>Payment:</strong> {selectedPaymentType === 'BEFORE_DELIVERY' ? 'Prepaid (M-Pesa)' : 'Cash on Delivery'}</p>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button variant="outline" onClick={() => setStep(3)}>
                      Back
                    </Button>
                    <Button 
                      onClick={handlePlaceOrder} 
                      disabled={isLoading.checkout}
                      className="flex-1"
                    >
                      {isLoading.checkout ? 'Processing...' : 
                       selectedPaymentType === 'BEFORE_DELIVERY' && paymentMethod === 'STK_PUSH' 
                         ? `Place Order (Manual Pay) - Ksh ${grandTotal.toFixed(2)}`
                         : selectedPaymentType === 'BEFORE_DELIVERY' && paymentMethod === 'MANUAL' 
                         ? `Complete Order - Ksh ${grandTotal.toFixed(2)}`
                         : `Place Order - Ksh ${grandTotal.toFixed(2)}`
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    {cartItems.map(item => {
                      const price = calculateItemPrice(item.product);
                      const hasActiveDiscount = item?.product?.hasDiscount && 
                        item?.product?.discountStartDate && 
                        item?.product?.discountEndDate &&
                        new Date(item?.product?.discountStartDate) <= new Date() && 
                        new Date(item?.product?.discountEndDate) >= new Date();

                      return (
                        <div key={item.product.id} className="flex justify-between text-sm">
                          <span>{item.product.name} x {item.quantity}</span>
                          <div className="text-right">
                            <span>Ksh {(price * item.quantity).toFixed(2)}</span>
                            {hasActiveDiscount && (
                              <div className="text-xs text-green-600">
                                (Discounted from Ksh {(item.product.price * item.quantity).toFixed(2)})
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

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

                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span>
                        {totalDeliveryFee === 0 ? 'FREE' : `Ksh ${totalDeliveryFee.toFixed(2)}`}
                      </span>
                    </div>

                    {appliedDeliveryVoucher && deliveryDiscountAmount > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Delivery Discount ({appliedDeliveryVoucher.code}):</span>
                        <span>-Ksh {deliveryDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>Ksh {grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Benefits */}
            {step >= 2 && (isSessionMode || deliveryOptions.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Delivery Benefits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(isSessionMode ? [{ freeDeliveryEligible: totalDeliveryFee === 0 }] : deliveryOptions).some(option => option.freeDeliveryEligible) && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Free delivery available</span>
                    </div>
                  )}
                  {!isSessionMode && deliveryOptions.some(option => option.paymentOptions.includes('AFTER_DELIVERY')) && (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Cash on delivery option</span>
                    </div>
                  )}
                  {!isSessionMode && deliveryOptions.some(option => !option.requiresPlatformDelivery) && (
                    <div className="flex items-center space-x-2 text-purple-600">
                      <Truck className="h-4 w-4" />
                      <span className="text-sm">Seller direct delivery</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function EnhancedCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    }>
      <EnhancedCheckoutContent />
    </Suspense>
  );
}
