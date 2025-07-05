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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Ticket, 
  Plus, 
  Calendar, 
  Users,
  Package,
  Percent,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

export default function CompanyVouchers() {
  const [user, setUser] = useState<any>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    validFrom: '',
    validUntil: '',
    maxUses: '',
    applicableRoles: ['CUSTOMER'],
    applicableProductTypes: ['CHICKEN_FEED', 'CHICKS', 'HATCHING_EGGS']
  });
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'COMPANY') {
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
    }
  }, [user]);

  const fetchVouchers = async () => {
    try {
      const response = await fetch('/api/vouchers');
      if (response.ok) {
        const data = await response.json();
        setVouchers(data.vouchers);
      }
    } catch (error) {
      console.error('Failed to fetch vouchers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Voucher created successfully!');
        setShowForm(false);
        setFormData({
          code: '',
          name: '',
          description: '',
          discountType: 'PERCENTAGE',
          discountValue: '',
          minOrderAmount: '',
          maxDiscountAmount: '',
          validFrom: '',
          validUntil: '',
          maxUses: '',
          applicableRoles: ['CUSTOMER'],
          applicableProductTypes: ['CHICKEN_FEED', 'CHICKS', 'HATCHING_EGGS']
        });
        fetchVouchers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create voucher');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        applicableRoles: [...formData.applicableRoles, role]
      });
    } else {
      setFormData({
        ...formData,
        applicableRoles: formData.applicableRoles.filter(r => r !== role)
      });
    }
  };

  const handleProductTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        applicableProductTypes: [...formData.applicableProductTypes, type]
      });
    } else {
      setFormData({
        ...formData,
        applicableProductTypes: formData.applicableProductTypes.filter(t => t !== type)
      });
    }
  };

  const getVoucherStatus = (voucher: any) => {
    const now = new Date();
    const validFrom = new Date(voucher.validFrom);
    const validUntil = new Date(voucher.validUntil);

    if (!voucher.isActive) return { status: 'Inactive', color: 'bg-gray-100 text-gray-800' };
    if (now < validFrom) return { status: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
    if (now > validUntil) return { status: 'Expired', color: 'bg-red-100 text-red-800' };
    if (voucher.usedCount >= voucher.maxUses) return { status: 'Used Up', color: 'bg-orange-100 text-orange-800' };
    return { status: 'Active', color: 'bg-green-100 text-green-800' };
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Vouchers</h1>
            <p className="text-gray-600 mt-2">Create and manage discount vouchers for your company products</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Voucher
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Create Company Voucher</DialogTitle>
                <DialogDescription>
                  Create a discount voucher for your company products
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Voucher Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="COMPANY20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Voucher Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Company Special Discount"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Special discount on company products"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount Type</Label>
                    <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value })}>
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

                  <div className="space-y-2">
                    <Label htmlFor="discountValue">
                      {formData.discountType === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount ($)'}
                    </Label>
                    <Input
                      id="discountValue"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxUses">Max Uses</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min="1"
                      value={formData.maxUses}
                      onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                      placeholder="500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minOrderAmount">Minimum Order Amount ($)</Label>
                    <Input
                      id="minOrderAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxDiscountAmount">Max Discount Amount ($)</Label>
                    <Input
                      id="maxDiscountAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maxDiscountAmount}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="validFrom">Valid From</Label>
                    <Input
                      id="validFrom"
                      type="datetime-local"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Valid Until</Label>
                    <Input
                      id="validUntil"
                      type="datetime-local"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Applicable Roles */}
                <div className="space-y-3">
                  <Label>Applicable User Roles</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['CUSTOMER', 'SELLER', 'COMPANY', 'STAKEHOLDER'].map((role) => (
                      <div key={role} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={formData.applicableRoles.includes(role)}
                          onCheckedChange={(checked) => handleRoleChange(role, checked as boolean)}
                        />
                        <Label htmlFor={`role-${role}`} className="text-sm">
                          {role.charAt(0) + role.slice(1).toLowerCase()}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Applicable Product Types */}
                <div className="space-y-3">
                  <Label>Applicable Product Types</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['CHICKEN_FEED', 'CHICKS', 'HATCHING_EGGS', 'EGGS', 'CHICKEN_MEAT'].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={formData.applicableProductTypes.includes(type)}
                          onCheckedChange={(checked) => handleProductTypeChange(type, checked as boolean)}
                        />
                        <Label htmlFor={`type-${type}`} className="text-sm">
                          {type.replace('_', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Creating...' : 'Create Voucher'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Vouchers List */}
        <Card>
          <CardHeader>
            <CardTitle>Company Vouchers</CardTitle>
            <CardDescription>Manage your company discount vouchers and track their performance</CardDescription>
          </CardHeader>
          <CardContent>
            {vouchers.length === 0 ? (
              <div className="text-center py-8">
                <Ticket className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No vouchers yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create your first company voucher to offer discounts on your products.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vouchers.map((voucher) => {
                  const status = getVoucherStatus(voucher);
                  return (
                    <Card key={voucher.id} className="overflow-hidden">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{voucher.name || voucher.code}</CardTitle>
                            <CardDescription className="font-mono text-lg font-bold">
                              {voucher.code}
                            </CardDescription>
                          </div>
                          <Badge className={status.color}>
                            {status.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          {/* Discount Info */}
                          <div className="flex items-center space-x-2">
                            {voucher.discountType === 'PERCENTAGE' ? (
                              <Percent className="h-5 w-5 text-green-600" />
                            ) : (
                              <DollarSign className="h-5 w-5 text-green-600" />
                            )}
                            <span className="text-2xl font-bold text-green-600">
                              {voucher.discountType === 'PERCENTAGE' 
                                ? `${voucher.discountValue}%` 
                                : `$${voucher.discountValue}`}
                            </span>
                            <span className="text-sm text-gray-500">
                              {voucher.discountType === 'FREE_SHIPPING' ? 'Free Shipping' : 'OFF'}
                            </span>
                          </div>

                          {/* Description */}
                          {voucher.description && (
                            <p className="text-sm text-gray-600">{voucher.description}</p>
                          )}

                          {/* Usage Stats */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Used:</span>
                              <span>{voucher.usedCount} / {voucher.maxUses}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${(voucher.usedCount / voucher.maxUses) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Restrictions */}
                          <div className="space-y-1">
                            {voucher.applicableRoles.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  For: {voucher.applicableRoles.join(', ')}
                                </span>
                              </div>
                            )}
                            {voucher.applicableProductTypes.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Package className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  Products: {voucher.applicableProductTypes.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Validity */}
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Valid from: {new Date(voucher.validFrom).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Valid until: {new Date(voucher.validUntil).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Min Order */}
                          {voucher.minOrderAmount > 0 && (
                            <div className="text-xs text-gray-500">
                              Min order: ${voucher.minOrderAmount}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Settings className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className={voucher.isActive ? 'text-red-600' : 'text-green-600'}
                            >
                              {voucher.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}