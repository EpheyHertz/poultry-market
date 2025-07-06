
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Truck, 
  Plus, 
  DollarSign,
  Ticket,
  Settings,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDeliveryManagement() {
  const [user, setUser] = useState<any>(null);
  const [deliveryFees, setDeliveryFees] = useState<any[]>([]);
  const [deliveryVouchers, setDeliveryVouchers] = useState<any[]>([]);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  
  const [feeFormData, setFeeFormData] = useState({
    name: '',
    amount: '',
    description: '',
    isDefault: false,
    zones: [''],
    isActive: true
  });

  const [voucherFormData, setVoucherFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderAmount: '',
    maxUses: '',
    expiresAt: '',
    isActive: true
  });

  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'ADMIN') {
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
      fetchDeliveryFees();
      fetchDeliveryVouchers();
    }
  }, [user]);

  const fetchDeliveryFees = async () => {
    try {
      const response = await fetch('/api/delivery-fees');
      if (response.ok) {
        const data = await response.json();
        setDeliveryFees(data);
      }
    } catch (error) {
      console.error('Failed to fetch delivery fees:', error);
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

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = editingFee ? '/api/delivery-fees' : '/api/delivery-fees';
      const method = editingFee ? 'PUT' : 'POST';
      const data = editingFee 
        ? { ...feeFormData, id: editingFee.id }
        : feeFormData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          zones: data.zones.filter(zone => zone.trim() !== '')
        }),
      });

      if (response.ok) {
        toast.success(editingFee ? 'Delivery fee updated successfully!' : 'Delivery fee created successfully!');
        setShowFeeForm(false);
        setEditingFee(null);
        setFeeFormData({
          name: '',
          amount: '',
          description: '',
          isDefault: false,
          zones: [''],
          isActive: true
        });
        fetchDeliveryFees();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save delivery fee');
      }
    } catch (error) {
      toast.error('Failed to save delivery fee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoucherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = editingVoucher ? '/api/delivery-vouchers' : '/api/delivery-vouchers';
      const method = editingVoucher ? 'PUT' : 'POST';
      const data = editingVoucher 
        ? { ...voucherFormData, id: editingVoucher.id }
        : voucherFormData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          discountValue: parseFloat(data.discountValue),
          minOrderAmount: parseFloat(data.minOrderAmount || '0'),
          maxUses: parseInt(data.maxUses),
          expiresAt: data.expiresAt || null
        }),
      });

      if (response.ok) {
        toast.success(editingVoucher ? 'Delivery voucher updated successfully!' : 'Delivery voucher created successfully!');
        setShowVoucherForm(false);
        setEditingVoucher(null);
        setVoucherFormData({
          code: '',
          name: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: '',
          minOrderAmount: '',
          maxUses: '',
          expiresAt: '',
          isActive: true
        });
        fetchDeliveryVouchers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save delivery voucher');
      }
    } catch (error) {
      toast.error('Failed to save delivery voucher');
    } finally {
      setIsLoading(false);
    }
  };

  const editFee = (fee: any) => {
    setEditingFee(fee);
    setFeeFormData({
      name: fee.name,
      amount: fee.amount.toString(),
      description: fee.description || '',
      isDefault: fee.isDefault,
      zones: fee.zones.length > 0 ? fee.zones : [''],
      isActive: fee.isActive
    });
    setShowFeeForm(true);
  };

  const editVoucher = (voucher: any) => {
    setEditingVoucher(voucher);
    setVoucherFormData({
      code: voucher.code,
      name: voucher.name || '',
      description: voucher.description || '',
      discountType: voucher.discountType,
      discountValue: voucher.discountValue.toString(),
      minOrderAmount: voucher.minOrderAmount.toString(),
      maxUses: voucher.maxUses.toString(),
      expiresAt: voucher.expiresAt ? new Date(voucher.expiresAt).toISOString().split('T')[0] : '',
      isActive: voucher.isActive
    });
    setShowVoucherForm(true);
  };

  const addZone = () => {
    setFeeFormData({
      ...feeFormData,
      zones: [...feeFormData.zones, '']
    });
  };

  const updateZone = (index: number, value: string) => {
    const newZones = [...feeFormData.zones];
    newZones[index] = value;
    setFeeFormData({
      ...feeFormData,
      zones: newZones
    });
  };

  const removeZone = (index: number) => {
    setFeeFormData({
      ...feeFormData,
      zones: feeFormData.zones.filter((_, i) => i !== index)
    });
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Management</h1>
          <p className="text-gray-600 mt-2">Manage delivery fees and discount vouchers</p>
        </div>

        {/* Delivery Management Tabs */}
        <Tabs defaultValue="fees" className="space-y-6">
          <TabsList>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Delivery Fees
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Delivery Vouchers
            </TabsTrigger>
          </TabsList>

          {/* Delivery Fees Tab */}
          <TabsContent value="fees">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Delivery Fees</h2>
                <Dialog open={showFeeForm} onOpenChange={setShowFeeForm}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingFee(null);
                      setFeeFormData({
                        name: '',
                        amount: '',
                        description: '',
                        isDefault: false,
                        zones: [''],
                        isActive: true
                      });
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Delivery Fee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingFee ? 'Edit' : 'Add'} Delivery Fee</DialogTitle>
                      <DialogDescription>
                        {editingFee ? 'Update' : 'Create'} delivery fee structure
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleFeeSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fee-name">Fee Name</Label>
                          <Input
                            id="fee-name"
                            value={feeFormData.name}
                            onChange={(e) => setFeeFormData({ ...feeFormData, name: e.target.value })}
                            placeholder="Standard Delivery"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fee-amount">Amount ($)</Label>
                          <Input
                            id="fee-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={feeFormData.amount}
                            onChange={(e) => setFeeFormData({ ...feeFormData, amount: e.target.value })}
                            placeholder="5.00"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fee-description">Description</Label>
                        <Textarea
                          id="fee-description"
                          value={feeFormData.description}
                          onChange={(e) => setFeeFormData({ ...feeFormData, description: e.target.value })}
                          placeholder="Description of delivery fee..."
                        />
                      </div>

                      <div className="space-y-4">
                        <Label>Delivery Zones</Label>
                        {feeFormData.zones.map((zone, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={zone}
                              onChange={(e) => updateZone(index, e.target.value)}
                              placeholder="Zone name (e.g., City Center)"
                            />
                            {feeFormData.zones.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeZone(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="outline" onClick={addZone}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Zone
                        </Button>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-default"
                          checked={feeFormData.isDefault}
                          onCheckedChange={(checked) => setFeeFormData({ ...feeFormData, isDefault: checked })}
                        />
                        <Label htmlFor="is-default">Set as default delivery fee</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="is-active"
                          checked={feeFormData.isActive}
                          onCheckedChange={(checked) => setFeeFormData({ ...feeFormData, isActive: checked })}
                        />
                        <Label htmlFor="is-active">Active</Label>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowFeeForm(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Saving...' : editingFee ? 'Update' : 'Create'} Delivery Fee
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Fee Structure</CardTitle>
                  <CardDescription>Manage delivery fees and zones</CardDescription>
                </CardHeader>
                <CardContent>
                  {deliveryFees.length === 0 ? (
                    <div className="text-center py-8">
                      <Truck className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No delivery fees</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Create your first delivery fee structure.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {deliveryFees.map((fee) => (
                        <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{fee.name}</h3>
                              {fee.isDefault && (
                                <Badge variant="default">Default</Badge>
                              )}
                              <Badge variant={fee.isActive ? "default" : "secondary"}>
                                {fee.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{fee.description}</p>
                            <p className="text-lg font-bold text-green-600 mt-2">${fee.amount}</p>
                            {fee.zones.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {fee.zones.map((zone: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {zone}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => editFee(fee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Delivery Vouchers Tab */}
          <TabsContent value="vouchers">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Delivery Vouchers</h2>
                <Dialog open={showVoucherForm} onOpenChange={setShowVoucherForm}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingVoucher(null);
                      setVoucherFormData({
                        code: '',
                        name: '',
                        description: '',
                        discountType: 'PERCENTAGE',
                        discountValue: '',
                        minOrderAmount: '',
                        maxUses: '',
                        expiresAt: '',
                        isActive: true
                      });
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Delivery Voucher
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingVoucher ? 'Edit' : 'Create'} Delivery Voucher</DialogTitle>
                      <DialogDescription>
                        {editingVoucher ? 'Update' : 'Create'} a discount voucher for delivery fees
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleVoucherSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="voucher-code">Voucher Code</Label>
                          <Input
                            id="voucher-code"
                            value={voucherFormData.code}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, code: e.target.value.toUpperCase() })}
                            placeholder="FREESHIP"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="voucher-name">Voucher Name</Label>
                          <Input
                            id="voucher-name"
                            value={voucherFormData.name}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, name: e.target.value })}
                            placeholder="Free Shipping"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="voucher-description">Description</Label>
                        <Textarea
                          id="voucher-description"
                          value={voucherFormData.description}
                          onChange={(e) => setVoucherFormData({ ...voucherFormData, description: e.target.value })}
                          placeholder="Description of the voucher..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="discount-type">Discount Type</Label>
                          <Select
                            value={voucherFormData.discountType}
                            onValueChange={(value) => setVoucherFormData({ ...voucherFormData, discountType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                              <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                              <SelectItem value="FREE_SHIPPING">Free Shipping</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {voucherFormData.discountType !== 'FREE_SHIPPING' && (
                          <div className="space-y-2">
                            <Label htmlFor="discount-value">
                              Discount Value {voucherFormData.discountType === 'PERCENTAGE' ? '(%)' : '($)'}
                            </Label>
                            <Input
                              id="discount-value"
                              type="number"
                              step="0.01"
                              min="0"
                              value={voucherFormData.discountValue}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, discountValue: e.target.value })}
                              placeholder="10"
                              required
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="min-order">Minimum Order ($)</Label>
                          <Input
                            id="min-order"
                            type="number"
                            step="0.01"
                            min="0"
                            value={voucherFormData.minOrderAmount}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, minOrderAmount: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="max-uses">Maximum Uses</Label>
                          <Input
                            id="max-uses"
                            type="number"
                            min="1"
                            value={voucherFormData.maxUses}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, maxUses: e.target.value })}
                            placeholder="100"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="expires-at">Expiration Date</Label>
                          <Input
                            id="expires-at"
                            type="date"
                            value={voucherFormData.expiresAt}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, expiresAt: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="voucher-active"
                          checked={voucherFormData.isActive}
                          onCheckedChange={(checked) => setVoucherFormData({ ...voucherFormData, isActive: checked })}
                        />
                        <Label htmlFor="voucher-active">Active</Label>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowVoucherForm(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? 'Saving...' : editingVoucher ? 'Update' : 'Create'} Voucher
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Discount Vouchers</CardTitle>
                  <CardDescription>Manage vouchers for delivery fee discounts</CardDescription>
                </CardHeader>
                <CardContent>
                  {deliveryVouchers.length === 0 ? (
                    <div className="text-center py-8">
                      <Ticket className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No delivery vouchers</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Create your first delivery discount voucher.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {deliveryVouchers.map((voucher) => (
                        <Card key={voucher.id} className="overflow-hidden">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">{voucher.name || voucher.code}</CardTitle>
                                <CardDescription className="font-mono text-lg font-bold">
                                  {voucher.code}
                                </CardDescription>
                              </div>
                              <Badge variant={voucher.isActive ? "default" : "secondary"}>
                                {voucher.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
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

                            {voucher.description && (
                              <p className="text-sm text-gray-600">{voucher.description}</p>
                            )}

                            <div className="text-xs text-gray-500 space-y-1">
                              {voucher.minOrderAmount > 0 && (
                                <p>Min order: ${voucher.minOrderAmount}</p>
                              )}
                              <p>Uses: {voucher.usedCount}/{voucher.maxUses}</p>
                              {voucher.expiresAt && (
                                <p>Expires: {new Date(voucher.expiresAt).toLocaleDateString()}</p>
                              )}
                            </div>

                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => editVoucher(voucher)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
