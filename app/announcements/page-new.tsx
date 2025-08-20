'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Send
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
  const [stats, setStats] = useState({
    total: 0,
    urgent: 0,
    recent: 0,
    trending: 0
  });

  const canCreateAnnouncements = user?.role && ['ADMIN', 'COMPANY', 'SELLER'].includes(user.role);

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
                  Images
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-gray-700 line-clamp-3 mb-4 leading-relaxed">
            {announcement.content}
          </p>

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

          {/* Image Preview */}
          {announcement.imageUrl && (
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

        {/* Image Viewer Dialog */}
        <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[70vh]">
              {selectedImage && (
                <Image
                  src={selectedImage}
                  alt="Announcement Image"
                  fill
                  className="object-contain"
                />
              )}
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <Button
                variant="outline"
                onClick={() => window.open(selectedImage, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImageDialog(false)}
              >
                Close
              </Button>
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
                          <span className="text-sm text-gray-600">
                            by {selectedAnnouncement.author.name}
                          </span>
                          <span className="text-sm text-gray-400">
                            {format(new Date(selectedAnnouncement.createdAt), 'PPp')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmailSubscription(selectedAnnouncement.type)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Subscribe to {ANNOUNCEMENT_TYPES[selectedAnnouncement.type].label}
                    </Button>
                  </div>
                </DialogHeader>
                
                <div className="mt-6 space-y-6">
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                      {selectedAnnouncement.content}
                    </p>
                  </div>

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

                  <div className="flex items-center justify-between pt-6 border-t">
                    <div className="flex items-center space-x-2">
                      {['❤️', '👍', '👎', '😮', '😂', '😢'].map((reaction) => (
                        <Button
                          key={reaction}
                          variant="ghost"
                          onClick={() => handleReaction(selectedAnnouncement.id, reaction)}
                          className={`text-lg hover:scale-110 transition-transform ${
                            selectedAnnouncement.userReaction === reaction ? 'bg-orange-100' : ''
                          }`}
                        >
                          {reaction}
                          <span className="ml-1 text-sm text-gray-500">
                            {selectedAnnouncement.reactionCounts?.[reaction] || 0}
                          </span>
                        </Button>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <Eye className="h-4 w-4" />
                      <span>{selectedAnnouncement.viewCount} views</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

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
