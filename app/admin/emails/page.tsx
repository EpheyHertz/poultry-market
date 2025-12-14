'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { 
  Mail, 
  Users, 
  Send, 
  Search, 
  Filter,
  UserCheck,
  Building2,
  ShoppingBag,
  Briefcase,
  Shield,
  Truck,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Eye,
  RefreshCw,
  FileText,
  Zap,
  Globe,
  Link,
  Plus,
  Trash2,
  BadgeCheck,
  Code,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  _count: {
    orders: number;
    products: number;
  };
}

interface RoleCounts {
  [key: string]: number;
}

interface VerifiedCounts {
  verified: number;
  unverified: number;
}

interface EmailLink {
  text: string;
  url: string;
}

// Role configurations
const roleConfig = {
  CUSTOMER: {
    icon: ShoppingBag,
    label: 'Customers',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    description: 'Regular buyers on the platform',
  },
  SELLER: {
    icon: UserCheck,
    label: 'Sellers',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    description: 'Individual poultry sellers',
  },
  COMPANY: {
    icon: Building2,
    label: 'Companies',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    description: 'Business accounts',
  },
  STAKEHOLDER: {
    icon: Briefcase,
    label: 'Stakeholders',
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    description: 'Industry stakeholders',
  },
  DELIVERY_AGENT: {
    icon: Truck,
    label: 'Delivery Agents',
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    description: 'Delivery partners',
  },
  ADMIN: {
    icon: Shield,
    label: 'Admins',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    description: 'System administrators',
  },
};

// Email templates
const emailTemplates = [
  {
    id: 'welcome',
    name: 'Welcome',
    icon: Sparkles,
    subject: 'Welcome to PoultryMarket! 🐔',
    content: `We're thrilled to have you join Kenya's premier poultry marketplace!

At PoultryMarket, we connect farmers, sellers, and buyers across the country to create a thriving poultry ecosystem.

Here's what you can do:
• Browse quality poultry products from verified sellers
• Connect directly with farmers and suppliers
• Enjoy secure transactions and reliable delivery

If you have any questions, our support team is always here to help.`,
  },
  {
    id: 'promotion',
    name: 'Promo',
    icon: Zap,
    subject: 'Special Offer Just for You! 🎉',
    content: `Great news! We have an exclusive offer waiting for you.

Don't miss out on amazing deals from top sellers on PoultryMarket. Whether you're looking for fresh eggs, quality chicken meat, or reliable chicks, we've got you covered.

This offer is available for a limited time only. Visit our marketplace today and discover incredible savings!`,
  },
  {
    id: 'update',
    name: 'Update',
    icon: Globe,
    subject: 'Important Update from PoultryMarket',
    content: `We wanted to keep you informed about some exciting updates to PoultryMarket.

We've been working hard to improve your experience on our platform. Here's what's new:

• Enhanced search and filtering
• Improved order tracking
• Better seller verification system
• Faster checkout process

Thank you for being part of our community. Your feedback helps us grow better every day.`,
  },
  {
    id: 'custom',
    name: 'Custom',
    icon: FileText,
    subject: '',
    content: '',
  },
];

export default function AdminEmailsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({});
  const [verifiedCounts, setVerifiedCounts] = useState<VerifiedCounts>({ verified: 0, unverified: 0 });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');
  const [sendMode, setSendMode] = useState<'individual' | 'bulk' | 'role'>('individual');
  const [targetRole, setTargetRole] = useState<string>('');
  
  // Email form state
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState<EmailLink[]>([]);
  const [senderName, setSenderName] = useState('');
  const [emailFormat, setEmailFormat] = useState<'html' | 'text'>('html');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  
  // UI state
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  // Check auth
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
          setSenderName(userData.name || 'PoultryMarket Admin');
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (verifiedFilter !== 'all') params.append('verified', verifiedFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/emails?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setRoleCounts(data.roleCounts);
        if (data.verifiedCounts) {
          setVerifiedCounts(data.verifiedCounts);
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    }
  }, [roleFilter, verifiedFilter, searchTerm]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = emailTemplates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setContent(template.content);
    }
  };

  // Handle user selection
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  // Link management
  const addLink = () => {
    setLinks([...links, { text: '', url: '' }]);
  };

  const updateLink = (index: number, field: 'text' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  // Get recipient count based on send mode
  const getRecipientCount = () => {
    if (sendMode === 'role' && targetRole) {
      const count = roleCounts[targetRole] || 0;
      if (verifiedOnly) {
        // This is an estimate - actual count will be determined by API
        return `~${count}`;
      }
      return count;
    }
    return selectedUsers.length;
  };

  // Send emails
  const handleSendEmails = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Please fill in subject and content');
      return;
    }

    if (sendMode === 'role' && !targetRole) {
      toast.error('Please select a role to send to');
      return;
    }

    if ((sendMode === 'individual' || sendMode === 'bulk') && selectedUsers.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    // Filter out empty links
    const validLinks = links.filter(l => l.text.trim() && l.url.trim());

    setSending(true);
    try {
      const response = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: sendMode,
          recipients: sendMode !== 'role' ? selectedUsers : undefined,
          role: sendMode === 'role' ? targetRole : undefined,
          verifiedOnly,
          subject,
          content,
          links: validLinks.length > 0 ? validLinks : undefined,
          senderName,
          format: emailFormat,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSendResult(result);
        setShowConfirmDialog(false);
        toast.success(`Successfully sent ${result.success} emails!`);
        
        // Reset form
        setSelectedUsers([]);
        if (selectedTemplate !== 'custom') {
          handleTemplateSelect('custom');
        }
        setLinks([]);
      } else {
        toast.error(result.error || 'Failed to send emails');
      }
    } catch (error) {
      toast.error('An error occurred while sending emails');
    } finally {
      setSending(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const totalUsers = Object.values(roleCounts).reduce((a, b) => a + b, 0);

  return (
    <DashboardLayout user={user}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -m-4 sm:-m-6 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/20">
                  <Mail className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                Email Center
              </h1>
              <p className="text-slate-400 mt-1 text-sm sm:text-base">
                Send personalized emails to users
              </p>
            </div>
            
            <Button
              onClick={() => fetchUsers()}
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards - Scrollable on mobile */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 scrollbar-hide">
            {Object.entries(roleConfig).map(([role, config]) => {
              const Icon = config.icon;
              const count = roleCounts[role] || 0;
              return (
                <Card
                  key={role}
                  className={cn(
                    'bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer flex-shrink-0 w-[140px] sm:w-auto',
                    sendMode === 'role' && targetRole === role && 'ring-2 ring-emerald-500 border-emerald-500/50'
                  )}
                  onClick={() => {
                    setSendMode('role');
                    setTargetRole(role);
                  }}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={cn('p-1.5 sm:p-2 rounded-lg', config.bgColor)}>
                        <Icon className={cn('h-3 w-3 sm:h-4 sm:w-4', config.textColor)} />
                      </div>
                      <div>
                        <p className="text-lg sm:text-2xl font-bold text-white">{count}</p>
                        <p className="text-[10px] sm:text-xs text-slate-400">{config.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Verified Stats */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Card 
              className={cn(
                'bg-slate-800/50 border-slate-700/50 cursor-pointer transition-all',
                verifiedFilter === 'true' && 'ring-2 ring-emerald-500'
              )}
              onClick={() => setVerifiedFilter(verifiedFilter === 'true' ? 'all' : 'true')}
            >
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold text-white">{verifiedCounts.verified}</p>
                  <p className="text-xs text-slate-400">Verified Users</p>
                </div>
              </CardContent>
            </Card>
            <Card 
              className={cn(
                'bg-slate-800/50 border-slate-700/50 cursor-pointer transition-all',
                verifiedFilter === 'false' && 'ring-2 ring-orange-500'
              )}
              onClick={() => setVerifiedFilter(verifiedFilter === 'false' ? 'all' : 'false')}
            >
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-bold text-white">{verifiedCounts.unverified}</p>
                  <p className="text-xs text-slate-400">Unverified Users</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Left Panel - User Selection */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                      Recipients
                    </CardTitle>
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
                      {getRecipientCount()} selected
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400 text-xs sm:text-sm">
                    Select users individually or by category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-3 sm:px-6">
                  {/* Send Mode Tabs */}
                  <Tabs value={sendMode} onValueChange={(v) => setSendMode(v as any)}>
                    <TabsList className="grid grid-cols-3 bg-slate-900/50 h-9 sm:h-10">
                      <TabsTrigger
                        value="individual"
                        className="text-xs sm:text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                      >
                        Individual
                      </TabsTrigger>
                      <TabsTrigger
                        value="bulk"
                        className="text-xs sm:text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                      >
                        Bulk
                      </TabsTrigger>
                      <TabsTrigger
                        value="role"
                        className="text-xs sm:text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                      >
                        By Role
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="role" className="mt-4 space-y-3">
                      <Select value={targetRole} onValueChange={setTargetRole}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white text-sm">
                          <SelectValue placeholder="Select user role..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {Object.entries(roleConfig).map(([role, config]) => {
                            const Icon = config.icon;
                            return (
                              <SelectItem key={role} value={role} className="text-white focus:bg-slate-700">
                                <div className="flex items-center gap-2">
                                  <Icon className={cn('h-4 w-4', config.textColor)} />
                                  <span>{config.label}</span>
                                  <span className="text-slate-400">({roleCounts[role] || 0})</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      
                      {/* Verified Only Toggle */}
                      <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4 text-emerald-400" />
                          <span className="text-sm text-slate-300">Verified only</span>
                        </div>
                        <Switch
                          checked={verifiedOnly}
                          onCheckedChange={setVerifiedOnly}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                      
                      {targetRole && (
                        <div className={cn(
                          'p-3 rounded-lg border',
                          roleConfig[targetRole as keyof typeof roleConfig]?.bgColor,
                          roleConfig[targetRole as keyof typeof roleConfig]?.borderColor
                        )}>
                          <p className="text-sm text-slate-300">
                            {roleConfig[targetRole as keyof typeof roleConfig]?.description}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Will send to <strong className="text-white">{roleCounts[targetRole] || 0}</strong> users
                            {verifiedOnly && <span className="text-emerald-400"> (verified only)</span>}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Individual & Bulk tabs share similar UI */}
                    {['individual', 'bulk'].map((tabValue) => (
                      <TabsContent key={tabValue} value={tabValue} className="mt-4">
                        {/* Search and Filter */}
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Search users..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 text-sm h-9 sm:h-10"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white text-xs sm:text-sm h-9 sm:h-10">
                                <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-slate-400" />
                                <SelectValue placeholder="Role" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="all" className="text-white focus:bg-slate-700">All Roles</SelectItem>
                                {Object.entries(roleConfig).map(([role, config]) => (
                                  <SelectItem key={role} value={role} className="text-white focus:bg-slate-700">
                                    {config.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                              <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white text-xs sm:text-sm h-9 sm:h-10">
                                <BadgeCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-slate-400" />
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="all" className="text-white focus:bg-slate-700">All Status</SelectItem>
                                <SelectItem value="true" className="text-white focus:bg-slate-700">Verified</SelectItem>
                                <SelectItem value="false" className="text-white focus:bg-slate-700">Unverified</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* User List */}
                        <ScrollArea className="h-[250px] sm:h-[300px] mt-4 pr-2 sm:pr-4">
                          <div className="space-y-2">
                            {users.map((u) => {
                              const config = roleConfig[u.role as keyof typeof roleConfig];
                              const isSelected = selectedUsers.includes(u.id);
                              
                              return (
                                <div
                                  key={u.id}
                                  onClick={() => toggleUserSelection(u.id)}
                                  className={cn(
                                    'flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer transition-all',
                                    'border border-transparent',
                                    isSelected
                                      ? 'bg-emerald-500/10 border-emerald-500/50'
                                      : 'bg-slate-900/30 hover:bg-slate-800/50'
                                  )}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    className="border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 h-4 w-4"
                                  />
                                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                                    <AvatarImage src={u.avatar || undefined} />
                                    <AvatarFallback className="bg-slate-700 text-white text-xs">
                                      {u.name?.charAt(0)?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <p className="text-xs sm:text-sm font-medium text-white truncate">{u.name}</p>
                                      {u.isVerified && <BadgeCheck className="h-3 w-3 text-emerald-400 flex-shrink-0" />}
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">{u.email}</p>
                                  </div>
                                  <Badge className={cn('text-[10px] sm:text-xs hidden sm:inline-flex', config?.bgColor, config?.textColor)}>
                                    {u.role}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>

                        {/* Select All */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllUsers}
                            className="text-slate-400 hover:text-white text-xs sm:text-sm h-8"
                          >
                            {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                          </Button>
                          <span className="text-xs sm:text-sm text-slate-400">
                            {selectedUsers.length}/{users.length}
                          </span>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Email Composer */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-3 px-3 sm:px-6">
                  <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                    Compose Email
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs sm:text-sm">
                    Select a template or write a custom message
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
                  {/* Email Format Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-300">Format:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={emailFormat === 'html' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setEmailFormat('html')}
                          className={cn(
                            'h-7 sm:h-8 text-xs',
                            emailFormat === 'html' 
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                              : 'text-slate-400 hover:text-white'
                          )}
                        >
                          <Code className="h-3 w-3 mr-1" />
                          HTML
                        </Button>
                        <Button
                          variant={emailFormat === 'text' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setEmailFormat('text')}
                          className={cn(
                            'h-7 sm:h-8 text-xs',
                            emailFormat === 'text' 
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                              : 'text-slate-400 hover:text-white'
                          )}
                        >
                          <Type className="h-3 w-3 mr-1" />
                          Text
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Templates */}
                  <div className="space-y-2 sm:space-y-3">
                    <Label className="text-slate-300 text-xs sm:text-sm">Template</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {emailTemplates.map((template) => {
                        const Icon = template.icon;
                        const isSelected = selectedTemplate === template.id;
                        return (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateSelect(template.id)}
                            className={cn(
                              'flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border transition-all',
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                : 'bg-slate-900/30 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                            )}
                          >
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="text-[10px] sm:text-xs font-medium">{template.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-300 text-xs sm:text-sm">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 text-sm h-9 sm:h-10"
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-slate-300 text-xs sm:text-sm">Message</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your email message..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                      className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 resize-none text-sm"
                    />
                    <p className="text-[10px] sm:text-xs text-slate-500">
                      Use line breaks to separate paragraphs
                    </p>
                  </div>

                  {/* Links Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300 text-xs sm:text-sm flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        Links
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addLink}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 sm:h-8 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Link
                      </Button>
                    </div>
                    
                    {links.length > 0 && (
                      <div className="space-y-2">
                        {links.map((link, index) => (
                          <div key={index} className="flex gap-2 items-start">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Link text"
                                value={link.text}
                                onChange={(e) => updateLink(index, 'text', e.target.value)}
                                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 text-xs h-8 sm:h-9"
                              />
                              <Input
                                placeholder="URL (e.g., /products)"
                                value={link.url}
                                onChange={(e) => updateLink(index, 'url', e.target.value)}
                                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 text-xs h-8 sm:h-9"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLink(index)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {links.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-2">
                        No links added. Click &quot;Add Link&quot; to include action buttons.
                      </p>
                    )}
                  </div>

                  {/* Sender Name */}
                  <div className="space-y-2">
                    <Label htmlFor="senderName" className="text-slate-300 text-xs sm:text-sm">Sender Name</Label>
                    <Input
                      id="senderName"
                      placeholder="The PoultryMarket Team"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 text-sm h-9 sm:h-10"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(true)}
                      className="border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-700 hover:text-white h-9 sm:h-10 text-sm"
                      disabled={!subject || !content}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={!subject || !content || (typeof getRecipientCount() === 'number' ? getRecipientCount() === 0 : false)}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20 h-9 sm:h-10 text-sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send to {getRecipientCount()} {typeof getRecipientCount() === 'number' && getRecipientCount() === 1 ? 'User' : 'Users'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Send Result */}
              {sendResult && (
                <Card className={cn(
                  'border',
                  sendResult.failed === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                )}>
                  <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {sendResult.failed === 0 ? (
                        <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">
                          {sendResult.failed === 0 ? 'Emails Sent Successfully!' : 'Emails Sent with Issues'}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300">
                          Sent: <strong className="text-emerald-400">{sendResult.success}</strong> | 
                          Failed: <strong className={sendResult.failed > 0 ? 'text-red-400' : 'text-slate-400'}>{sendResult.failed}</strong>
                        </p>
                        {sendResult.errors?.length > 0 && (
                          <div className="mt-3 p-2 sm:p-3 bg-slate-900/50 rounded-lg">
                            <p className="text-xs text-slate-400 mb-2">Errors:</p>
                            {sendResult.errors.map((err: string, i: number) => (
                              <p key={i} className="text-[10px] sm:text-xs text-red-400">{err}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSendResult(null)}
                        className="text-slate-400 hover:text-white h-8 w-8 p-0"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white max-h-[90vh] overflow-hidden mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                Email Preview ({emailFormat.toUpperCase()})
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs sm:text-sm">
                This is how your email will appear to recipients
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              {emailFormat === 'html' ? (
                <div className="bg-slate-100 rounded-lg p-2 sm:p-4">
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Preview Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 sm:p-6 text-white">
                      <h2 className="text-lg sm:text-xl font-bold">🐔 PoultryMarket</h2>
                      <p className="text-xs sm:text-sm opacity-90">Kenya&apos;s Premier Poultry Marketplace</p>
                    </div>
                    {/* Preview Body */}
                    <div className="p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
                        Hello [Recipient Name] 👋
                      </h3>
                      <div className="text-gray-600 space-y-3 text-sm">
                        {content.split('\n').filter(Boolean).map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                      {links.filter(l => l.text && l.url).length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                          {links.filter(l => l.text && l.url).map((link, i) => (
                            <span key={i} className="inline-block bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                              {link.text} →
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <p className="text-gray-500 text-xs sm:text-sm">
                          Best regards,<br />
                          <strong className="text-gray-700">{senderName || 'The PoultryMarket Team'}</strong>
                        </p>
                      </div>
                    </div>
                    {/* Preview Footer */}
                    <div className="bg-gray-50 p-3 sm:p-4 text-center text-[10px] sm:text-xs text-gray-500">
                      <p>This email was sent from PoultryMarket Admin</p>
                      <p>© {new Date().getFullYear()} PoultryMarket. All rights reserved.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs sm:text-sm text-slate-300 whitespace-pre-wrap">
                  {`Hello [Recipient Name],

${content}${links.filter(l => l.text && l.url).length > 0 ? `

---
Links:
${links.filter(l => l.text && l.url).map(l => `• ${l.text}: ${l.url}`).join('\n')}` : ''}

---
Best regards,
${senderName || 'The PoultryMarket Team'}

© ${new Date().getFullYear()} PoultryMarket. All rights reserved.`}
                </div>
              )}
            </ScrollArea>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-700 text-sm h-9"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Send Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white mx-4 sm:mx-auto max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Send className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                Confirm Send
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs sm:text-sm">
                You are about to send an email to {getRecipientCount()} {typeof getRecipientCount() === 'number' && getRecipientCount() === 1 ? 'user' : 'users'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-slate-900/50 rounded-lg p-3 sm:p-4 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Recipients:</span>
                  <span className="text-white font-medium">
                    {sendMode === 'role' 
                      ? `All ${roleConfig[targetRole as keyof typeof roleConfig]?.label || targetRole}`
                      : `${getRecipientCount()} selected`
                    }
                    {verifiedOnly && sendMode === 'role' && <span className="text-emerald-400 text-xs"> (verified)</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subject:</span>
                  <span className="text-white font-medium truncate max-w-[150px] sm:max-w-[200px]">{subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Format:</span>
                  <span className="text-white font-medium">{emailFormat.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Links:</span>
                  <span className="text-white font-medium">{links.filter(l => l.text && l.url).length}</span>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-amber-200">
                  This action cannot be undone. Make sure you have reviewed the email content.
                </p>
              </div>
            </div>
            
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-700 text-sm h-9 w-full sm:w-auto"
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmails}
                disabled={sending}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm h-9 w-full sm:w-auto"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Emails
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
