'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Search, 
  Megaphone, 
  TrendingUp, 
  Calendar,
  Eye,
  Share2,
  BookmarkPlus,
  Image as ImageIcon,
  Download,
  Mail,
  Users,
  Star,
  AlertCircle,
  Clock,
  ExternalLink,
  Send,
  Edit,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Loader2,
  Save,
  FileImage,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Announcement, AnnouncementType, AnnouncementStatus, ANNOUNCEMENT_TYPES } from '@/types/announcement';
import DashboardLayout from '@/components/layout/dashboard-layout';
import CreateAnnouncementDialog from '@/components/announcement/create-announcement-dialog';
import { toast } from '@/hooks/use-toast';

export default function AnnouncementsPage() {
  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AnnouncementType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<AnnouncementStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    urgent: 0,
    recent: 0,
    trending: 0
  });

  const canCreateAnnouncements = user?.role && ['ADMIN', 'COMPANY', 'SELLER'].includes(user.role);

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

  // Fetch announcements and stats
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        if (selectedType !== 'all') params.append('type', selectedType);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (activeTab === 'my') params.append('authorId', user?.id || '');
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/announcements?${params}`);
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements);
          
          // Calculate stats
          const total = data.announcements.length;
          const urgent = data.announcements.filter((a: Announcement) => a.type === 'URGENT').length;
          const recent = data.announcements.filter((a: Announcement) => 
            new Date(a.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length;
          const trending = data.announcements.filter((a: Announcement) => a.viewCount > 50).length;
          
          setStats({ total, urgent, recent, trending });
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAnnouncements();
    }
  }, [user, selectedType, selectedStatus, activeTab, searchQuery]);

  // Handle reactions
  const handleReaction = async (announcementId: string, reaction: string) => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction })
      });

      if (response.ok) {
        // Refresh announcements
        setAnnouncements(prev => prev.map(a => 
          a.id === announcementId 
            ? { ...a, userReaction: reaction }
            : a
        ));
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  // Handle email subscription to announcement type
  const handleEmailSubscription = async (type: AnnouncementType) => {
    try {
      const response = await fetch('/api/announcements/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, email: user?.email })
      });

      if (response.ok) {
        toast({
          title: "Subscription Updated",
          description: `You'll now receive email notifications for ${type} announcements.`,
        });
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
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

  // Handle delete announcement
  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/announcements/${id}/edit`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh announcements
        const params = new URLSearchParams();
        if (selectedType !== 'all') params.append('type', selectedType);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (activeTab === 'my') params.append('authorId', user?.id || '');
        if (searchQuery) params.append('search', searchQuery);

        const refreshResponse = await fetch(`/api/announcements?${params}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setAnnouncements(data.announcements);
        }

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

  // Handle edit announcement
  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowEditDialog(true);
  };

  // Handle image upload
  const handleImageUpload = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.url;
      } else {
        toast({
          title: "Upload Error",
          description: "Failed to upload image",
          variant: "destructive"
        });
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle update announcement with image upload
  const handleUpdateAnnouncement = async (updatedData: any) => {
    if (!editingAnnouncement) return;

    try {
      setIsSaving(true);
      let imageUrl = updatedData.imageUrl;

      // Upload new image if file is selected
      if (imageFile) {
        const uploadedUrl = await handleImageUpload(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          setIsSaving(false);
          return; // Stop if upload failed
        }
      }

      const response = await fetch(`/api/announcements/${editingAnnouncement.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedData,
          imageUrl
        })
      });

      if (response.ok) {
        // Refresh announcements
        const params = new URLSearchParams();
        if (selectedType !== 'all') params.append('type', selectedType);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (activeTab === 'my') params.append('authorId', user?.id || '');
        if (searchQuery) params.append('search', searchQuery);

        const refreshResponse = await fetch(`/api/announcements?${params}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setAnnouncements(data.announcements);
        }

        // Reset states
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
    }
  };

  // Filter announcements based on search
  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card className="transition-all duration-200 hover:shadow-lg hover:scale-105">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('600', '100')}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProfessionalAnnouncementCard = ({ announcement }: { announcement: Announcement }) => {
    const typeConfig = ANNOUNCEMENT_TYPES[announcement.type];
    const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
    const hasImages = announcement.imageUrl || (announcement.product?.images && announcement.product.images.length > 0);
    
    // Get all images from announcement and product
    const allImages: string[] = [];
    if (announcement.imageUrl) {
      allImages.push(announcement.imageUrl);
    }
    if (announcement.product?.images) {
      allImages.push(...announcement.product.images);
    }
    
    // Check if current user can edit/delete this announcement
    const canEdit = user?.role === 'ADMIN' || announcement.authorId === user?.id;

    return (
      <Card className={`group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer
        ${announcement.type === 'URGENT' ? 'border-red-500 shadow-red-100' : 'border-gray-200'}
        ${isExpired ? 'opacity-75' : ''}
      `} onClick={() => viewAnnouncement(announcement)}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <Avatar className="h-12 w-12 ring-2 ring-orange-100">
                <AvatarImage src={announcement.author.avatar} alt={announcement.author.name} />
                <AvatarFallback className="bg-orange-50 text-orange-600 font-semibold">
                  {announcement.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={`${typeConfig.color} font-medium`}>
                    {typeConfig.icon} {typeConfig.label}
                  </Badge>
                  {announcement.type === 'URGENT' && (
                    <Badge className="bg-red-500 text-white animate-pulse">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      URGENT
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                      <Clock className="w-3 h-3 mr-1" />
                      Expired
                    </Badge>
                  )}
                </div>
                
                <h3 className="font-bold text-xl text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                  {announcement.title}
                </h3>
                
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span className="font-medium">{announcement.author.name}</span>
                  <Badge variant="outline" className="text-xs bg-gray-50">
                    {announcement.author.role}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3" />
                    <span>{announcement.viewCount}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmailSubscription(announcement.type);
                }}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                <Mail className="h-4 w-4 mr-1" />
                Subscribe
              </Button>
              
              {hasImages && (
                <Badge variant="outline" className="border-blue-500 text-blue-600">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {allImages.length} Image{allImages.length > 1 ? 's' : ''}
                </Badge>
              )}
              {canEdit && (
                <Badge variant="outline" className="border-green-500 text-green-600">
                  <Edit className="w-3 h-3 mr-1" />
                  Editable
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="text-gray-700 line-clamp-3 mb-4 leading-relaxed">
            {formatContentWithLinks(announcement.content)}
          </div>

          {/* Product Information */}
          {announcement.product && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 mb-4 border border-orange-100">
              <div className="flex items-center space-x-3">
                {announcement.product.images && announcement.product.images[0] && (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden">
                    <Image
                      src={announcement.product.images[0]}
                      alt={announcement.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{announcement.product.name}</p>
                  <Link 
                    href={`/product/${announcement.product.slug || announcement.product.id}`}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium inline-flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Product <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Multiple Images Gallery */}
          {allImages.length > 0 && (
            <div className="mb-4">
              {allImages.length === 1 ? (
                <div className="relative h-48 w-full rounded-lg overflow-hidden group">
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
                      <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100">
                        <ImageIcon className="w-4 h-4 mr-2" />
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
                      className="relative h-24 rounded-lg overflow-hidden group cursor-pointer"
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
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white font-semibold">+{allImages.length - 4}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <ImageIcon className="w-6 h-6 text-white" />
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
            <div className="relative h-48 w-full rounded-lg overflow-hidden mb-4 group">
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
                  <Button size="sm" className="bg-white text-gray-900 hover:bg-gray-100">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    View Full Image
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-1">
              {['❤️', '👍', '👎', '😮'].map((reaction) => (
                <Button
                  key={reaction}
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReaction(announcement.id, reaction);
                  }}
                  className={`text-lg hover:scale-110 transition-transform ${
                    announcement.userReaction === reaction ? 'bg-orange-100' : ''
                  }`}
                >
                  {reaction}
                  <span className="ml-1 text-xs text-gray-500">
                    {announcement.reactionCounts?.[reaction] || 0}
                  </span>
                </Button>
              ))}
            </div>
            
            <div className="flex items-center space-x-2">
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-600 hover:text-green-600"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAnnouncement(announcement);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Announcement
                    </DropdownMenuItem>
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
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle share functionality
                }}
                className="text-gray-600 hover:text-orange-600"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle bookmark functionality
                }}
                className="text-gray-600 hover:text-orange-600"
              >
                <BookmarkPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-full mb-4">
              <Megaphone className="h-8 w-8 text-orange-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Poultry Market Announcements
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Stay updated with the latest news, offers, and important updates from our poultry marketplace community
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Total Announcements" 
              value={stats.total} 
              icon={Megaphone} 
              color="text-blue-600" 
            />
            <StatCard 
              title="Urgent Updates" 
              value={stats.urgent} 
              icon={AlertCircle} 
              color="text-red-600" 
            />
            <StatCard 
              title="This Week" 
              value={stats.recent} 
              icon={Calendar} 
              color="text-green-600" 
            />
            <StatCard 
              title="Trending" 
              value={stats.trending} 
              icon={TrendingUp} 
              color="text-purple-600" 
            />
          </div>

          {/* Controls */}
          <Card className="mb-8 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search announcements..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>

                  <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(ANNOUNCEMENT_TYPES).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.icon} {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {user?.role === 'ADMIN' && (
                    <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PUBLISHED">Published</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {canCreateAnnouncements && (
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Announcement
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-white border border-gray-200">
              <TabsTrigger value="all" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                <Users className="h-4 w-4 mr-2" />
                All Announcements
              </TabsTrigger>
              {canCreateAnnouncements && (
                <TabsTrigger value="my" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                  <Star className="h-4 w-4 mr-2" />
                  My Announcements
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all" className="space-y-6 mt-8">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                          <div className="h-32 bg-gray-200 rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredAnnouncements.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <div className="inline-flex items-center justify-center p-4 bg-gray-100 rounded-full mb-4">
                      <Megaphone className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No announcements found</h3>
                    <p className="text-gray-600 mb-6">
                      {searchQuery ? 'Try adjusting your search terms.' : 'Be the first to create an announcement!'}
                    </p>
                    {canCreateAnnouncements && !searchQuery && (
                      <Button 
                        onClick={() => setShowCreateDialog(true)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Announcement
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {filteredAnnouncements.map((announcement) => (
                    <ProfessionalAnnouncementCard key={announcement.id} announcement={announcement} />
                  ))}
                </div>
              )}
            </TabsContent>

            {canCreateAnnouncements && (
              <TabsContent value="my" className="space-y-6 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {filteredAnnouncements
                    .filter(a => a.authorId === user?.id)
                    .map((announcement) => (
                      <ProfessionalAnnouncementCard key={announcement.id} announcement={announcement} />
                    ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Professional Image Viewer Dialog */}
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogContent className="max-w-7xl w-[98vw] max-h-[98vh] overflow-hidden p-0 bg-black/95 backdrop-blur-sm border-0">
            <DialogHeader>
              <VisuallyHidden>
                <DialogTitle>Professional Image Viewer</DialogTitle>
              </VisuallyHidden>
            </DialogHeader>
            
            <div className="relative w-full h-[98vh] bg-gradient-to-br from-black via-gray-900 to-black">
              {selectedImage && (
                <>
                  {/* Main Image Display */}
                  <div className="relative w-full h-full flex items-center justify-center p-8">
                    <div className="relative max-w-full max-h-full">
                      <Image
                        src={selectedImage}
                        alt="Announcement Image - Full View"
                        width={1200}
                        height={800}
                        className="object-contain max-w-full max-h-full rounded-lg shadow-2xl"
                        priority
                      />
                    </div>
                  </div>
                  
                  {/* Professional Header Controls */}
                  <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/10 backdrop-blur-sm rounded-lg">
                          <ImageIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white text-xl font-semibold">Image Viewer</h3>
                          <p className="text-white/70 text-sm">High quality preview</p>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowImageDialog(false)}
                        className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/20 rounded-lg p-3"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Professional Footer Controls */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/20">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(selectedImage, '_blank')}
                          className="text-white hover:bg-white/20 rounded-xl px-4 py-2 border border-white/20"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download HD
                        </Button>
                        
                        <div className="w-px h-6 bg-white/20"></div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedImage);
                            toast({
                              title: "✅ Copied Successfully!",
                              description: "Image URL has been copied to your clipboard",
                            });
                          }}
                          className="text-white hover:bg-white/20 rounded-xl px-4 py-2 border border-white/20"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                        
                        <div className="w-px h-6 bg-white/20"></div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = selectedImage;
                            link.download = 'announcement-image.jpg';
                            link.click();
                          }}
                          className="text-white hover:bg-white/20 rounded-xl px-4 py-2 border border-white/20"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                    
                    {/* Image Info */}
                    <div className="flex items-center justify-center mt-4">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                        <p className="text-white/80 text-sm">Click outside to close • Press ESC to exit</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Keyboard Navigation Hint */}
                  <div className="absolute top-1/2 left-6 transform -translate-y-1/2 z-10">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20 opacity-50 hover:opacity-100 transition-opacity">
                      <ChevronLeft className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="absolute top-1/2 right-6 transform -translate-y-1/2 z-10">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20 opacity-50 hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Professional Announcement Details Modal */}
        <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-hidden p-0 bg-gradient-to-br from-slate-50 via-white to-blue-50">
            {selectedAnnouncement && (
              <>
                {/* Professional Header with Gradient */}
                <div className="relative overflow-hidden">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 opacity-90"></div>
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)`
                  }}></div>
                  
                  <DialogHeader className="relative z-10 p-8 text-white">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative">
                            <Avatar className="h-16 w-16 border-4 border-white/20 shadow-2xl">
                              <AvatarImage src={selectedAnnouncement.author.avatar} />
                              <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                                {selectedAnnouncement.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <Badge className={`${ANNOUNCEMENT_TYPES[selectedAnnouncement.type].color} mb-3 text-sm px-3 py-1 shadow-lg`}>
                              <span className="text-lg mr-2">{ANNOUNCEMENT_TYPES[selectedAnnouncement.type].icon}</span>
                              {ANNOUNCEMENT_TYPES[selectedAnnouncement.type].label}
                            </Badge>
                            <DialogTitle className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-2 drop-shadow-sm">
                              {selectedAnnouncement.title}
                            </DialogTitle>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-white/90">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">{selectedAnnouncement.author.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(selectedAnnouncement.createdAt), 'PPp')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <span>{selectedAnnouncement.viewCount} views</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEmailSubscription(selectedAnnouncement.type)}
                          className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 shadow-lg"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Subscribe to Updates
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 shadow-lg"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </DialogHeader>
                </div>
                
                {/* Content Area with Professional Spacing */}
                <div className="overflow-y-auto max-h-[calc(95vh-280px)] p-8 space-y-8">
                  {/* Content Section */}
                  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Megaphone className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">Announcement Details</h3>
                      </div>
                      <div className="prose prose-lg max-w-none">
                        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                          {formatContentWithLinks(selectedAnnouncement.content)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Professional Images Gallery */}
                  {(() => {
                    const allAnnouncementImages: string[] = [];
                    if (selectedAnnouncement.imageUrl) {
                      allAnnouncementImages.push(selectedAnnouncement.imageUrl);
                    }
                    if (selectedAnnouncement.product?.images) {
                      allAnnouncementImages.push(...selectedAnnouncement.product.images);
                    }
                    
                    if (allAnnouncementImages.length > 0) {
                      return (
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                          <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                  <ImageIcon className="h-5 w-5 text-green-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                  Media Gallery ({allAnnouncementImages.length})
                                </h3>
                              </div>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {allAnnouncementImages.length} {allAnnouncementImages.length === 1 ? 'Image' : 'Images'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {allAnnouncementImages.map((image, index) => (
                                <div 
                                  key={index} 
                                  className="relative group cursor-pointer"
                                  onClick={() => {
                                    setSelectedImage(image);
                                    setShowImageDialog(true);
                                  }}
                                >
                                  <div className="relative h-64 rounded-xl overflow-hidden shadow-lg">
                                    <Image
                                      src={image}
                                      alt={`${selectedAnnouncement.title} - Image ${index + 1}`}
                                      fill
                                      className="object-cover group-hover:scale-110 transition-all duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                                      <div className="absolute bottom-4 left-4 right-4">
                                        <Button size="sm" className="w-full bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30">
                                          <Maximize2 className="w-4 h-4 mr-2" />
                                          View Full Size
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs font-medium">
                                      {index + 1} / {allAnnouncementImages.length}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  })()}

                  {/* Featured Product Section */}
                  {selectedAnnouncement.product && (
                    <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-50 via-yellow-50 to-orange-50 border-l-4 border-l-orange-500">
                      <CardContent className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Star className="h-5 w-5 text-orange-600" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900">Featured Product</h3>
                          <Badge className="bg-orange-100 text-orange-800">Premium</Badge>
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-start gap-6">
                          {selectedAnnouncement.product.images?.[0] && (
                            <div className="relative h-32 w-32 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                              <Image
                                src={selectedAnnouncement.product.images[0]}
                                alt={selectedAnnouncement.product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 space-y-3">
                            <h4 className="text-2xl font-bold text-gray-900">{selectedAnnouncement.product.name}</h4>
                            <p className="text-gray-600">Discover this amazing product and see what makes it special.</p>
                            <Link 
                              href={`/product/${selectedAnnouncement.product.slug || selectedAnnouncement.product.id}`}
                              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Product Details
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Professional Reactions & Engagement */}
                  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Star className="h-5 w-5 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">Community Reactions</h3>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {['❤️', '👍', '👎', '😮', '😂', '😢'].map((reaction) => (
                          <Button
                            key={reaction}
                            variant="outline"
                            onClick={() => handleReaction(selectedAnnouncement.id, reaction)}
                            className={`text-2xl px-4 py-3 h-auto hover:scale-110 transition-all duration-200 rounded-xl border-2 ${
                              selectedAnnouncement.userReaction === reaction 
                                ? 'bg-orange-100 border-orange-300 shadow-lg' 
                                : 'hover:bg-gray-50 border-gray-200'
                            }`}
                          >
                            <span className="mr-2">{reaction}</span>
                            <span className="text-sm font-medium text-gray-600">
                              {selectedAnnouncement.reactionCounts?.[reaction] || 0}
                            </span>
                          </Button>
                        ))}
                      </div>
                      
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Share your reaction to help others discover this announcement</span>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">{selectedAnnouncement.viewCount} views</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Professional Edit Announcement Dialog */}
        {showEditDialog && editingAnnouncement && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden p-0">
              {/* Header */}
              <DialogHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 sm:p-6 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Edit className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                      </div>
                      Edit Announcement
                    </DialogTitle>
                    <p className="text-gray-600 mt-2 text-sm sm:text-base">Make your announcement shine with professional editing</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800 px-3 py-1 text-sm w-fit">
                    {ANNOUNCEMENT_TYPES[editingAnnouncement.type]?.icon} {ANNOUNCEMENT_TYPES[editingAnnouncement.type]?.label}
                  </Badge>
                </div>
              </DialogHeader>
              
              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(95vh-180px)] p-4 sm:p-6 space-y-6 sm:space-y-8">
                {/* Title Section */}
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-4 sm:h-6 bg-orange-500 rounded-full"></div>
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
                    className="text-base sm:text-lg p-3 sm:p-4 border-2 border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl transition-all duration-200"
                  />
                </div>
                
                {/* Content Section */}
                <div className="space-y-3">
                  <Label htmlFor="content" className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-4 sm:h-6 bg-blue-500 rounded-full"></div>
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

✨ Tips:
• Include links like https://example.com (they'll be clickable)
• Use emojis to make it engaging
• Keep it clear and concise"
                      className="min-h-32 sm:min-h-48 p-3 sm:p-4 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl resize-none transition-all duration-200 text-sm sm:text-base"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-500 bg-white px-2 py-1 rounded-md">
                      {editingAnnouncement.content.length} characters
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
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
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
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
                      <div className="w-1 h-4 sm:h-6 bg-green-500 rounded-full"></div>
                      Announcement Type
                    </Label>
                    <Select
                      value={editingAnnouncement.type}
                      onValueChange={(value) => setEditingAnnouncement({
                        ...editingAnnouncement,
                        type: value as AnnouncementType
                      })}
                    >
                      <SelectTrigger className="h-10 sm:h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-green-500 rounded-xl">
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

                  {user?.role === 'ADMIN' && (
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
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 p-4 sm:p-6 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Last edited: {format(new Date(editingAnnouncement.updatedAt), 'PPp')}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditDialog(false);
                      setEditingAnnouncement(null);
                      setPreviewImage(null);
                      setImageFile(null);
                    }}
                    className="px-4 sm:px-6 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors w-full sm:w-auto"
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
                    className="px-6 sm:px-8 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                    disabled={isSaving || isUploading}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
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
            onSuccess={() => {
              setShowCreateDialog(false);
              // Refresh announcements
              window.location.reload();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
