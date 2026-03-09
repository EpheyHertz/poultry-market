'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Package,
  TrendingUp,
  DollarSign,
  BarChart3,
  Receipt,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// Types
interface POSProduct {
  id: string;
  name: string;
  price: number;
  effectivePrice: number;
  stock: number;
  type: string;
  image: string | null;
  hasDiscount: boolean;
  categories: Array<{ category: { name: string; slug: string } }>;
}

interface CartItem {
  product: POSProduct;
  quantity: number;
  discount: number;
}

interface DashboardMetrics {
  today: { salesCount: number; revenue: number; averageOrderValue: number };
  week: { salesCount: number; revenue: number };
  month: { salesCount: number; revenue: number };
  topProducts: Array<{ productName: string; quantitySold: number; revenue: number }>;
  stockAlerts: Array<{ id: string; name: string; stock: number; image: string | null; alertLevel: string }>;
  recentSales: Array<{
    id: string;
    receiptNumber: string;
    total: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
    items: Array<{ productName: string; quantity: number; total: number }>;
  }>;
  salesByPaymentMethod: Array<{ method: string; count: number; total: number }>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function POSPage() {
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  
  // State
  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'MPESA' | 'CARD'>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleDiscount, setSaleDiscount] = useState(0);
  const [lastReceipt, setLastReceipt] = useState<string>('');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Fetch products
  const fetchProducts = useCallback(async (search = '') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ search, inStock: 'true', limit: '100' });
      const res = await fetch(`/api/pos/products?${params}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data.products);
    } catch {
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch dashboard metrics
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch('/api/pos/dashboard');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      setMetrics(data);
    } catch {
      console.error('Failed to load metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchMetrics();
  }, [fetchProducts, fetchMetrics]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchProducts]);

  // Cart operations
  const addToCart = (product: POSProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast({ title: 'Stock limit', description: `Only ${product.stock} available`, variant: 'destructive' });
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) {
            toast({ title: 'Stock limit', description: `Only ${item.product.stock} available` });
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSaleDiscount(0);
    setCustomerName('');
    setCustomerPhone('');
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.product.effectivePrice * item.quantity, 0);
  const itemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
  const total = subtotal - itemDiscounts - saleDiscount;

  // Process checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'MPESA' && !customerPhone) {
      toast({ title: 'Phone required', description: 'Enter customer phone for M-Pesa payment', variant: 'destructive' });
      return;
    }

    setIsCheckingOut(true);
    try {
      const res = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.effectivePrice,
            discount: item.discount,
          })),
          paymentMethod,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          discountAmount: saleDiscount,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Checkout failed');
      }

      const data = await res.json();
      setLastReceipt(data.receiptNumber);
      setShowCheckout(false);
      setShowReceipt(true);
      clearCart();
      fetchProducts(); // Refresh stock
      fetchMetrics(); // Refresh dashboard

      if (data.stkPush) {
        toast({
          title: 'STK Push Sent',
          description: 'M-Pesa payment prompt sent to customer phone',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Point of Sale</h1>
              <p className="text-muted-foreground">Process walk-in sales</p>
            </div>
            <TabsList>
              <TabsTrigger value="pos" className="gap-2">
                <ShoppingCart className="h-4 w-4" /> POS
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Dashboard
              </TabsTrigger>
            </TabsList>
          </div>

          {/* POS Tab */}
          <TabsContent value="pos" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
              {/* Product Grid */}
              <div className="lg:col-span-2 flex flex-col">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    placeholder="Search products by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <Package className="h-12 w-12 mb-2" />
                      <p>No products found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {products.map((product) => {
                        const inCart = cart.find((item) => item.product.id === product.id);
                        return (
                          <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className={`relative p-3 rounded-lg border text-left transition-all hover:shadow-md ${
                              inCart ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                            } ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={product.stock === 0}
                          >
                            {product.image && (
                              <div className="w-full aspect-square mb-2 rounded-md overflow-hidden bg-muted relative">
                                <Image
                                  src={product.image}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, 150px"
                                />
                              </div>
                            )}
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="font-bold text-sm">{formatCurrency(product.effectivePrice)}</span>
                              <Badge variant={product.stock <= 5 ? 'destructive' : 'secondary'} className="text-xs">
                                {product.stock}
                              </Badge>
                            </div>
                            {product.hasDiscount && product.effectivePrice < product.price && (
                              <span className="text-xs line-through text-muted-foreground">
                                {formatCurrency(product.price)}
                              </span>
                            )}
                            {inCart && (
                              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                {inCart.quantity}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Panel */}
              <div className="flex flex-col border rounded-lg bg-card">
                <div className="p-3 border-b flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Cart ({cart.length})
                  </h2>
                  {cart.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <ShoppingCart className="h-8 w-8 mb-2" />
                      <p className="text-sm">Cart is empty</p>
                      <p className="text-xs">Click products to add them</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-md border">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.effectivePrice)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-bold text-sm w-20 text-right">
                          {formatCurrency(item.product.effectivePrice * item.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Totals & Checkout */}
                {cart.length > 0 && (
                  <div className="border-t p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {(itemDiscounts + saleDiscount) > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Discount</span>
                        <span>-{formatCurrency(itemDiscounts + saleDiscount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    <Button
                      className="w-full mt-2"
                      size="lg"
                      onClick={() => setShowCheckout(true)}
                      disabled={total <= 0}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Checkout
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-0">
            <POSDashboard metrics={metrics} loading={metricsLoading} onRefresh={fetchMetrics} />
          </TabsContent>
        </Tabs>

        {/* Checkout Dialog */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
              <DialogDescription>
                Total: <strong className="text-lg">{formatCurrency(total)}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Payment Method</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { value: 'CASH' as const, label: 'Cash', icon: Banknote },
                    { value: 'MPESA' as const, label: 'M-Pesa', icon: Smartphone },
                    { value: 'CARD' as const, label: 'Card', icon: CreditCard },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                        paymentMethod === value
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'MPESA' && (
                <div>
                  <Label htmlFor="phone">Customer Phone *</Label>
                  <Input
                    id="phone"
                    placeholder="07XX XXX XXX"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">STK Push will be sent to this number</p>
                </div>
              )}

              <div>
                <Label htmlFor="name">Customer Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="Walk-in customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="discount">Sale Discount (KES)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="1"
                  value={saleDiscount}
                  onChange={(e) => setSaleDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>

              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Pay</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCheckout(false)}>
                Cancel
              </Button>
              <Button onClick={handleCheckout} disabled={isCheckingOut}>
                {isCheckingOut && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {paymentMethod === 'MPESA' ? 'Send STK Push' : 'Complete Sale'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Sale Complete
              </DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-2">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="font-mono text-lg font-bold">{lastReceipt}</p>
              <p className="text-muted-foreground text-sm">Receipt number</p>
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={() => { setShowReceipt(false); searchRef.current?.focus(); }}>
                New Sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// --- POS Dashboard Component ---
function POSDashboard({
  metrics,
  loading,
  onRefresh,
}: {
  metrics: DashboardMetrics | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No data available</p>
        <Button variant="outline" className="mt-2" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Today's Sales"
          value={formatCurrency(metrics.today.revenue)}
          subtitle={`${metrics.today.salesCount} transactions`}
          icon={DollarSign}
        />
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(metrics.today.averageOrderValue)}
          subtitle="Per transaction"
          icon={TrendingUp}
        />
        <MetricCard
          title="This Week"
          value={formatCurrency(metrics.week.revenue)}
          subtitle={`${metrics.week.salesCount} sales`}
          icon={BarChart3}
        />
        <MetricCard
          title="This Month"
          value={formatCurrency(metrics.month.revenue)}
          subtitle={`${metrics.month.salesCount} sales`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
            <CardDescription>Best sellers this month</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {metrics.topProducts.slice(0, 5).map((product, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                      <span className="text-sm font-medium truncate max-w-[180px]">{product.productName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">{formatCurrency(product.revenue)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({product.quantitySold} sold)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Stock Alerts
            </CardTitle>
            <CardDescription>Products needing restock</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.stockAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products well stocked</p>
            ) : (
              <div className="space-y-2">
                {metrics.stockAlerts.slice(0, 8).map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <span className="text-sm truncate max-w-[200px]">{product.name}</span>
                    <Badge variant={product.alertLevel === 'out_of_stock' ? 'destructive' : 'outline'}>
                      {product.stock === 0 ? 'Out of Stock' : `${product.stock} left`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Methods</CardTitle>
            <CardDescription>This month breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.salesByPaymentMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {metrics.salesByPaymentMethod.map((method) => (
                  <div key={method.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {method.method === 'CASH' && <Banknote className="h-4 w-4" />}
                      {method.method === 'MPESA' && <Smartphone className="h-4 w-4" />}
                      {method.method === 'CARD' && <CreditCard className="h-4 w-4" />}
                      <span className="text-sm">{method.method}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm">{formatCurrency(method.total)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({method.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sales</CardTitle>
            <CardDescription>Last 10 transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet</p>
            ) : (
              <div className="space-y-2">
                {metrics.recentSales.slice(0, 6).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-1 border-b last:border-0">
                    <div>
                      <p className="font-mono text-xs">{sale.receiptNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleTimeString('en-KE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm">{formatCurrency(sale.total)}</span>
                      <Badge variant="outline" className="ml-1 text-xs">{sale.paymentMethod}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground/30" />
        </div>
      </CardContent>
    </Card>
  );
}
