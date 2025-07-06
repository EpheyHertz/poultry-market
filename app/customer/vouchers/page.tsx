
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Ticket, 
  Search, 
  Calendar, 
  Percent,
  DollarSign,
  Gift,
  Truck,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerVouchers() {
  const [user, setUser] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [deliveryVouchers, setDeliveryVouchers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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
      fetchVouchers();
      fetchDeliveryVouchers();
    }
  }, [user]);

  const fetchVouchers = async () => {
    try {
      const response = await fetch('/api/vouchers?active=true');
      if (response.ok) {
        const data = await response.json();
        setVouchers(data.vouchers);
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
        setDeliveryVouchers(data);
      }
    } catch (error) {
      console.error('Failed to fetch delivery vouchers:', error);
    }
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Voucher code copied to clipboard!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy voucher code');
    }
  };

  const getVoucherStatus = (voucher: any) => {
    const now = new Date();
    const validUntil = new Date(voucher.validUntil || voucher.expiresAt);
    const validFrom = new Date(voucher.validFrom || voucher.createdAt);
    
    if (now > validUntil) {
      return { status: 'Expired', color: 'bg-red-100 text-red-800' };
    }
    
    if (now < validFrom) {
      return { status: 'Upcoming', color: 'bg-yellow-100 text-yellow-800' };
    }
    
    if (voucher.usedCount >= voucher.maxUses) {
      return { status: 'Used Up', color: 'bg-gray-100 text-gray-800' };
    }
    
    return { status: 'Active', color: 'bg-green-100 text-green-800' };
  };

  const filteredVouchers = vouchers.filter(voucher =>
    voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDeliveryVouchers = deliveryVouchers.filter(voucher =>
    voucher.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Available Vouchers</h1>
          <p className="text-gray-600 mt-2">Discover and use discount vouchers from sellers and companies</p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Vouchers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by code, name, or seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {/* Voucher Categories */}
        <Tabs defaultValue="product" className="space-y-6">
          <TabsList>
            <TabsTrigger value="product" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Product Vouchers
            </TabsTrigger>
            <TabsTrigger value="delivery" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivery Vouchers
            </TabsTrigger>
          </TabsList>

          {/* Product Vouchers */}
          <TabsContent value="product">
            <Card>
              <CardHeader>
                <CardTitle>Product Discount Vouchers</CardTitle>
                <CardDescription>Vouchers from sellers and companies for product discounts</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredVouchers.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No vouchers available</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Check back later for new discount vouchers.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVouchers.map((voucher) => {
                      const status = getVoucherStatus(voucher);
                      return (
                        <Card key={voucher.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{voucher.name || voucher.code}</CardTitle>
                                <CardDescription>By {voucher.createdBy.name}</CardDescription>
                              </div>
                              <Badge className={status.color}>
                                {status.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Voucher Code */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <code className="font-mono text-lg font-bold">{voucher.code}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(voucher.code)}
                              >
                                {copiedCode === voucher.code ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            {/* Discount Details */}
                            <div className="flex items-center gap-2">
                              {voucher.discountType === 'PERCENTAGE' ? (
                                <Percent className="h-4 w-4 text-green-600" />
                              ) : (
                                <DollarSign className="h-4 w-4 text-green-600" />
                              )}
                              <span className="text-lg font-semibold text-green-600">
                                {voucher.discountType === 'PERCENTAGE' 
                                  ? `${voucher.discountValue}% OFF`
                                  : `$${voucher.discountValue} OFF`
                                }
                              </span>
                            </div>

                            {/* Description */}
                            {voucher.description && (
                              <p className="text-sm text-gray-600">{voucher.description}</p>
                            )}

                            {/* Restrictions */}
                            <div className="space-y-2 text-xs text-gray-500">
                              {voucher.minOrderAmount > 0 && (
                                <p>Minimum order: ${voucher.minOrderAmount}</p>
                              )}
                              {voucher.maxDiscountAmount && (
                                <p>Max discount: ${voucher.maxDiscountAmount}</p>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Valid until {new Date(voucher.validUntil).toLocaleDateString()}</span>
                              </div>
                              <p>Uses: {voucher.usedCount}/{voucher.maxUses}</p>
                            </div>

                            {/* Product Types */}
                            {voucher.applicableProductTypes.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {voucher.applicableProductTypes.map((type: string) => (
                                  <Badge key={type} variant="outline" className="text-xs">
                                    {type.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Vouchers */}
          <TabsContent value="delivery">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Discount Vouchers</CardTitle>
                <CardDescription>Admin vouchers for delivery fee discounts</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredDeliveryVouchers.length === 0 ? (
                  <div className="text-center py-8">
                    <Truck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No delivery vouchers available</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Check back later for delivery discount vouchers.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDeliveryVouchers.map((voucher) => {
                      const status = getVoucherStatus(voucher);
                      return (
                        <Card key={voucher.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{voucher.name || voucher.code}</CardTitle>
                                <CardDescription>Delivery Discount</CardDescription>
                              </div>
                              <Badge className={status.color}>
                                {status.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Voucher Code */}
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <code className="font-mono text-lg font-bold">{voucher.code}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(voucher.code)}
                              >
                                {copiedCode === voucher.code ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            {/* Discount Details */}
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-blue-600" />
                              <span className="text-lg font-semibold text-blue-600">
                                {voucher.discountType === 'PERCENTAGE' 
                                  ? `${voucher.discountValue}% OFF`
                                  : voucher.discountType === 'FREE_SHIPPING'
                                  ? 'FREE SHIPPING'
                                  : `$${voucher.discountValue} OFF`
                                }
                              </span>
                            </div>

                            {/* Description */}
                            {voucher.description && (
                              <p className="text-sm text-gray-600">{voucher.description}</p>
                            )}

                            {/* Restrictions */}
                            <div className="space-y-2 text-xs text-gray-500">
                              {voucher.minOrderAmount > 0 && (
                                <p>Minimum order: ${voucher.minOrderAmount}</p>
                              )}
                              {voucher.expiresAt && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Valid until {new Date(voucher.expiresAt).toLocaleDateString()}</span>
                                </div>
                              )}
                              <p>Uses: {voucher.usedCount}/{voucher.maxUses}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
