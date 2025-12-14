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
    name: 'Welcome Message',
    icon: Sparkles,
    subject: 'Welcome to PoultryMarket! 🐔',
    content: `We're thrilled to have you join Kenya's premier poultry marketplace!

At PoultryMarket, we connect farmers, sellers, and buyers across the country to create a thriving poultry ecosystem.

Here's what you can do:
• Browse quality poultry products from verified sellers
• Connect directly with farmers and suppliers
• Enjoy secure transactions and reliable delivery

If you have any questions, our support team is always here to help.`,
    ctaText: 'Explore Products',
    ctaUrl: '/products',
  },
  {
    id: 'promotion',
    name: 'Promotional',
    icon: Zap,
    subject: 'Special Offer Just for You! 🎉',
    content: `Great news! We have an exclusive offer waiting for you.

Don't miss out on amazing deals from top sellers on PoultryMarket. Whether you're looking for fresh eggs, quality chicken meat, or reliable chicks, we've got you covered.

This offer is available for a limited time only. Visit our marketplace today and discover incredible savings!`,
    ctaText: 'Shop Now',
    ctaUrl: '/products',
  },
  {
    id: 'update',
    name: 'Platform Update',
    icon: Globe,
    subject: 'Important Update from PoultryMarket',
    content: `We wanted to keep you informed about some exciting updates to PoultryMarket.

We've been working hard to improve your experience on our platform. Here's what's new:

• Enhanced search and filtering
• Improved order tracking
• Better seller verification system
• Faster checkout process

Thank you for being part of our community. Your feedback helps us grow better every day.`,
    ctaText: 'See What\'s New',
    ctaUrl: '/',
  },
  {
    id: 'custom',
    name: 'Custom Message',
    icon: FileText,
    subject: '',
    content: '',
    ctaText: '',
    ctaUrl: '',
  },
];

export default function AdminEmailsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({});
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sendMode, setSendMode] = useState<'individual' | 'bulk' | 'role'>('individual');
  const [targetRole, setTargetRole] = useState<string>('');
  
  // Email form state
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [senderName, setSenderName] = useState('');
  
  // UI state
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);
  const [expandedStats, setExpandedStats] = useState(true);

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
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/emails?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setRoleCounts(data.roleCounts);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users');
    }
  }, [roleFilter, searchTerm]);

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
      setCtaText(template.ctaText);
      setCtaUrl(template.ctaUrl);
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

  // Get recipient count based on send mode
  const getRecipientCount = () => {
    if (sendMode === 'role' && targetRole) {
      return roleCounts[targetRole] || 0;
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

    setSending(true);
    try {
      const response = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: sendMode,
          recipients: sendMode !== 'role' ? selectedUsers : undefined,
          role: sendMode === 'role' ? targetRole : undefined,
          subject,
          content,
          ctaText: ctaText || undefined,
          ctaUrl: ctaUrl || undefined,
          senderName,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -m-6 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                Email Center
              </h1>
              <p className="text-slate-400 mt-1">
                Send personalized emails to users or broadcast to categories
              </p>
            </div>
            
            <Button
              onClick={() => fetchUsers()}
              variant="outline"
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(roleConfig).map(([role, config]) => {
              const Icon = config.icon;
              const count = roleCounts[role] || 0;
              return (
                <Card
                  key={role}
                  className={cn(
                    'bg-slate-800/50 border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer',
                    sendMode === 'role' && targetRole === role && 'ring-2 ring-emerald-500 border-emerald-500/50'
                  )}
                  onClick={() => {
                    setSendMode('role');
                    setTargetRole(role);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg', config.bgColor)}>
                        <Icon className={cn('h-4 w-4', config.textColor)} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{count}</p>
                        <p className="text-xs text-slate-400">{config.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Panel - User Selection */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-400" />
                      Recipients
                    </CardTitle>
                    <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                      {getRecipientCount()} selected
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400">
                    Select users individually or by category
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Send Mode Tabs */}
                  <Tabs value={sendMode} onValueChange={(v) => setSendMode(v as any)}>
                    <TabsList className="grid grid-cols-3 bg-slate-900/50">
                      <TabsTrigger
                        value="individual"
                        className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                      >
                        Individual
                      </TabsTrigger>
                      <TabsTrigger
                        value="bulk"
                        className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                      >
                        Bulk
                      </TabsTrigger>
                      <TabsTrigger
                        value="role"
                        className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
                      >
                        By Role
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="role" className="mt-4 space-y-3">
                      <Select value={targetRole} onValueChange={setTargetRole}>
                        <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
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
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="individual" className="mt-4">
                      {/* Search and Filter */}
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </div>
                        
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                          <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                            <Filter className="h-4 w-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Filter by role" />
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
                      </div>

                      {/* User List */}
                      <ScrollArea className="h-[300px] mt-4 pr-4">
                        <div className="space-y-2">
                          {users.map((u) => {
                            const config = roleConfig[u.role as keyof typeof roleConfig];
                            const Icon = config?.icon || Users;
                            const isSelected = selectedUsers.includes(u.id);
                            
                            return (
                              <div
                                key={u.id}
                                onClick={() => toggleUserSelection(u.id)}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                                  'border border-transparent',
                                  isSelected
                                    ? 'bg-emerald-500/10 border-emerald-500/50'
                                    : 'bg-slate-900/30 hover:bg-slate-800/50'
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className="border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={u.avatar || undefined} />
                                  <AvatarFallback className="bg-slate-700 text-white text-xs">
                                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{u.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                </div>
                                <Badge className={cn('text-xs', config?.bgColor, config?.textColor)}>
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
                          className="text-slate-400 hover:text-white"
                        >
                          {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        <span className="text-sm text-slate-400">
                          {selectedUsers.length} of {users.length} selected
                        </span>
                      </div>
                    </TabsContent>

                    <TabsContent value="bulk" className="mt-4">
                      {/* Same as individual but with bulk messaging context */}
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                          />
                        </div>
                        
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                          <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                            <Filter className="h-4 w-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Filter by role" />
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
                      </div>

                      <ScrollArea className="h-[300px] mt-4 pr-4">
                        <div className="space-y-2">
                          {users.map((u) => {
                            const config = roleConfig[u.role as keyof typeof roleConfig];
                            const Icon = config?.icon || Users;
                            const isSelected = selectedUsers.includes(u.id);
                            
                            return (
                              <div
                                key={u.id}
                                onClick={() => toggleUserSelection(u.id)}
                                className={cn(
                                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                                  'border border-transparent',
                                  isSelected
                                    ? 'bg-emerald-500/10 border-emerald-500/50'
                                    : 'bg-slate-900/30 hover:bg-slate-800/50'
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className="border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={u.avatar || undefined} />
                                  <AvatarFallback className="bg-slate-700 text-white text-xs">
                                    {u.name?.charAt(0)?.toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{u.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                </div>
                                <Badge className={cn('text-xs', config?.bgColor, config?.textColor)}>
                                  {u.role}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAllUsers}
                          className="text-slate-400 hover:text-white"
                        >
                          {selectedUsers.length === users.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        <span className="text-sm text-slate-400">
                          {selectedUsers.length} of {users.length} selected
                        </span>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Email Composer */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-400" />
                    Compose Email
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Select a template or write a custom message
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Templates */}
                  <div className="space-y-3">
                    <Label className="text-slate-300">Email Template</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {emailTemplates.map((template) => {
                        const Icon = template.icon;
                        const isSelected = selectedTemplate === template.id;
                        return (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateSelect(template.id)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                              isSelected
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                                : 'bg-slate-900/30 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs font-medium">{template.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-300">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-slate-300">Message</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your email message..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={8}
                      className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500 resize-none"
                    />
                    <p className="text-xs text-slate-500">
                      Tip: Use line breaks to separate paragraphs. They will be converted to proper HTML formatting.
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ctaText" className="text-slate-300">Button Text (Optional)</Label>
                      <Input
                        id="ctaText"
                        placeholder="e.g., Shop Now"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctaUrl" className="text-slate-300">Button URL (Optional)</Label>
                      <Input
                        id="ctaUrl"
                        placeholder="e.g., /products"
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Sender Name */}
                  <div className="space-y-2">
                    <Label htmlFor="senderName" className="text-slate-300">Sender Name</Label>
                    <Input
                      id="senderName"
                      placeholder="The PoultryMarket Team"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-emerald-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowPreview(true)}
                      className="border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                      disabled={!subject || !content}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={!subject || !content || getRecipientCount() === 0}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send to {getRecipientCount()} {getRecipientCount() === 1 ? 'User' : 'Users'}
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
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {sendResult.failed === 0 ? (
                        <CheckCircle2 className="h-8 w-8 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-amber-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">
                          {sendResult.failed === 0 ? 'Emails Sent Successfully!' : 'Emails Sent with Issues'}
                        </h3>
                        <p className="text-sm text-slate-300">
                          Sent: <strong className="text-emerald-400">{sendResult.success}</strong> | 
                          Failed: <strong className={sendResult.failed > 0 ? 'text-red-400' : 'text-slate-400'}>{sendResult.failed}</strong>
                        </p>
                        {sendResult.errors?.length > 0 && (
                          <div className="mt-3 p-3 bg-slate-900/50 rounded-lg">
                            <p className="text-xs text-slate-400 mb-2">Errors:</p>
                            {sendResult.errors.map((err: string, i: number) => (
                              <p key={i} className="text-xs text-red-400">{err}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSendResult(null)}
                        className="text-slate-400 hover:text-white"
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
          <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-400" />
                Email Preview
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                This is how your email will appear to recipients
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="bg-slate-100 rounded-lg p-4">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Preview Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white">
                    <h2 className="text-xl font-bold">🐔 PoultryMarket</h2>
                    <p className="text-sm opacity-90">Kenya&apos;s Premier Poultry Marketplace</p>
                  </div>
                  {/* Preview Body */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Hello [Recipient Name] 👋
                    </h3>
                    <div className="text-gray-600 space-y-3">
                      {content.split('\n').filter(Boolean).map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                    {ctaText && ctaUrl && (
                      <div className="mt-6">
                        <span className="inline-block bg-emerald-500 text-white px-6 py-3 rounded-lg font-semibold">
                          {ctaText} →
                        </span>
                      </div>
                    )}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <p className="text-gray-500 text-sm">
                        Best regards,<br />
                        <strong className="text-gray-700">{senderName || 'The PoultryMarket Team'}</strong>
                      </p>
                    </div>
                  </div>
                  {/* Preview Footer */}
                  <div className="bg-gray-50 p-4 text-center text-xs text-gray-500">
                    <p>This email was sent from PoultryMarket Admin</p>
                    <p>© {new Date().getFullYear()} PoultryMarket. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-700"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Send Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-400" />
                Confirm Send
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                You are about to send an email to {getRecipientCount()} {getRecipientCount() === 1 ? 'user' : 'users'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Recipients:</span>
                  <span className="text-white font-medium">
                    {sendMode === 'role' 
                      ? `All ${roleConfig[targetRole as keyof typeof roleConfig]?.label || targetRole}`
                      : `${getRecipientCount()} selected users`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subject:</span>
                  <span className="text-white font-medium truncate max-w-[200px]">{subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">From:</span>
                  <span className="text-white font-medium">{senderName}</span>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">
                  This action cannot be undone. Make sure you have reviewed the email content and recipient list.
                </p>
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-700"
                disabled={sending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendEmails}
                disabled={sending}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
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
