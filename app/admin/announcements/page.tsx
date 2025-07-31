'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import CreateAnnouncementDialog from '@/components/announcement/create-announcement-dialog';
import { Announcement, AnnouncementType, AnnouncementStatus, ANNOUNCEMENT_TYPES, ANNOUNCEMENT_STATUSES } from '@/types/announcement';

export default function AdminAnnouncementsPage() {
  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AnnouncementType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<AnnouncementStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

    if (isAdmin) {
      fetchAnnouncements();
    }
  }, [selectedType, selectedStatus, isAdmin]);

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
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
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
      }
    } catch (error) {
      console.error('Error updating announcement status:', error);
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

  const filteredAnnouncements = announcements.filter(announcement =>
    announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Announcements</h1>
          <p className="text-gray-600">Create and manage system-wide announcements</p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Announcement
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as AnnouncementType | 'all')}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Types" />
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

            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as AnnouncementStatus | 'all')}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Status" />
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
        </CardContent>
      </Card>

      {/* Announcements Table */}
      <Card>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading announcements...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements found</h3>
              <p className="text-gray-600">Create your first announcement to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Title & Type</th>
                    <th className="text-left py-3 px-4 font-medium">Author</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Audience</th>
                    <th className="text-left py-3 px-4 font-medium">Stats</th>
                    <th className="text-left py-3 px-4 font-medium">Created</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnnouncements.map((announcement) => {
                    const typeConfig = ANNOUNCEMENT_TYPES[announcement.type];
                    const statusConfig = ANNOUNCEMENT_STATUSES[announcement.status];
                    
                    return (
                      <tr key={announcement.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">{announcement.title}</span>
                              <Badge className={typeConfig.color}>
                                {typeConfig.icon} {typeConfig.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 truncate max-w-xs">
                              {announcement.content.substring(0, 60)}...
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{announcement.author.name}</div>
                            <Badge variant="outline" className="text-xs">
                              {announcement.author.role}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Select
                            value={announcement.status}
                            onValueChange={(value) => handleStatusChange(announcement.id, value as AnnouncementStatus)}
                          >
                            <SelectTrigger className="w-32">
                              <Badge className={statusConfig.color}>
                                {statusConfig.label}
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
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {announcement.isGlobal ? (
                              <Badge variant="secondary">Global</Badge>
                            ) : (
                              <div className="space-y-1">
                                {announcement.targetRoles.map(role => (
                                  <Badge key={role} variant="outline" className="mr-1">
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm space-y-1">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{announcement.viewCount} views</span>
                            </div>
                            {announcement.reactionCounts && Object.keys(announcement.reactionCounts).length > 0 && (
                              <div className="flex items-center space-x-1">
                                <span>👍</span>
                                <span>{Object.values(announcement.reactionCounts).reduce((a, b) => a + b, 0)} reactions</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-600">
                            {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteAnnouncement(announcement.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
