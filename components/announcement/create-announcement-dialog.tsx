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
import { 
  CalendarIcon, 
  Upload, 
  X, 
  ImageIcon, 
  FileText, 
  Loader2, 
  CheckCircle, 
  Eye,
  Sparkles,
  Plus,
  Users,
  Clock,
  Target,
  Megaphone
} from 'lucide-react';
import { format } from 'date-fns';
import { AnnouncementType, ANNOUNCEMENT_TYPES } from '@/types/announcement';
import { UserRole } from '@prisma/client';
import Image from 'next/image';

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([]);
  const [imagePreview, setImagePreview] = useState<string>('');

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

      console.log('Submitting announcement data:', submitData);

      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Announcement created successfully:', result);
        onSuccess();
        resetForm();
      } else {
        const error = await response.json();
        console.error('Failed to create announcement:', error);
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
    setImagePreview('');
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
      if (type === 'image') {
        setUploadingImage(true);
        // Create preview immediately
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
      } else {
        setUploadingAttachment(true);
      }

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'announcements'); // Use folder instead of type

      console.log('Uploading file:', file.name, 'Type:', type);

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formDataUpload
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        setFormData(prev => ({
          ...prev,
          [type === 'image' ? 'imageUrl' : 'attachmentUrl']: data.url
        }));

        if (type === 'image') {
          setImagePreview(data.url);
        }
      } else {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(errorData.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      if (type === 'image') {
        setImagePreview('');
      }
    } finally {
      if (type === 'image') {
        setUploadingImage(false);
      } else {
        setUploadingAttachment(false);
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    setImagePreview('');
  };

  const removeAttachment = () => {
    setFormData(prev => ({ ...prev, attachmentUrl: '' }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Professional Header */}
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Megaphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Create Announcement
                </DialogTitle>
                <p className="text-blue-100 mt-1">Craft engaging announcements for your audience</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
              {isAdmin ? 'Admin Panel' : 'Creator Mode'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Title Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <Label htmlFor="title" className="text-lg font-bold text-gray-800 flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                Announcement Title
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Create a compelling and attention-grabbing title..."
                className="text-lg p-4 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200 bg-gray-50/50"
                required
              />
            </div>

            {/* Type Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <Label htmlFor="type" className="text-lg font-bold text-gray-800 flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                Announcement Type
                <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as AnnouncementType }))}>
                <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-purple-500 focus:ring-purple-500 rounded-xl text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ANNOUNCEMENT_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="py-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                          <div className="font-semibold">{config.label}</div>
                          <div className="text-xs text-gray-500">
                            {key === 'URGENT' && 'High priority announcement'}
                            {key === 'GENERAL' && 'Standard announcement'}
                            {key === 'EVENT' && 'Event-related announcement'}
                            {key === 'PROMOTION' && 'Marketing and promotions'}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <Label htmlFor="content" className="text-lg font-bold text-gray-800 flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                Content
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your announcement content here. Be clear, engaging, and informative..."
                rows={6}
                className="text-base p-4 border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 rounded-xl transition-all duration-200 bg-gray-50/50 resize-none"
                required
              />
              <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                <span>Make it engaging and informative</span>
                <span>{formData.content.length}/500</span>
              </div>
            </div>

            {/* Image Upload with Preview */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <Label className="text-lg font-bold text-gray-800 flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                Visual Content
              </Label>
              
              <div className="space-y-4">
                {!imagePreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors">
                    <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload an Image</h3>
                    <p className="text-gray-500 mb-4">Add visual appeal to your announcement</p>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'image');
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingImage}
                      />
                      <Button type="button" variant="outline" className="relative pointer-events-none" disabled={uploadingImage}>
                        {uploadingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Choose Image
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="relative h-64 rounded-xl overflow-hidden border-2 border-gray-200">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={removeImage}
                            className="bg-white text-gray-900 hover:bg-gray-100"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove Image
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Image Ready
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Association */}
            {products.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <Label htmlFor="product" className="text-lg font-bold text-gray-800 flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
                  Related Product
                  <Badge variant="outline" className="text-xs">Optional</Badge>
                </Label>
                <Select value={formData.productId} onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}>
                  <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-yellow-500 focus:ring-yellow-500 rounded-xl">
                    <SelectValue placeholder="Link to a specific product (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">
                      <div className="flex items-center space-x-2">
                        <X className="h-4 w-4 text-gray-400" />
                        <span>No product linked</span>
                      </div>
                    </SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>{product.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Target Audience */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <Label className="text-lg font-bold text-gray-800 flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                <Target className="h-5 w-5" />
                Target Audience
              </Label>
              
              <div className="space-y-6">
                {isAdmin && (
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="isGlobal"
                        checked={formData.isGlobal}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isGlobal: checked as boolean }))}
                        className="border-2 border-indigo-300"
                      />
                      <Label htmlFor="isGlobal" className="font-semibold text-indigo-900 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Global Announcement
                      </Label>
                    </div>
                    <p className="text-sm text-indigo-700 mt-2 ml-7">Visible to all users across the platform</p>
                  </div>
                )}

                {!formData.isGlobal && (
                  <div>
                    <Label className="text-base font-semibold text-gray-700 mb-3 block">Select Target Roles:</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {USER_ROLES.map((role) => (
                        <Button
                          key={role}
                          type="button"
                          variant={formData.targetRoles.includes(role) ? "default" : "outline"}
                          className={`h-auto p-4 flex flex-col items-center space-y-2 transition-all duration-200 ${
                            formData.targetRoles.includes(role) 
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg' 
                              : 'hover:bg-indigo-50 hover:border-indigo-300'
                          }`}
                          onClick={() => handleRoleToggle(role)}
                        >
                          <Users className="h-5 w-5" />
                          <span className="text-sm font-medium">{role.replace('_', ' ')}</span>
                        </Button>
                      ))}
                    </div>
                    {formData.targetRoles.length === 0 && !formData.isGlobal && (
                      <p className="text-amber-600 text-sm mt-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Please select at least one target role
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Scheduling */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <Label className="text-lg font-bold text-gray-800 flex items-center gap-3 mb-6">
                <div className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                <Clock className="h-5 w-5" />
                Scheduling
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </Label>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-700">Publish Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-12 border-2 border-gray-200 hover:border-cyan-400">
                        <CalendarIcon className="mr-3 h-4 w-4" />
                        {formData.publishAt ? format(formData.publishAt, "PPP") : "Schedule publication"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.publishAt || undefined}
                        onSelect={(date) => setFormData(prev => ({ ...prev, publishAt: date || null }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold text-gray-700">Expiry Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-12 border-2 border-gray-200 hover:border-cyan-400">
                        <CalendarIcon className="mr-3 h-4 w-4" />
                        {formData.expiresAt ? format(formData.expiresAt, "PPP") : "Set expiry date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
            </div>

            {/* Attachment Upload */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <Label className="text-lg font-bold text-gray-800 flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-teal-500 to-green-500 rounded-full"></div>
                <FileText className="h-5 w-5" />
                Attachment
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </Label>
              
              <div className="space-y-4">
                {!formData.attachmentUrl ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-teal-400 transition-colors">
                    <div className="mx-auto w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                      <FileText className="h-5 w-5 text-teal-600" />
                    </div>
                    <p className="text-gray-600 mb-3">Upload supporting documents</p>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'attachment');
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploadingAttachment}
                      />
                      <Button type="button" variant="outline" size="sm" className="relative pointer-events-none" disabled={uploadingAttachment}>
                        {uploadingAttachment ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-teal-50 rounded-xl border border-teal-200">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <FileText className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-teal-800">Attachment uploaded successfully</span>
                        <p className="text-xs text-teal-600">Ready to include with announcement</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAttachment}
                      className="text-teal-600 hover:text-teal-800 hover:bg-teal-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Professional Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 z-10">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center space-x-2 text-sm text-gray-500 order-2 sm:order-1">
              <Eye className="h-4 w-4" />
              <span>Preview your announcement before publishing</span>
            </div>
            
            <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-3 order-1 sm:order-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="px-6 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors h-11"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || uploadingImage || uploadingAttachment || !formData.title || !formData.content || (!formData.isGlobal && formData.targetRoles.length === 0)}
                className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11 font-semibold min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Creating Announcement...</span>
                    <span className="sm:hidden">Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Create Announcement</span>
                    <span className="sm:hidden">Create</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
