'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  MoreHorizontal, 
  Search,
  Settings,
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  AlertCircle,
  Mail,
  Download,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Archive,
  Image as ImageIcon,
  Send,
  Star,
  Shield,
  Upload,
  Loader2,
  Save,
  FileImage,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  X
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import CreateAnnouncementDialog from '@/components/announcement/create-announcement-dialog';
import { Announcement, AnnouncementType, AnnouncementStatus, ANNOUNCEMENT_TYPES, ANNOUNCEMENT_STATUSES } from '@/types/announcement';
import { toast } from '@/hooks/use-toast';

export default function AdminAnnouncementsPage() {
  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AnnouncementType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<AnnouncementStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    urgent: 0,
    totalViews: 0,
    totalReactions: 0
  });

  // Check if user is admin
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
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        if (selectedType !== 'all') params.append('type', selectedType);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/announcements?${params}`);
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements);
          
          // Calculate admin stats
          const total = data.announcements.length;
          const published = data.announcements.filter((a: Announcement) => a.status === 'PUBLISHED').length;
          const drafts = data.announcements.filter((a: Announcement) => a.status === 'DRAFT').length;
          const urgent = data.announcements.filter((a: Announcement) => a.type === 'URGENT').length;
          const totalViews = data.announcements.reduce((sum: number, a: Announcement) => sum + a.viewCount, 0);
          const totalReactions = data.announcements.reduce((sum: number, a: Announcement) => {
            return sum + Object.values(a.reactionCounts || {}).reduce((rs: number, rc: number) => rs + rc, 0);
          }, 0);
          
          setStats({ total, published, drafts, urgent, totalViews, totalReactions });
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchAnnouncements();
    }
  }, [selectedType, selectedStatus, isAdmin, searchQuery]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedType !== 'all') params.append('type', selectedType);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`/api/announcements?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/announcements/${id}/edit`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchAnnouncements();
        toast({
          title: "Success",
          description: "Announcement deleted successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to delete announcement",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive"
      });
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowEditDialog(true);
  };

  const handleUpdateAnnouncement = async (updatedData: any) => {
    if (!editingAnnouncement) return;

    try {
      setIsSaving(true);
      
      let finalData = { ...updatedData };

      // Handle image upload if there's a new image
      if (imageFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('folder', 'announcements'); // Use folder instead of upload_preset

        console.log('Uploading image file:', imageFile.name);

        const uploadResponse = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          console.log('Image upload successful:', uploadResult);
          finalData.imageUrl = uploadResult.url; // Use .url instead of .secure_url
        } else {
          const errorData = await uploadResponse.json();
          console.error('Image upload failed:', errorData);
          throw new Error(errorData.error || 'Failed to upload image');
        }
        setIsUploading(false);
      }

      const response = await fetch(`/api/announcements/${editingAnnouncement.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });

      if (response.ok) {
        fetchAnnouncements();
        setShowEditDialog(false);
        setEditingAnnouncement(null);
        setPreviewImage(null);
        setImageFile(null);
        toast({
          title: "Success",
          description: "Announcement updated successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to update announcement",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleStatusChange = async (id: string, status: AnnouncementStatus) => {
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchAnnouncements();
        toast({
          title: "Status Updated",
          description: `Announcement status changed to ${status.toLowerCase()}`,
        });
      }
    } catch (error) {
      console.error('Error updating announcement status:', error);
      toast({
        title: "Error",
        description: "Failed to update announcement status",
        variant: "destructive"
      });
    }
  };

  // View announcement details
  const viewAnnouncement = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    
    // Mark as viewed
    try {
      await fetch(`/api/announcements/${announcement.id}/view`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error marking as viewed:', error);
    }
  };

  const handleCreateAnnouncement = () => {
    // Refetch announcements after creating one
    const refetch = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        if (selectedType !== 'all') params.append('type', selectedType);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/announcements?${params}`);
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements);
          
          // Recalculate stats
          const total = data.announcements.length;
          const published = data.announcements.filter((a: Announcement) => a.status === 'PUBLISHED').length;
          const drafts = data.announcements.filter((a: Announcement) => a.status === 'DRAFT').length;
          const urgent = data.announcements.filter((a: Announcement) => a.type === 'URGENT').length;
          const totalViews = data.announcements.reduce((sum: number, a: Announcement) => sum + a.viewCount, 0);
          const totalReactions = data.announcements.reduce((sum: number, a: Announcement) => {
            return sum + Object.values(a.reactionCounts || {}).reduce((rs: number, rc: number) => rs + rc, 0);
          }, 0);
          
          setStats({ total, published, drafts, urgent, totalViews, totalReactions });
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };
    
    refetch();
    setShowCreateDialog(false);
    toast({
      title: "Success",
      description: "Announcement created successfully",
    });
  };

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Function to detect and format links in content
  const formatContentWithLinks = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const StatCard = ({ title, value, icon: Icon, color, description }: any) => (
    <Card className="transition-all duration-200 hover:shadow-lg hover:scale-105 border-0 shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-3xl font-bold ${color} mb-1`}>{value}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const AdminAnnouncementCard = ({ announcement }: { announcement: Announcement }) => {
    const typeConfig = ANNOUNCEMENT_TYPES[announcement.type];
    const statusConfig = ANNOUNCEMENT_STATUSES[announcement.status];
    const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
    const hasImages = announcement.imageUrl || (announcement.product?.images && announcement.product.images.length > 0);
    
    // Check if current user can edit/delete this announcement
    const canEdit = user?.role === 'ADMIN' || announcement.authorId === user?.id;
    
    // Get all images from announcement and product
    const allImages: string[] = [];
    if (announcement.imageUrl) {
      allImages.push(announcement.imageUrl);
    }
    if (announcement.product?.images) {
      allImages.push(...announcement.product.images);
    }

    return (
      <Card className={`group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer border-0 shadow-lg bg-white/90 backdrop-blur-sm overflow-hidden
        ${announcement.type === 'URGENT' ? 'ring-2 ring-red-200 shadow-red-100' : ''}
        ${announcement.status === 'DRAFT' ? 'bg-gray-50/90' : ''}
        ${isExpired ? 'opacity-75' : ''}
      `} onClick={() => viewAnnouncement(announcement)}>
        <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-blue-100 flex-shrink-0">
                <AvatarImage src={announcement.author.avatar} alt={announcement.author.name} />
                <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold text-sm">
                  {announcement.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <Badge className={`${typeConfig.color} font-medium text-xs sm:text-sm w-fit`}>
                    <span className="mr-1">{typeConfig.icon}</span>
                    <span className="hidden sm:inline">{typeConfig.label}</span>
                  </Badge>
                  <Badge 
                    variant={announcement.status === 'PUBLISHED' ? 'default' : 'secondary'}
                    className="text-xs w-fit"
                  >
                    {statusConfig.label}
                  </Badge>
                </div>
                
                <h3 className="font-bold text-gray-900 text-sm sm:text-base lg:text-lg line-clamp-2 mb-1">
                  {announcement.title}
                </h3>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                  <span className="font-medium">{announcement.author.name}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {/* Action Dropdown */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {announcement.status === 'PUBLISHED' && (
                <Select
                  value={announcement.status}
                  onValueChange={(value) => handleStatusChange(announcement.id, value as AnnouncementStatus)}
                >
                  <SelectTrigger className="w-auto h-8 border-gray-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ANNOUNCEMENT_STATUSES).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {(config as { label: string }).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600 h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    viewAnnouncement(announcement);
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleEditAnnouncement(announcement);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Announcement
                    </DropdownMenuItem>
                  )}
                  {canEdit && (
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnnouncement(announcement.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 p-4 sm:p-6">
          <div className="text-gray-700 line-clamp-3 mb-4 leading-relaxed text-sm sm:text-base">
            {formatContentWithLinks(announcement.content)}
          </div>

          {/* Product Information */}
          {announcement.product && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 mb-4 border border-blue-100">
              <div className="flex items-center space-x-3">
                {announcement.product.images && announcement.product.images[0] && (
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={announcement.product.images[0]}
                      alt={announcement.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{announcement.product.name}</p>
                  <Link 
                    href={`/product/${announcement.product.slug || announcement.product.id}`}
                    className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium inline-flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Product <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Images Gallery */}
          {allImages.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {allImages.length} Image{allImages.length > 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(allImages[0]);
                    setShowImageDialog(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 h-8 text-xs"
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  View All
                </Button>
              </div>
              
              {allImages.length === 1 ? (
                <div className="relative h-36 sm:h-48 w-full rounded-lg overflow-hidden group border border-gray-200">
                  <Image
                    src={allImages[0]}
                    alt={announcement.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(allImages[0]);
                      setShowImageDialog(true);
                    }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100 text-xs">
                        <ImageIcon className="w-3 h-3 mr-2" />
                        View Full Image
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {allImages.slice(0, 4).map((image, index) => (
                    <div 
                      key={index}
                      className="relative h-20 sm:h-24 rounded-lg overflow-hidden group cursor-pointer border-2 border-transparent hover:border-blue-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(image);
                        setShowImageDialog(true);
                      }}
                    >
                      <Image
                        src={image}
                        alt={`${announcement.title} - Image ${index + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {index === 3 && allImages.length > 4 && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">+{allImages.length - 4}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <ImageIcon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Legacy single image support */}
          {!allImages.length && announcement.imageUrl && (
            <div className="relative h-36 sm:h-48 w-full rounded-lg overflow-hidden mb-4 group border border-gray-200">
              <Image
                src={announcement.imageUrl}
                alt={announcement.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div 
                className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(announcement.imageUrl!);
                  setShowImageDialog(true);
                }}
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100 text-xs">
                    <ImageIcon className="w-3 h-3 mr-2" />
                    View Full Image
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Admin Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{announcement.viewCount}</span>
              </div>
              {announcement.reactionCounts && Object.keys(announcement.reactionCounts).length > 0 && (
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>{Object.values(announcement.reactionCounts).reduce((a, b) => a + b, 0)}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate max-w-20 sm:max-w-none">
                  {announcement.isGlobal ? 'All users' : announcement.targetRoles.join(', ')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge 
                variant={announcement.status === 'PUBLISHED' ? 'default' : 'secondary'}
                className="text-xs px-2 py-1"
              >
                {format(new Date(announcement.createdAt), 'MMM dd')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-0 shadow-xl">
          <CardContent className="text-center py-12">
            <div className="inline-flex items-center justify-center p-4 bg-red-100 rounded-full mb-6">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don&apos;t have admin permissions to access this page. 
              Please contact an administrator if you believe this is an error.
            </p>
            <Button 
              onClick={() => window.history.back()}
              className="bg-red-600 hover:bg-red-700"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-4">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Admin Announcements
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Create, manage, and monitor all platform announcements from your central dashboard
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <StatCard 
            title="Total" 
            value={stats.total} 
            icon={BarChart3} 
            color="text-blue-600" 
            description="All announcements"
          />
          <StatCard 
            title="Published" 
            value={stats.published} 
            icon={CheckCircle} 
            color="text-green-600" 
            description="Live announcements"
          />
          <StatCard 
            title="Drafts" 
            value={stats.drafts} 
            icon={Edit} 
            color="text-yellow-600" 
            description="Pending approval"
          />
          <StatCard 
            title="Urgent" 
            value={stats.urgent} 
            icon={AlertCircle} 
            color="text-red-600" 
            description="Urgent notices"
          />
          <StatCard 
            title="Views" 
            value={stats.totalViews} 
            icon={Eye} 
            color="text-purple-600" 
            description="All-time views"
          />
          <StatCard 
            title="Reactions" 
            value={stats.totalReactions} 
            icon={Star} 
            color="text-orange-600" 
            description="User engagement"
          />
        </div>

        {/* Controls */}
        <Card className="mb-6 sm:mb-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl text-base"
                />
              </div>

              {/* Filters and Create Button */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
                  <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
                    <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
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

                  <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                    <SelectTrigger className="h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(ANNOUNCEMENT_STATUSES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Announcement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6 sm:mb-8">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2 bg-white/80 backdrop-blur-sm border border-gray-200 h-12 rounded-xl">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white h-10 rounded-lg font-medium"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">All Announcements</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white h-10 rounded-lg font-medium"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Analytics View</span>
              <span className="sm:hidden">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6 mt-8">
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse border-0 shadow-lg">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        <div className="h-24 sm:h-32 bg-gray-200 rounded"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <Card className="text-center py-8 sm:py-12 border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
                <CardContent className="p-6 sm:p-8">
                  <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-gray-100 rounded-full mb-4">
                    <Settings className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No announcements found</h3>
                  <p className="text-gray-600 mb-6 text-sm sm:text-base">
                    {searchQuery ? 'Try adjusting your search terms.' : 'Create your first announcement to get started!'}
                  </p>
                  {!searchQuery && (
                    <Button 
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 px-6 rounded-xl shadow-lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Announcement
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {filteredAnnouncements.map((announcement) => (
                  <AdminAnnouncementCard key={announcement.id} announcement={announcement} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Analytics cards and charts would go here */}
              <Card className="col-span-full text-center py-12">
                <CardContent>
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Dashboard</h3>
                  <p className="text-gray-600">
                    Detailed analytics and performance metrics coming soon.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Enhanced Image Viewer Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Image Preview</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedImage, '_blank')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImageDialog(false)}
                >
                  Close
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[75vh] bg-gray-100 rounded-lg overflow-hidden">
            {selectedImage && (
              <Image
                src={selectedImage}
                alt="Announcement Image"
                fill
                className="object-contain"
                priority
              />
            )}
          </div>
          <div className="text-center text-sm text-gray-600 mt-2">
            Click and drag to pan • Scroll to zoom • Right-click to save
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement Details Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedAnnouncement.author.avatar} />
                      <AvatarFallback>
                        {selectedAnnouncement.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-2xl font-bold">
                        {selectedAnnouncement.title}
                      </DialogTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className={ANNOUNCEMENT_TYPES[selectedAnnouncement.type].color}>
                          {ANNOUNCEMENT_TYPES[selectedAnnouncement.type].icon} {ANNOUNCEMENT_TYPES[selectedAnnouncement.type].label}
                        </Badge>
                        <Badge className={ANNOUNCEMENT_STATUSES[selectedAnnouncement.status].color}>
                          {ANNOUNCEMENT_STATUSES[selectedAnnouncement.status].label}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          by {selectedAnnouncement.author.name}
                        </span>
                        <span className="text-sm text-gray-400">
                          {format(new Date(selectedAnnouncement.createdAt), 'PPp')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={selectedAnnouncement.status}
                      onValueChange={(value) => {
                        handleStatusChange(selectedAnnouncement.id, value as AnnouncementStatus);
                        setSelectedAnnouncement(null);
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <Badge className={ANNOUNCEMENT_STATUSES[selectedAnnouncement.status].color}>
                          {ANNOUNCEMENT_STATUSES[selectedAnnouncement.status].label}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ANNOUNCEMENT_STATUSES).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="mt-6 space-y-6">
                <div className="prose max-w-none">
                  <div className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                    {formatContentWithLinks(selectedAnnouncement.content)}
                  </div>
                </div>

                {/* All Images Display */}
                  {(() => {
                    const allAnnouncementImages: string[] = [];
                    if (selectedAnnouncement.imageUrl) {
                      allAnnouncementImages.push(selectedAnnouncement.imageUrl);
                    }
                    if (selectedAnnouncement.product?.images) {
                      allAnnouncementImages.push(...selectedAnnouncement.product.images);
                    }                  if (allAnnouncementImages.length > 0) {
                    return (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Attached Images ({allAnnouncementImages.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {allAnnouncementImages.map((image, index) => (
                            <div 
                              key={index} 
                              className="relative h-48 rounded-lg overflow-hidden cursor-pointer group"
                              onClick={() => {
                                setSelectedImage(image);
                                setShowImageDialog(true);
                              }}
                            >
                              <Image
                                src={image}
                                alt={`${selectedAnnouncement.title} - Image ${index + 1}`}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100">
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    View Full
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {selectedAnnouncement.imageUrl && (
                  <div className="relative w-full h-96 rounded-lg overflow-hidden">
                    <Image
                      src={selectedAnnouncement.imageUrl}
                      alt={selectedAnnouncement.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {selectedAnnouncement.product && (
                  <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-lg mb-4">Featured Product</h4>
                      <div className="flex items-center space-x-4">
                        {selectedAnnouncement.product.images?.[0] && (
                          <div className="relative h-20 w-20 rounded-lg overflow-hidden">
                            <Image
                              src={selectedAnnouncement.product.images[0]}
                              alt={selectedAnnouncement.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900">{selectedAnnouncement.product.name}</h5>
                          <Link 
                            href={`/product/${selectedAnnouncement.product.slug || selectedAnnouncement.product.id}`}
                            className="text-orange-600 hover:text-orange-700 font-medium inline-flex items-center mt-2"
                          >
                            View Product Details <ExternalLink className="w-4 h-4 ml-1" />
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedAnnouncement.viewCount}</div>
                    <div className="text-sm text-gray-600">Total Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(selectedAnnouncement.reactionCounts || {}).reduce((a, b) => a + b, 0)}
                    </div>
                    <div className="text-sm text-gray-600">Reactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedAnnouncement.isGlobal ? 'All' : selectedAnnouncement.targetRoles.length}
                    </div>
                    <div className="text-sm text-gray-600">Target Roles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatDistanceToNow(new Date(selectedAnnouncement.createdAt))}
                    </div>
                    <div className="text-sm text-gray-600">Age</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Professional Edit Announcement Dialog */}
      {showEditDialog && editingAnnouncement && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-7xl w-[95vw] h-[95vh] overflow-hidden p-0 flex flex-col">
            {/* Header */}
            <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 border-b flex-shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Edit className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                    </div>
                    Admin Edit Announcement
                  </DialogTitle>
                  <p className="text-gray-600 mt-2 text-sm sm:text-base">Advanced administrative editing controls</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-sm w-fit">
                  {ANNOUNCEMENT_TYPES[editingAnnouncement.type]?.icon} {ANNOUNCEMENT_TYPES[editingAnnouncement.type]?.label}
                </Badge>
              </div>
            </DialogHeader>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
              {/* Title Section */}
              <div className="space-y-3">
                <Label htmlFor="title" className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 sm:h-6 bg-blue-500 rounded-full"></div>
                  Announcement Title
                </Label>
                <Input
                  id="title"
                  value={editingAnnouncement.title}
                  onChange={(e) => setEditingAnnouncement({
                    ...editingAnnouncement,
                    title: e.target.value
                  })}
                  placeholder="Enter a compelling and engaging title..."
                  className="text-base sm:text-lg p-3 sm:p-4 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200"
                />
              </div>
              
              {/* Content Section */}
              <div className="space-y-3">
                <Label htmlFor="content" className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 sm:h-6 bg-green-500 rounded-full"></div>
                  Content
                </Label>
                <div className="relative">
                  <Textarea
                    id="content"
                    value={editingAnnouncement.content}
                    onChange={(e) => setEditingAnnouncement({
                      ...editingAnnouncement,
                      content: e.target.value
                    })}
                    placeholder="Write your announcement content here... 

✨ Admin Tips:
• Include links like https://example.com (they'll be clickable)
• Use emojis to make it engaging
• Consider your audience and tone
• Keep it clear and actionable"
                    className="min-h-32 sm:min-h-48 p-3 sm:p-4 border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 rounded-xl resize-none transition-all duration-200 text-sm sm:text-base"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white px-2 py-1 rounded-md">
                    {editingAnnouncement.content.length} characters
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  <span>URLs will be automatically converted to clickable links</span>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="space-y-4">
                <Label className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-4 sm:h-6 bg-purple-500 rounded-full"></div>
                  Images
                </Label>
                
                {/* Current Images */}
                {(() => {
                  const allCurrentImages: string[] = [];
                  if (editingAnnouncement.imageUrl) {
                    allCurrentImages.push(editingAnnouncement.imageUrl);
                  }
                  if (editingAnnouncement.product?.images) {
                    allCurrentImages.push(...editingAnnouncement.product.images);
                  }
                  
                  if (allCurrentImages.length > 0) {
                    return (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="font-medium text-gray-700">Current Images ({allCurrentImages.length})</h4>
                          <Badge variant="outline" className="border-purple-200 text-purple-700 w-fit">
                            <FileImage className="w-3 h-3 mr-1" />
                            Existing
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                          {allCurrentImages.map((image, index) => (
                            <div key={index} className="group relative h-24 sm:h-32 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-purple-300 transition-colors">
                              <Image
                                src={image}
                                alt={`Current image ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs sm:text-sm"
                                  onClick={() => {
                                    setSelectedImage(image);
                                    setShowImageDialog(true);
                                  }}
                                >
                                  <ZoomIn className="w-3 h-3 sm:w-4 sm:h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* New Image Upload */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700">Upload New Image</h4>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setPreviewImage(e.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="admin-image-upload"
                    />
                    <label htmlFor="admin-image-upload" className="cursor-pointer">
                      <div className="space-y-4">
                        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center">
                          {isUploading ? (
                            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 animate-spin" />
                          ) : (
                            <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-base sm:text-lg font-medium text-gray-700">
                            {isUploading ? 'Uploading...' : 'Click to upload a new image'}
                          </p>
                          <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Image Preview */}
                  {previewImage && (
                    <div className="relative">
                      <h5 className="font-medium text-gray-700 mb-2">New Image Preview</h5>
                      <div className="relative h-32 sm:h-48 rounded-xl overflow-hidden border-2 border-purple-200">
                        <Image
                          src={previewImage}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setPreviewImage(null);
                            setImageFile(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Type and Status Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3">
                  <Label className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-4 sm:h-6 bg-orange-500 rounded-full"></div>
                    Announcement Type
                  </Label>
                  <Select
                    value={editingAnnouncement.type}
                    onValueChange={(value) => setEditingAnnouncement({
                      ...editingAnnouncement,
                      type: value as AnnouncementType
                    })}
                  >
                    <SelectTrigger className="h-10 sm:h-12 border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ANNOUNCEMENT_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center space-x-3 py-1">
                            <span className="text-lg">{config.icon}</span>
                            <span className="font-medium">{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-4 sm:h-6 bg-red-500 rounded-full"></div>
                    Status
                  </Label>
                  <Select
                    value={editingAnnouncement.status}
                    onValueChange={(value) => setEditingAnnouncement({
                      ...editingAnnouncement,
                      status: value as AnnouncementStatus
                    })}
                  >
                    <SelectTrigger className="h-10 sm:h-12 border-2 border-gray-200 focus:border-red-500 focus:ring-red-500 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLISHED">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Published</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="DRAFT">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Draft</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ARCHIVED">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span>Archived</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin Analytics Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 sm:p-6 rounded-xl border border-indigo-200">
                <Label className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 sm:h-6 bg-indigo-500 rounded-full"></div>
                  Admin Analytics
                </Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-indigo-600">{editingAnnouncement.viewCount}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {Object.values(editingAnnouncement.reactionCounts || {}).reduce((sum, count) => sum + count, 0)}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Reactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">
                      {format(new Date(editingAnnouncement.createdAt), 'MMM d')}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-base sm:text-xl font-bold text-orange-600 truncate">
                      {editingAnnouncement.author?.name || 'System'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Author</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Responsive Footer with Proper Save Button */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 z-10">
              <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
                <div className="flex items-center space-x-2 text-sm text-gray-600 order-2 sm:order-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">Last edited: {format(new Date(editingAnnouncement.updatedAt), 'PPp')}</span>
                </div>
                
                <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-3 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditDialog(false);
                      setEditingAnnouncement(null);
                      setPreviewImage(null);
                      setImageFile(null);
                    }}
                    className="px-4 sm:px-6 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors h-10 sm:h-11"
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleUpdateAnnouncement({
                      title: editingAnnouncement.title,
                      content: editingAnnouncement.content,
                      type: editingAnnouncement.type,
                      status: editingAnnouncement.status,
                      imageUrl: editingAnnouncement.imageUrl
                    })}
                    className="px-6 sm:px-8 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-10 sm:h-11 font-semibold min-w-[140px] sm:min-w-[160px]"
                    disabled={isSaving || isUploading}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="hidden sm:inline">Saving Changes...</span>
                        <span className="sm:hidden">Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Save Changes</span>
                        <span className="sm:hidden">Save</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Announcement Dialog */}
      {showCreateDialog && (
        <CreateAnnouncementDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleCreateAnnouncement}
        />
      )}
    </div>
  );
}
