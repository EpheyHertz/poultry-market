'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  Filter, 
  Megaphone, 
  Bell, 
  TrendingUp, 
  Calendar,
  Eye,
  Heart,
  Share2,
  BookmarkPlus,
  Image as ImageIcon,
  Download,
  Mail,
  Users,
  Star,
  AlertCircle,
  Clock,
  Tag,
  Zap,
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

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        if (selectedType !== 'all') params.append('type', selectedType);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (activeTab === 'my') params.append('authorId', user?.id || '');

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

    if (user) {
      fetchAnnouncements();
    }
  }, [selectedType, selectedStatus, activeTab, user]);

  const handleCreateAnnouncement = () => {
    // Refetch announcements after creating one
    const refetch = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        if (selectedType !== 'all') params.append('type', selectedType);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (activeTab === 'my') params.append('authorId', user?.id || '');

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
    
    refetch();
    setShowCreateDialog(false);
  };

  const handleReaction = async (announcementId: string, reaction: string) => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction })
      });

      if (response.ok) {
        // Refetch announcements after reaction
        const params = new URLSearchParams();
        
        if (selectedType !== 'all') params.append('type', selectedType);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (activeTab === 'my') params.append('authorId', user?.id || '');

        const refreshResponse = await fetch(`/api/announcements?${params}`);
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setAnnouncements(data.announcements);
        }
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout user={user}>
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Megaphone className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
              <p className="text-gray-600">Stay updated with the latest news and updates</p>
            </div>
          </div>
          
          {canCreateAnnouncements && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search announcements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as AnnouncementType | 'all')}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SALE">Sale</SelectItem>
                  <SelectItem value="DISCOUNT">Discount</SelectItem>
                  <SelectItem value="SLAUGHTER_SCHEDULE">Slaughter Schedule</SelectItem>
                  <SelectItem value="PRODUCT_LAUNCH">Product Launch</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>

              {canCreateAnnouncements && (
                <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as AnnouncementStatus | 'all')}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Status" />
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
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Announcements</TabsTrigger>
            {canCreateAnnouncements && (
              <TabsTrigger value="my">My Announcements</TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {/* Announcements List */}
        <div className="grid gap-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading announcements...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Megaphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'No announcements available at the moment'}
                </p>
                {canCreateAnnouncements && !searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Announcement
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredAnnouncements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onReaction={handleReaction}
                  canEdit={announcement.authorId === user?.id || user?.role === 'ADMIN'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create Announcement Dialog */}
        {showCreateDialog && (
          <CreateAnnouncementDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            onSuccess={handleCreateAnnouncement}
          />
        )}
      </div>
    </div>
   </DashboardLayout>
  );
}
