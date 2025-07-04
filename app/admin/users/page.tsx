'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  Filter, 
  Tag,
  Shield,
  Star,
  Award,
  Crown,
  Zap,
  Leaf,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

const tagIcons = {
  VERIFIED: Shield,
  TRUSTED: Star,
  RECOMMENDED: Award,
  PREMIUM: Crown,
  FEATURED: Zap,
  ORGANIC: Leaf,
  LOCAL: MapPin,
  BESTSELLER: TrendingUp,
};

const tagColors = {
  VERIFIED: 'bg-blue-100 text-blue-800',
  TRUSTED: 'bg-green-100 text-green-800',
  RECOMMENDED: 'bg-purple-100 text-purple-800',
  PREMIUM: 'bg-yellow-100 text-yellow-800',
  FEATURED: 'bg-orange-100 text-orange-800',
  ORGANIC: 'bg-emerald-100 text-emerald-800',
  LOCAL: 'bg-cyan-100 text-cyan-800',
  BESTSELLER: 'bg-pink-100 text-pink-800',
};

export default function AdminUsers() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
      fetchUsers();
    }
  }, [user, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      
      const response = await fetch(`/api/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleTagToggle = async (userId: string, tag: string) => {
    setIsLoading(true);

    try {
      const targetUser = users.find(u => u.id === userId);
      const hasTag = targetUser?.tags.some((t: any) => t.tag === tag);

      const response = await fetch('/api/tags', {
        method: hasTag ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          tag
        }),
      });

      if (response.ok) {
        toast.success(`Tag ${hasTag ? 'removed' : 'added'} successfully!`);
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update tag');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'COMPANY': return 'bg-blue-100 text-blue-800';
      case 'SELLER': return 'bg-green-100 text-green-800';
      case 'CUSTOMER': return 'bg-gray-100 text-gray-800';
      case 'STAKEHOLDER': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage users and assign verification tags</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Roles</SelectItem>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="SELLER">Seller</SelectItem>
                  <SelectItem value="COMPANY">Company</SelectItem>
                  <SelectItem value="STAKEHOLDER">Stakeholder</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>Manage user accounts and verification status</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((userData) => (
                  <div key={userData.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {userData.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">{userData.name}</h3>
                          <p className="text-sm text-gray-500">{userData.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getRoleColor(userData.role)}>
                              {userData.role}
                            </Badge>
                            {userData.isVerified ? (
                              <Badge className="bg-green-100 text-green-800">Verified</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">Unverified</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Display current tags */}
                        <div className="flex flex-wrap gap-1">
                          {userData.tags.map((tagData: any) => {
                            const TagIcon = tagIcons[tagData.tag as keyof typeof tagIcons];
                            return (
                              <Badge 
                                key={tagData.tag} 
                                className={tagColors[tagData.tag as keyof typeof tagColors]}
                              >
                                <TagIcon className="w-3 h-3 mr-1" />
                                {tagData.tag}
                              </Badge>
                            );
                          })}
                        </div>

                        {/* Tag Management Dialog */}
                        {(userData.role === 'SELLER' || userData.role === 'COMPANY') && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedUser(userData)}
                              >
                                <Tag className="h-4 w-4 mr-2" />
                                Manage Tags
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Manage Tags for {userData.name}</DialogTitle>
                                <DialogDescription>
                                  Assign or remove verification tags for this {userData.role.toLowerCase()}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  {Object.entries(tagIcons).map(([tag, TagIcon]) => {
                                    const hasTag = userData.tags.some((t: any) => t.tag === tag);
                                    return (
                                      <Button
                                        key={tag}
                                        variant={hasTag ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleTagToggle(userData.id, tag)}
                                        disabled={isLoading}
                                        className="justify-start"
                                      >
                                        <TagIcon className="w-4 h-4 mr-2" />
                                        {tag}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-500">
                      <p>Joined: {new Date(userData.createdAt).toLocaleDateString()}</p>
                      {userData.dashboardSlug && (
                        <p>Store: /store/{userData.dashboardSlug}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}