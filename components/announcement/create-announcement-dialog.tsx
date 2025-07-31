'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { AnnouncementType, ANNOUNCEMENT_TYPES } from '@/types/announcement';
import { UserRole } from '@prisma/client';

interface CreateAnnouncementDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const USER_ROLES = [
  'CUSTOMER',
  'SELLER', 
  'COMPANY',
  'DELIVERY_AGENT'
] as const;

export default function CreateAnnouncementDialog({
  open,
  onClose,
  onSuccess
}: CreateAnnouncementDialogProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'GENERAL' as AnnouncementType,
    productId: '',
    targetRoles: [] as string[],
    isGlobal: false,
    publishAt: null as Date | null,
    expiresAt: null as Date | null,
    imageUrl: '',
    attachmentUrl: ''
  });

  const isAdmin = user?.role === 'ADMIN';

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchUserProducts = async () => {
      try {
        const response = await fetch('/api/products?limit=50&sellerId=' + user?.id);
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    if (open && user) {
      fetchUserProducts();
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        publishAt: formData.publishAt?.toISOString(),
        expiresAt: formData.expiresAt?.toISOString(),
        productId: formData.productId || undefined
      };

      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        onSuccess();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create announcement');
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'GENERAL',
      productId: '',
      targetRoles: [],
      isGlobal: false,
      publishAt: null,
      expiresAt: null,
      imageUrl: '',
      attachmentUrl: ''
    });
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter(r => r !== role)
        : [...prev.targetRoles, role]
    }));
  };

  const handleFileUpload = async (file: File, type: 'image' | 'attachment') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          [type === 'image' ? 'imageUrl' : 'attachmentUrl']: data.url
        }));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter announcement title"
              required
            />
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="type">Type *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as AnnouncementType }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ANNOUNCEMENT_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center space-x-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Write your announcement content..."
              rows={6}
              required
            />
          </div>

          {/* Product Association */}
          {products.length > 0 && (
            <div>
              <Label htmlFor="product">Related Product (Optional)</Label>
              <Select value={formData.productId} onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No product</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target Audience */}
          <div>
            <Label>Target Audience</Label>
            <div className="space-y-3">
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isGlobal"
                    checked={formData.isGlobal}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isGlobal: checked as boolean }))}
                  />
                  <Label htmlFor="isGlobal">Global announcement (visible to all users)</Label>
                </div>
              )}

              {!formData.isGlobal && (
                <div>
                  <Label className="text-sm text-gray-600">Select target roles:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {USER_ROLES.map((role) => (
                      <Badge
                        key={role}
                        variant={formData.targetRoles.includes(role) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleRoleToggle(role)}
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Publish At (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.publishAt ? format(formData.publishAt, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.publishAt || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, publishAt: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Expires At (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiresAt ? format(formData.expiresAt, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.expiresAt || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, expiresAt: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <Label>Image (Optional)</Label>
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'image');
                }}
              />
              {formData.imageUrl && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm text-green-700">Image uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Attachment Upload */}
          <div>
            <Label>Attachment (Optional)</Label>
            <div className="space-y-2">
              <Input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'attachment');
                }}
              />
              {formData.attachmentUrl && (
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm text-green-700">Attachment uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, attachmentUrl: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Announcement'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
