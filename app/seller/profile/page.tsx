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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Calendar,
  Store,
  QrCode,
  Shield,
  Star,
  Award,
  Crown,
  Zap,
  Leaf,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from '@/components/ui/image-upload';

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

export default function SellerProfile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    location: '',
    website: '',
    avatar: ''
  });
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'SELLER') {
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
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          phone: profileData.phone || '',
          bio: profileData.bio || '',
          location: profileData.location || '',
          website: profileData.website || '',
          avatar: profileData.avatar || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !profile) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your seller profile and store information</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile Information</TabsTrigger>
            <TabsTrigger value="store">Store Settings</TabsTrigger>
            <TabsTrigger value="account">Account Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal information and bio</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={formData.avatar} alt={formData.name} />
                        <AvatarFallback className="text-lg">
                          {formData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Label>Profile Picture</Label>
                        <ImageUpload
                          name="avatar"
                          multiple={false}
                          maxFiles={1}
                          onUpload={(urls) => setFormData({ ...formData, avatar: urls[0] || '' })}
                          defaultImages={formData.avatar ? [formData.avatar] : []}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Business Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location">Farm Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="City, Country"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://yourfarm.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">About Your Farm</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        placeholder="Tell customers about your farm and products..."
                        rows={4}
                      />
                    </div>

                    <div className="flex space-x-4">
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={profile.avatar} alt={profile.name} />
                        <AvatarFallback className="text-lg">
                          {profile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-bold">{profile.name}</h2>
                        <p className="text-gray-600">Farm Seller</p>
                        {profile.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {profile.tags.map((tagData: any) => {
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
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{profile.email}</p>
                          </div>
                        </div>

                        {profile.phone && (
                          <div className="flex items-center space-x-3">
                            <Phone className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">Phone</p>
                              <p className="font-medium">{profile.phone}</p>
                            </div>
                          </div>
                        )}

                        {profile.location && (
                          <div className="flex items-center space-x-3">
                            <MapPin className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">Location</p>
                              <p className="font-medium">{profile.location}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {profile.website && (
                          <div className="flex items-center space-x-3">
                            <Globe className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">Website</p>
                              <a 
                                href={profile.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:underline"
                              >
                                {profile.website}
                              </a>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Seller since</p>
                            <p className="font-medium">
                              {new Date(profile.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {profile.bio && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">About Our Farm</h3>
                        <p className="text-gray-600">{profile.bio}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Store Settings</CardTitle>
                <CardDescription>Manage your online store presence</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile.dashboardSlug && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Store URL</h4>
                      <p className="text-sm text-gray-600">
                        Your public store link
                      </p>
                      <p className="text-sm text-blue-600 font-mono">
                        /store/{profile.dashboardSlug}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" asChild>
                        <a href={`/store/${profile.dashboardSlug}`} target="_blank">
                          <Store className="h-4 w-4 mr-2" />
                          View Store
                        </a>
                      </Button>
                      <Button variant="outline" asChild>
                        <a href="/seller/qr-code">
                          <QrCode className="h-4 w-4 mr-2" />
                          QR Code
                        </a>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Store Analytics</h4>
                    <p className="text-sm text-gray-600">
                      View your store performance and sales data
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/seller/analytics">View Analytics</a>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Product Management</h4>
                    <p className="text-sm text-gray-600">
                      Manage your eggs and chicken meat products
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/seller/products">Manage Products</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account security and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Email Verification</h4>
                    <p className="text-sm text-gray-600">
                      Your email address verification status
                    </p>
                  </div>
                  <Badge className={profile.isVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {profile.isVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Password</h4>
                    <p className="text-sm text-gray-600">
                      Change your account password
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="/auth/forgot-password">Change Password</a>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Verification Tags</h4>
                    <p className="text-sm text-gray-600">
                      Your seller verification and trust badges
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {profile.tags.length > 0 ? (
                      profile.tags.map((tagData: any) => {
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
                      })
                    ) : (
                      <Badge variant="outline">No tags assigned</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}