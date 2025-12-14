'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Globe,
  MapPin,
  Briefcase,
  Building,
  Twitter,
  Linkedin,
  Github,
  Facebook,
  Instagram,
  Link as LinkIcon,
  Check,
  X,
  Loader2,
  Upload,
  AlertCircle,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AuthorProfile {
  id?: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  website: string;
  location: string;
  occupation: string;
  company: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    facebook?: string;
    instagram?: string;
  };
  isPublic: boolean;
  allowComments: boolean;
  emailOnComment: boolean;
  emailOnFollow: boolean;
}

interface AuthorProfileFormProps {
  existingProfile?: AuthorProfile | null;
  onSuccess?: () => void;
}

export default function AuthorProfileForm({ existingProfile, onSuccess }: AuthorProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [profile, setProfile] = useState<AuthorProfile>({
    displayName: existingProfile?.displayName || '',
    username: existingProfile?.username || '',
    bio: existingProfile?.bio || '',
    avatarUrl: existingProfile?.avatarUrl || '',
    website: existingProfile?.website || '',
    location: existingProfile?.location || '',
    occupation: existingProfile?.occupation || '',
    company: existingProfile?.company || '',
    socialLinks: existingProfile?.socialLinks || {},
    isPublic: existingProfile?.isPublic ?? true,
    allowComments: existingProfile?.allowComments ?? true,
    emailOnComment: existingProfile?.emailOnComment ?? true,
    emailOnFollow: existingProfile?.emailOnFollow ?? true,
  });

  const isEditing = !!existingProfile?.id;

  // Debounced username check
  useEffect(() => {
    if (!profile.username || profile.username === existingProfile?.username) {
      setUsernameAvailable(null);
      setUsernameError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const response = await fetch('/api/author/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: profile.username }),
        });
        const data = await response.json();
        
        if (!data.valid) {
          setUsernameAvailable(false);
          setUsernameError(data.error);
        } else {
          setUsernameAvailable(data.available);
          setUsernameError(data.available ? null : 'Username is already taken');
        }
      } catch (error) {
        setUsernameError('Failed to check username');
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [profile.username, existingProfile?.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile.displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    if (!isEditing && !profile.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (usernameAvailable === false) {
      toast.error(usernameError || 'Please choose a different username');
      return;
    }

    setLoading(true);
    try {
      const method = isEditing ? 'PATCH' : 'POST';
      const response = await fetch('/api/author/profile', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      toast.success(isEditing ? 'Profile updated successfully' : 'Author profile created!');
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/author/dashboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'author-avatars');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setProfile(prev => ({ ...prev, avatarUrl: data.url }));
      toast.success('Avatar uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))' }}>
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.8), rgba(59, 130, 246, 0.8))' }} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
              Basic Information
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Your public author identity. This is how readers will see you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {uploading && (
                  <div className="absolute inset-0 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))', filter: 'blur(4px)' }} />
                <Avatar className="h-24 w-24 relative border-3 shadow-xl" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                  <AvatarFallback className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))' }}>
                    {profile.displayName?.charAt(0)?.toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <Label htmlFor="avatar" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))' }}>
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                        <span style={{ color: 'rgba(59, 130, 246, 0.9)' }}>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
                        <span style={{ color: 'rgba(59, 130, 246, 0.9)' }}>Upload Avatar</span>
                      </>
                    )}
                  </div>
                </Label>
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Recommended: 400x400px, max 5MB
                </p>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-gray-700 dark:text-gray-300">Display Name *</Label>
              <Input
                id="displayName"
                value={profile.displayName}
                onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Your name as shown to readers"
                required
                className="border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">Username *</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ color: 'rgba(16, 185, 129, 0.7)' }}>
                  @
                </div>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                  }))}
                  placeholder="your-username"
                  className={cn(
                    "pl-8 pr-10 border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80",
                    usernameAvailable === false && "ring-2 ring-red-400",
                    usernameAvailable === true && "ring-2 ring-emerald-400"
                  )}
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                  disabled={isEditing}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {checkingUsername && <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'rgba(59, 130, 246, 0.7)' }} />}
                  {!checkingUsername && usernameAvailable === true && <Check className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.9)' }} />}
                  {!checkingUsername && usernameAvailable === false && <X className="h-4 w-4" style={{ color: 'rgba(239, 68, 68, 0.9)' }} />}
                </div>
              </div>
              {usernameError && (
                <p className="text-sm flex items-center gap-1" style={{ color: 'rgba(239, 68, 68, 0.9)' }}>
                  <AlertCircle className="h-3 w-3" />
                  {usernameError}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Your profile URL: poultrymarket.ke/author/<span style={{ color: 'rgba(16, 185, 129, 0.8)' }}>{profile.username || 'your-username'}</span>
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-gray-700 dark:text-gray-300">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell readers about yourself, your expertise, and what you write about..."
                rows={4}
                maxLength={500}
                className="border-0 shadow-md focus:shadow-lg transition-all duration-200 resize-none dark:bg-slate-800/80"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              />
              <p className="text-xs text-gray-400 text-right">
                <span style={{ color: profile.bio.length > 450 ? 'rgba(249, 115, 22, 0.9)' : 'inherit' }}>{profile.bio.length}</span>/500
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Professional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.98)' }}>
          <div className="h-1" style={{ background: 'rgba(59, 130, 246, 0.6)' }} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" style={{ color: 'rgba(59, 130, 246, 0.8)' }} />
              Professional Information
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Optional details about your work and expertise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="occupation" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Briefcase className="h-4 w-4" style={{ color: 'rgba(59, 130, 246, 0.7)' }} />
                  Occupation
                </Label>
                <Input
                  id="occupation"
                  value={profile.occupation}
                  onChange={(e) => setProfile(prev => ({ ...prev, occupation: e.target.value }))}
                  placeholder="e.g., Poultry Farmer, Veterinarian"
                  className="border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Building className="h-4 w-4" style={{ color: 'rgba(16, 185, 129, 0.7)' }} />
                  Company / Farm
                </Label>
                <Input
                  id="company"
                  value={profile.company}
                  onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g., Sunrise Poultry Farm"
                  className="border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <MapPin className="h-4 w-4" style={{ color: 'rgba(249, 115, 22, 0.7)' }} />
                  Location
                </Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Nairobi, Kenya"
                  className="border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Globe className="h-4 w-4" style={{ color: 'rgba(139, 92, 246, 0.7)' }} />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Social Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.98)' }}>
          <div className="h-1" style={{ background: 'rgba(249, 115, 22, 0.6)' }} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" style={{ color: 'rgba(249, 115, 22, 0.8)' }} />
              Social Links
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Connect your social profiles to help readers find you elsewhere.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Twitter className="h-4 w-4" style={{ color: 'rgba(29, 161, 242, 0.8)' }} />
                  Twitter / X
                </Label>
                <Input
                  id="twitter"
                  value={profile.socialLinks.twitter || ''}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                  }))}
                  placeholder="@username or full URL"
                  className="border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Linkedin className="h-4 w-4" style={{ color: 'rgba(10, 102, 194, 0.8)' }} />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={profile.socialLinks.linkedin || ''}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, linkedin: e.target.value }
                  }))}
                  placeholder="Profile URL or username"
                  className="border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Facebook className="h-4 w-4" style={{ color: 'rgba(24, 119, 242, 0.8)' }} />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  value={profile.socialLinks.facebook || ''}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, facebook: e.target.value }
                  }))}
                  placeholder="Profile URL or username"
                  className="border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Instagram className="h-4 w-4" style={{ color: 'rgba(228, 64, 95, 0.8)' }} />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  value={profile.socialLinks.instagram || ''}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                  }))}
                  placeholder="@username"
                  className="border-0 shadow-md focus:shadow-lg transition-all duration-200 dark:bg-slate-800/80"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-xl overflow-hidden dark:bg-slate-900/80" style={{ background: 'rgba(255,255,255,0.98)' }}>
          <div className="h-1" style={{ background: 'rgba(139, 92, 246, 0.6)' }} />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
              Privacy & Notifications
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Control your profile visibility and notification preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl transition-all duration-200" style={{ background: profile.isPublic ? 'rgba(16, 185, 129, 0.05)' : 'rgba(156, 163, 175, 0.05)' }}>
              <div className="space-y-0.5">
                <Label className="text-gray-700 dark:text-gray-300">Public Profile</Label>
                <p className="text-sm text-gray-400">
                  Allow anyone to view your author profile
                </p>
              </div>
              <Switch
                checked={profile.isPublic}
                onCheckedChange={(checked) => setProfile(prev => ({ ...prev, isPublic: checked }))}
              />
            </div>
            <Separator style={{ background: 'rgba(16, 185, 129, 0.1)' }} />
            <div className="flex items-center justify-between p-4 rounded-xl transition-all duration-200" style={{ background: profile.allowComments ? 'rgba(59, 130, 246, 0.05)' : 'rgba(156, 163, 175, 0.05)' }}>
              <div className="space-y-0.5">
                <Label className="text-gray-700 dark:text-gray-300">Allow Comments</Label>
                <p className="text-sm text-gray-400">
                  Enable comments on your blog posts
                </p>
              </div>
              <Switch
                checked={profile.allowComments}
                onCheckedChange={(checked) => setProfile(prev => ({ ...prev, allowComments: checked }))}
              />
            </div>
            <Separator style={{ background: 'rgba(59, 130, 246, 0.1)' }} />
            <div className="flex items-center justify-between p-4 rounded-xl transition-all duration-200" style={{ background: profile.emailOnComment ? 'rgba(249, 115, 22, 0.05)' : 'rgba(156, 163, 175, 0.05)' }}>
              <div className="space-y-0.5">
                <Label className="text-gray-700 dark:text-gray-300">Email on Comments</Label>
                <p className="text-sm text-gray-400">
                  Receive email notifications for new comments
                </p>
              </div>
              <Switch
                checked={profile.emailOnComment}
                onCheckedChange={(checked) => setProfile(prev => ({ ...prev, emailOnComment: checked }))}
              />
            </div>
            <Separator style={{ background: 'rgba(249, 115, 22, 0.1)' }} />
            <div className="flex items-center justify-between p-4 rounded-xl transition-all duration-200" style={{ background: profile.emailOnFollow ? 'rgba(139, 92, 246, 0.05)' : 'rgba(156, 163, 175, 0.05)' }}>
              <div className="space-y-0.5">
                <Label className="text-gray-700 dark:text-gray-300">Email on Follow</Label>
                <p className="text-sm text-gray-400">
                  Receive email notifications when someone follows you
                </p>
              </div>
              <Switch
                checked={profile.emailOnFollow}
                onCheckedChange={(checked) => setProfile(prev => ({ ...prev, emailOnFollow: checked }))}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-end gap-4 pt-4"
      >
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          disabled={loading || uploading}
          className="border-0 shadow-md hover:shadow-lg transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || uploading}
          className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(59, 130, 246, 0.9))' }}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Save Changes' : 'Create Profile'}
            </>
          )}
        </Button>
      </motion.div>
    </form>
  );
}
