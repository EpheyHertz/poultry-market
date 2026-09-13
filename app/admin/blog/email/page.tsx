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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    Mail,
    Users,
    Send,
    Eye,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    Ban,
    UserCheck,
    UserX,
    Trash2,
    Inbox,
    Clock,
    TrendingUp,
    Settings as SettingsIcon,
    FileText,
    Search,
} from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/* Constants (kept inline so this client bundle never imports server code) */
/* ------------------------------------------------------------------ */

const BLOG_TOPICS: { value: string; label: string }[] = [
    { value: 'FARMING_TIPS', label: 'Farming Tips' },
    { value: 'POULTRY_HEALTH', label: 'Poultry Health' },
    { value: 'FEED_NUTRITION', label: 'Feed & Nutrition' },
    { value: 'EQUIPMENT_GUIDES', label: 'Equipment Guides' },
    { value: 'MARKET_TRENDS', label: 'Market Trends' },
    { value: 'SUCCESS_STORIES', label: 'Success Stories' },
    { value: 'INDUSTRY_NEWS', label: 'Industry News' },
    { value: 'SEASONAL_ADVICE', label: 'Seasonal Advice' },
    { value: 'BEGINNER_GUIDES', label: 'Beginner Guides' },
    { value: 'ADVANCED_TECHNIQUES', label: 'Advanced Techniques' },
];

const CAMPAIGN_TYPES = [
    { value: 'NEWSLETTER', label: 'Newsletter' },
    { value: 'ANNOUNCEMENT', label: 'Announcement' },
    { value: 'WEEKLY_DIGEST', label: 'Weekly Digest' },
    { value: 'BLOG_NOTIFICATION', label: 'Blog Notification' },
];

const STATUS_STYLES: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    UNSUBSCRIBED: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    BOUNCED: 'bg-red-500/10 text-red-400 border-red-500/30',
    DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    QUEUED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    SENDING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    SENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    PARTIALLY_FAILED: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/30',
    CANCELLED: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Overview {
    subscribers: { total: number; active: number; pending: number; unsubscribed: number; bounced: number; newLast30Days: number };
    campaigns: { total: number; inProgress: number; recent: RecentCampaign[] };
    deliveries: { total: number; sent: number; failed: number };
    settings: EmailSettings;
    config: { ready?: boolean; issues?: string[] };
}

interface RecentCampaign {
    id: string;
    type: string;
    status: string;
    subject: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    createdAt: string;
    completedAt: string | null;
}

interface EmailSettings {
    blogNotificationsEnabled: boolean;
    welcomeEmailEnabled: boolean;
    weeklyDigestEnabled: boolean;
    doubleOptIn: boolean;
    defaultSenderAccount: string;
    defaultSenderName: string;
    footerNote: string;
}

interface Subscriber {
    id: string;
    email: string;
    name: string | null;
    status: string;
    topics: string[];
    allTopics: boolean;
    frequency: string;
    verifiedAt: string | null;
    createdAt: string;
    emailsSent: number;
    bounceCount: number;
}

interface CampaignRow {
    id: string;
    type: string;
    status: string;
    subject: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    createdAt: string;
    completedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number | string; tone: string }) {
    return (
        <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', tone)}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    return (
        <Badge variant="outline" className={cn('text-[10px]', STATUS_STYLES[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/30')}>
            {status.replace(/_/g, ' ')}
        </Badge>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminBlogEmailPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    // Overview
    const [overview, setOverview] = useState<Overview | null>(null);

    // Subscribers
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [subSearch, setSubSearch] = useState('');
    const [subStatus, setSubStatus] = useState('all');
    const [subLoading, setSubLoading] = useState(false);

    // Compose
    const [cType, setCType] = useState('NEWSLETTER');
    const [cSubject, setCSubject] = useState('');
    const [cPreviewText, setCPreviewText] = useState('');
    const [cContent, setCContent] = useState('');
    const [cCtaLabel, setCCtaLabel] = useState('');
    const [cCtaUrl, setCCtaUrl] = useState('');
    const [cAllTopics, setCAllTopics] = useState(true);
    const [cTopics, setCTopics] = useState<string[]>([]);
    const [testEmail, setTestEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [testing, setTesting] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewing, setPreviewing] = useState(false);

    // History
    const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Settings
    const [settings, setSettings] = useState<EmailSettings | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);

    // Auth
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.role !== 'ADMIN') {
                        router.push('/auth/login');
                        return;
                    }
                    setUser(data);
                } else {
                    router.push('/auth/login');
                }
            } catch {
                router.push('/auth/login');
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    const loadOverview = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/blog/email/overview');
            if (res.ok) {
                const data = await res.json();
                setOverview(data);
                setSettings(data.settings);
            }
        } catch {
            toast.error('Failed to load overview');
        }
    }, []);

    const loadSubscribers = useCallback(async () => {
        setSubLoading(true);
        try {
            const params = new URLSearchParams();
            if (subStatus !== 'all') params.append('status', subStatus);
            if (subSearch) params.append('search', subSearch);
            params.append('pageSize', '50');
            const res = await fetch(`/api/admin/blog/email/subscribers?${params}`);
            if (res.ok) {
                const data = await res.json();
                setSubscribers(data.subscribers);
            }
        } catch {
            toast.error('Failed to load subscribers');
        } finally {
            setSubLoading(false);
        }
    }, [subStatus, subSearch]);

    const loadCampaigns = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch('/api/admin/blog/email/campaigns?pageSize=30');
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data.campaigns);
            }
        } catch {
            toast.error('Failed to load campaigns');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) loadOverview();
    }, [user, loadOverview]);

    useEffect(() => {
        if (user && tab === 'subscribers') loadSubscribers();
    }, [user, tab, loadSubscribers]);

    useEffect(() => {
        if (user && tab === 'history') loadCampaigns();
    }, [user, tab, loadCampaigns]);

    // Subscriber actions
    const subscriberAction = async (id: string, action: string) => {
        try {
            const res = await fetch(`/api/admin/blog/email/subscribers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            if (res.ok) {
                toast.success(`Subscriber ${action}d`);
                loadSubscribers();
                loadOverview();
            } else {
                const d = await res.json();
                toast.error(d.error || 'Action failed');
            }
        } catch {
            toast.error('Action failed');
        }
    };

    const deleteSubscriber = async (id: string) => {
        if (!confirm('Permanently delete this subscriber? Unsubscribe is usually better.')) return;
        try {
            const res = await fetch(`/api/admin/blog/email/subscribers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Subscriber deleted');
                loadSubscribers();
                loadOverview();
            } else {
                toast.error('Delete failed');
            }
        } catch {
            toast.error('Delete failed');
        }
    };

    // Compose helpers
    const composePayload = () => ({
        type: cType,
        subject: cSubject,
        previewText: cPreviewText || undefined,
        content: cContent,
        ctaLabel: cCtaLabel || undefined,
        ctaUrl: cCtaUrl || undefined,
        audience: { kind: 'subscribers', topics: cAllTopics ? [] : cTopics },
    });

    const handlePreview = async () => {
        if (!cSubject.trim() || !cContent.trim()) {
            toast.error('Add a subject and content first');
            return;
        }
        setPreviewing(true);
        try {
            const res = await fetch('/api/admin/blog/email/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(composePayload()),
            });
            const data = await res.json();
            if (res.ok) {
                setPreviewHtml(data.preview.html);
                setShowPreview(true);
            } else {
                toast.error(data.error || 'Preview failed');
            }
        } catch {
            toast.error('Preview failed');
        } finally {
            setPreviewing(false);
        }
    };

    const handleTest = async () => {
        if (!testEmail.trim()) {
            toast.error('Enter a test recipient address');
            return;
        }
        setTesting(true);
        try {
            const res = await fetch('/api/admin/blog/email/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...composePayload(), to: testEmail }),
            });
            const data = await res.json();
            if (res.ok) toast.success(data.message || 'Test sent');
            else toast.error(data.error || 'Test failed');
        } catch {
            toast.error('Test failed');
        } finally {
            setTesting(false);
        }
    };

    const handleSend = async () => {
        if (!cSubject.trim() || !cContent.trim()) {
            toast.error('Add a subject and content first');
            return;
        }
        if (!confirm('Queue this campaign to all matching subscribers?')) return;
        setSending(true);
        try {
            const res = await fetch('/api/admin/blog/email/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(composePayload()),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Campaign queued');
                setCSubject('');
                setCPreviewText('');
                setCContent('');
                setCCtaLabel('');
                setCCtaUrl('');
                setCTopics([]);
                setCAllTopics(true);
                loadOverview();
            } else {
                toast.error(data.error || 'Failed to queue campaign');
            }
        } catch {
            toast.error('Failed to queue campaign');
        } finally {
            setSending(false);
        }
    };

    const campaignAction = async (id: string, action: string) => {
        try {
            const res = await fetch(`/api/admin/blog/email/campaigns/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Campaign ${action}`);
                loadCampaigns();
                loadOverview();
            } else {
                toast.error(data.error || 'Action failed');
            }
        } catch {
            toast.error('Action failed');
        }
    };

    const saveSettings = async () => {
        if (!settings) return;
        setSavingSettings(true);
        try {
            const res = await fetch('/api/admin/blog/email/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (res.ok) {
                setSettings(data.settings);
                toast.success(data.message || 'Settings saved');
            } else {
                toast.error(data.error || 'Save failed');
            }
        } catch {
            toast.error('Save failed');
        } finally {
            setSavingSettings(false);
        }
    };

    const toggleTopic = (value: string) => {
        setCTopics((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }
    if (!user) return null;

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
                                Blog Email &amp; Subscribers
                            </h1>
                            <p className="text-slate-400 mt-1 text-sm sm:text-base">
                                Manage newsletter subscribers, campaigns and delivery
                            </p>
                        </div>
                        <Button
                            onClick={() => { loadOverview(); toast.success('Refreshed'); }}
                            variant="outline"
                            size="sm"
                            className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white w-full sm:w-auto"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>

                    {/* Config health warning */}
                    {overview?.config?.issues && overview.config.issues.length > 0 && (
                        <Card className="bg-amber-500/10 border-amber-500/30">
                            <CardContent className="p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-300">Email is not fully configured</p>
                                    <ul className="mt-1 text-xs text-amber-200/80 list-disc list-inside">
                                        {overview.config.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Tabs value={tab} onValueChange={setTab}>
                        <TabsList className="bg-slate-800/50 border border-slate-700/50 flex-wrap h-auto">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-300">Overview</TabsTrigger>
                            <TabsTrigger value="subscribers" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-300">Subscribers</TabsTrigger>
                            <TabsTrigger value="compose" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-300">Compose</TabsTrigger>
                            <TabsTrigger value="history" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-300">History</TabsTrigger>
                            <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-300">Settings</TabsTrigger>
                        </TabsList>

                        {/* OVERVIEW */}
                        <TabsContent value="overview" className="mt-4 space-y-4">
                            {!overview ? (
                                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                        <StatCard icon={Users} label="Total" value={overview.subscribers.total} tone="bg-emerald-500/10 text-emerald-400" />
                                        <StatCard icon={UserCheck} label="Active" value={overview.subscribers.active} tone="bg-emerald-500/10 text-emerald-400" />
                                        <StatCard icon={Clock} label="Pending" value={overview.subscribers.pending} tone="bg-amber-500/10 text-amber-400" />
                                        <StatCard icon={UserX} label="Unsubscribed" value={overview.subscribers.unsubscribed} tone="bg-slate-500/10 text-slate-400" />
                                        <StatCard icon={Ban} label="Bounced" value={overview.subscribers.bounced} tone="bg-red-500/10 text-red-400" />
                                        <StatCard icon={TrendingUp} label="New (30d)" value={overview.subscribers.newLast30Days} tone="bg-blue-500/10 text-blue-400" />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <StatCard icon={Inbox} label="Campaigns" value={overview.campaigns.total} tone="bg-indigo-500/10 text-indigo-400" />
                                        <StatCard icon={Send} label="In progress" value={overview.campaigns.inProgress} tone="bg-blue-500/10 text-blue-400" />
                                        <StatCard icon={CheckCircle2} label="Emails sent" value={overview.deliveries.sent} tone="bg-emerald-500/10 text-emerald-400" />
                                        <StatCard icon={XCircle} label="Failed" value={overview.deliveries.failed} tone="bg-red-500/10 text-red-400" />
                                    </div>

                                    <Card className="bg-slate-800/50 border-slate-700/50">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-white text-base flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-400" /> Recent campaigns</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            {overview.campaigns.recent.length === 0 ? (
                                                <p className="text-sm text-slate-400 py-4 text-center">No campaigns yet.</p>
                                            ) : overview.campaigns.recent.map((c) => (
                                                <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-slate-900/40 rounded-lg">
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-white truncate">{c.subject}</p>
                                                        <p className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-shrink-0">
                                                        <span className="text-xs text-slate-400">{c.sentCount}/{c.totalRecipients}</span>
                                                        <StatusBadge status={c.status} />
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </TabsContent>

                        {/* SUBSCRIBERS */}
                        <TabsContent value="subscribers" className="mt-4 space-y-4">
                            <Card className="bg-slate-800/50 border-slate-700/50">
                                <CardHeader className="pb-3">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Search email or name..."
                                                value={subSearch}
                                                onChange={(e) => setSubSearch(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && loadSubscribers()}
                                                className="pl-10 bg-slate-900/50 border-slate-700 text-white"
                                            />
                                        </div>
                                        <Select value={subStatus} onValueChange={setSubStatus}>
                                            <SelectTrigger className="w-full sm:w-44 bg-slate-900/50 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                                <SelectItem value="all">All statuses</SelectItem>
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="PENDING">Pending</SelectItem>
                                                <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
                                                <SelectItem value="BOUNCED">Bounced</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button onClick={loadSubscribers} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                            <Search className="h-4 w-4 mr-2" /> Search
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {subLoading ? (
                                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
                                    ) : subscribers.length === 0 ? (
                                        <p className="text-sm text-slate-400 py-8 text-center">No subscribers found.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {subscribers.map((s) => (
                                                <div key={s.id} className="flex items-center justify-between gap-3 p-3 bg-slate-900/40 rounded-lg">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm text-white truncate">{s.email}</p>
                                                            <StatusBadge status={s.status} />
                                                        </div>
                                                        <p className="text-xs text-slate-400 truncate">
                                                            {s.name || 'No name'} · {s.allTopics ? 'All topics' : `${s.topics.length} topics`} · {s.frequency.replace(/_/g, ' ').toLowerCase()}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {s.status !== 'UNSUBSCRIBED' ? (
                                                            <Button size="sm" variant="ghost" onClick={() => subscriberAction(s.id, 'unsubscribe')} className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-8" title="Unsubscribe">
                                                                <UserX className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <Button size="sm" variant="ghost" onClick={() => subscriberAction(s.id, 'resubscribe')} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8" title="Resubscribe">
                                                                <UserCheck className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button size="sm" variant="ghost" onClick={() => deleteSubscriber(s.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8" title="Delete">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* COMPOSE */}
                        <TabsContent value="compose" className="mt-4">
                            <Card className="bg-slate-800/50 border-slate-700/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-base">Compose campaign</CardTitle>
                                    <CardDescription className="text-slate-400 text-sm">
                                        Queued campaigns send in the background. Preview and send a test first.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300 text-sm">Campaign type</Label>
                                            <Select value={cType} onValueChange={setCType}>
                                                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                                    {CAMPAIGN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300 text-sm">Preview text (optional)</Label>
                                            <Input value={cPreviewText} onChange={(e) => setCPreviewText(e.target.value)} placeholder="Shown in the inbox preview" className="bg-slate-900/50 border-slate-700 text-white" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-300 text-sm">Subject</Label>
                                        <Input value={cSubject} onChange={(e) => setCSubject(e.target.value)} placeholder="Email subject" className="bg-slate-900/50 border-slate-700 text-white" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-300 text-sm">Content</Label>
                                        <Textarea value={cContent} onChange={(e) => setCContent(e.target.value)} rows={8} placeholder="Write your message. Line breaks become paragraphs." className="bg-slate-900/50 border-slate-700 text-white resize-none" />
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300 text-sm">Button label (optional)</Label>
                                            <Input value={cCtaLabel} onChange={(e) => setCCtaLabel(e.target.value)} placeholder="Read the article" className="bg-slate-900/50 border-slate-700 text-white" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300 text-sm">Button URL (optional)</Label>
                                            <Input value={cCtaUrl} onChange={(e) => setCCtaUrl(e.target.value)} placeholder="/blog/... or https://..." className="bg-slate-900/50 border-slate-700 text-white" />
                                        </div>
                                    </div>

                                    <Separator className="bg-slate-700" />

                                    {/* Audience */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg">
                                            <div>
                                                <p className="text-sm text-white">Send to all topics</p>
                                                <p className="text-xs text-slate-400">Off = only subscribers who follow the selected topics</p>
                                            </div>
                                            <Switch checked={cAllTopics} onCheckedChange={setCAllTopics} className="data-[state=checked]:bg-emerald-500" />
                                        </div>
                                        {!cAllTopics && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {BLOG_TOPICS.map((t) => (
                                                    <label key={t.value} className="flex items-center gap-2 p-2 bg-slate-900/40 rounded-lg cursor-pointer">
                                                        <Checkbox checked={cTopics.includes(t.value)} onCheckedChange={() => toggleTopic(t.value)} className="border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                                                        <span className="text-xs text-slate-300">{t.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <Separator className="bg-slate-700" />

                                    <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-slate-300 text-sm">Send a test to</Label>
                                            <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" className="bg-slate-900/50 border-slate-700 text-white" />
                                        </div>
                                        <Button onClick={handleTest} disabled={testing} variant="outline" className="border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-700">
                                            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" />Send test</>}
                                        </Button>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                        <Button onClick={handlePreview} disabled={previewing} variant="outline" className="border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-700">
                                            {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Eye className="h-4 w-4 mr-2" />Preview</>}
                                        </Button>
                                        <Button onClick={handleSend} disabled={sending} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white">
                                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" />Queue campaign</>}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* HISTORY */}
                        <TabsContent value="history" className="mt-4">
                            <Card className="bg-slate-800/50 border-slate-700/50">
                                <CardHeader className="pb-3 flex-row items-center justify-between">
                                    <CardTitle className="text-white text-base">Campaign history</CardTitle>
                                    <Button size="sm" variant="ghost" onClick={loadCampaigns} className="text-slate-400 hover:text-white h-8"><RefreshCw className="h-4 w-4" /></Button>
                                </CardHeader>
                                <CardContent>
                                    {historyLoading ? (
                                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
                                    ) : campaigns.length === 0 ? (
                                        <p className="text-sm text-slate-400 py-8 text-center">No campaigns yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {campaigns.map((c) => {
                                                const canRetry = c.status === 'PARTIALLY_FAILED' || c.status === 'FAILED';
                                                const canCancel = c.status === 'QUEUED' || c.status === 'SENDING';
                                                return (
                                                    <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-slate-900/40 rounded-lg">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm text-white truncate">{c.subject}</p>
                                                                <StatusBadge status={c.status} />
                                                            </div>
                                                            <p className="text-xs text-slate-400">
                                                                {c.type.replace(/_/g, ' ')} · {c.sentCount}/{c.totalRecipients} sent{c.failedCount > 0 ? ` · ${c.failedCount} failed` : ''} · {new Date(c.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            {canRetry && (
                                                                <Button size="sm" variant="ghost" onClick={() => campaignAction(c.id, 'retry')} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8" title="Retry failed">
                                                                    <RefreshCw className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {canCancel && (
                                                                <Button size="sm" variant="ghost" onClick={() => campaignAction(c.id, 'cancel')} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8" title="Cancel">
                                                                    <Ban className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* SETTINGS */}
                        <TabsContent value="settings" className="mt-4">
                            <Card className="bg-slate-800/50 border-slate-700/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-base flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-emerald-400" /> Email settings</CardTitle>
                                    <CardDescription className="text-slate-400 text-sm">Runtime toggles — no redeploy needed.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {!settings ? (
                                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
                                    ) : (
                                        <>
                                            {([
                                                ['blogNotificationsEnabled', 'Blog notifications', 'Email subscribers when an article is published'],
                                                ['welcomeEmailEnabled', 'Welcome email', 'Send a welcome email after a subscriber confirms'],
                                                ['weeklyDigestEnabled', 'Weekly digest', 'Allow the weekly digest cron to build campaigns'],
                                                ['doubleOptIn', 'Double opt-in', 'Require email confirmation before activating a subscriber'],
                                            ] as const).map(([key, label, desc]) => (
                                                <div key={key} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-lg">
                                                    <div>
                                                        <p className="text-sm text-white">{label}</p>
                                                        <p className="text-xs text-slate-400">{desc}</p>
                                                    </div>
                                                    <Switch
                                                        checked={settings[key]}
                                                        onCheckedChange={(v) => setSettings({ ...settings, [key]: v })}
                                                        className="data-[state=checked]:bg-emerald-500"
                                                    />
                                                </div>
                                            ))}

                                            <div className="space-y-2">
                                                <Label className="text-slate-300 text-sm">Default sender name</Label>
                                                <Input value={settings.defaultSenderName} onChange={(e) => setSettings({ ...settings, defaultSenderName: e.target.value })} className="bg-slate-900/50 border-slate-700 text-white" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300 text-sm">Footer note (optional)</Label>
                                                <Input value={settings.footerNote} onChange={(e) => setSettings({ ...settings, footerNote: e.target.value })} placeholder="Extra line in the email footer" className="bg-slate-900/50 border-slate-700 text-white" />
                                            </div>

                                            <Button onClick={saveSettings} disabled={savingSettings} className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white">
                                                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save settings'}
                                            </Button>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Preview dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Eye className="h-4 w-4 text-emerald-400" /> Email preview</DialogTitle>
                        <DialogDescription className="text-slate-400 text-sm">How subscribers will see this email</DialogDescription>
                    </DialogHeader>
                    <div className="bg-white rounded-lg overflow-auto max-h-[65vh]">
                        {previewHtml && <iframe title="Email preview" srcDoc={previewHtml} className="w-full h-[60vh] border-0" />}
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
