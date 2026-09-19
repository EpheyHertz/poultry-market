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
    UserPlus,
    Download,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    SendHorizonal,
    Sparkles,
    Calendar,
    Zap,
    HelpCircle,
    Copy,
    Check,
} from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/* Constants                                                          */
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
    ACTIVE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    UNSUBSCRIBED: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    BOUNCED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    DRAFT: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    QUEUED: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    SENDING: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    SENT: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    PARTIALLY_FAILED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    FAILED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    CANCELLED: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
    SKIPPED: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

/* ------------------------------------------------------------------ */
/* Types                                                              */
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
    lastEmailSentAt: string | null;
    source: string | null;
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

interface DeliveryRow {
    id: string;
    email: string;
    recipientName: string | null;
    status: string;
    attempts: number;
    error: string | null;
    sentAt: string | null;
    lastAttemptAt: string | null;
    createdAt: string;
    canRetry: boolean;
}

interface WeeklyDigestPreview {
    articles: { id: string; title: string; slug: string; category: string; publishedAt: string | null }[];
    estimatedAudience: { verifiedUsers: number; activeSubscribers: number };
}

/* ------------------------------------------------------------------ */
/* Presentational Helpers                                             */
/* ------------------------------------------------------------------ */

function StatCard({
    icon: Icon,
    label,
    value,
    tone,
    bgTone,
}: {
    icon: any;
    label: string;
    value: number | string;
    tone: string;
    bgTone: string;
}) {
    return (
        <Card className="bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl transition-colors', bgTone, tone)}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 border',
                STATUS_STYLES[status] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
            )}
        >
            {status.replace(/_/g, ' ')}
        </Badge>
    );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                          */
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
    const [subPage, setSubPage] = useState(1);
    const [subTotalPages, setSubTotalPages] = useState(1);
    const [subTotal, setSubTotal] = useState(0);
    const [subLoading, setSubLoading] = useState(false);

    // Add subscriber modal
    const [showAddSubModal, setShowAddSubModal] = useState(false);
    const [newSubEmail, setNewSubEmail] = useState('');
    const [newSubName, setNewSubName] = useState('');
    const [newSubAllTopics, setNewSubAllTopics] = useState(true);
    const [newSubTopics, setNewSubTopics] = useState<string[]>([]);
    const [newSubFrequency, setNewSubFrequency] = useState('EVERY_POST');
    const [newSubAutoActivate, setNewSubAutoActivate] = useState(true);
    const [addingSub, setAddingSub] = useState(false);

    // Direct personal send modal
    const [showDirectSendModal, setShowDirectSendModal] = useState(false);
    const [directTo, setDirectTo] = useState('');
    const [directName, setDirectName] = useState('');
    const [directSubject, setDirectSubject] = useState('');
    const [directContent, setDirectContent] = useState('');
    const [directCtaLabel, setDirectCtaLabel] = useState('');
    const [directCtaUrl, setDirectCtaUrl] = useState('');
    const [sendingDirect, setSendingDirect] = useState(false);

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

    // Deliveries inspector & single user retry modal
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignRow | null>(null);
    const [showDeliveriesModal, setShowDeliveriesModal] = useState(false);
    const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
    const [deliveriesLoading, setDeliveriesLoading] = useState(false);
    const [delivSearch, setDelivSearch] = useState('');
    const [delivStatus, setDelivStatus] = useState('all');
    const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(null);
    const [retryingCampaignId, setRetryingCampaignId] = useState<string | null>(null);

    // Weekly Digest & Cron Hub
    const [weeklyPreview, setWeeklyPreview] = useState<WeeklyDigestPreview | null>(null);
    const [weeklyLoading, setWeeklyLoading] = useState(false);
    const [weeklyAudience, setWeeklyAudience] = useState<'verified_users' | 'subscribers'>('verified_users');
    const [weeklyCustomSubject, setWeeklyCustomSubject] = useState('');
    const [dispatchingWeekly, setDispatchingWeekly] = useState(false);
    const [drainingQueue, setDrainingQueue] = useState(false);

    // Settings
    const [settings, setSettings] = useState<EmailSettings | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);

    // Auth verification
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
            toast.error('Failed to load overview data');
        }
    }, []);

    const loadSubscribers = useCallback(async (pageToLoad = subPage) => {
        setSubLoading(true);
        try {
            const params = new URLSearchParams();
            if (subStatus !== 'all') params.append('status', subStatus);
            if (subSearch) params.append('search', subSearch);
            params.append('page', String(pageToLoad));
            params.append('pageSize', '50');

            const res = await fetch(`/api/admin/blog/email/subscribers?${params}`);
            if (res.ok) {
                const data = await res.json();
                setSubscribers(data.subscribers || []);
                if (data.pagination) {
                    setSubTotalPages(data.pagination.totalPages || 1);
                    setSubTotal(data.pagination.total || 0);
                    setSubPage(data.pagination.page || 1);
                }
            } else {
                toast.error('Failed to load subscribers');
            }
        } catch {
            toast.error('Network error loading subscribers');
        } finally {
            setSubLoading(false);
        }
    }, [subStatus, subSearch, subPage]);

    const loadCampaigns = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await fetch('/api/admin/blog/email/campaigns?pageSize=50');
            if (res.ok) {
                const data = await res.json();
                setCampaigns(data.campaigns || []);
            } else {
                toast.error('Failed to load campaign history');
            }
        } catch {
            toast.error('Network error loading campaign history');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const loadWeeklyPreview = useCallback(async () => {
        setWeeklyLoading(true);
        try {
            const res = await fetch('/api/admin/blog/email/weekly-digest');
            if (res.ok) {
                const data = await res.json();
                setWeeklyPreview(data);
            }
        } catch {
            toast.error('Failed to load weekly digest preview');
        } finally {
            setWeeklyLoading(false);
        }
    }, []);

    const loadSettings = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/blog/email/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings);
            }
        } catch {
            // Ignore fallback
        }
    }, []);

    // Initial and tab-driven triggers
    useEffect(() => {
        if (user) loadOverview();
    }, [user, loadOverview]);

    useEffect(() => {
        if (user && tab === 'subscribers') loadSubscribers(1);
    }, [user, tab, subStatus]);

    useEffect(() => {
        if (user && tab === 'history') loadCampaigns();
    }, [user, tab, loadCampaigns]);

    useEffect(() => {
        if (user && tab === 'weekly') loadWeeklyPreview();
    }, [user, tab, loadWeeklyPreview]);

    useEffect(() => {
        if (user && tab === 'settings') loadSettings();
    }, [user, tab, loadSettings]);

    // Subscriber actions
    const subscriberAction = async (id: string, action: string) => {
        try {
            const res = await fetch(`/api/admin/blog/email/subscribers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Subscriber ${action} completed`);
                loadSubscribers(subPage);
                loadOverview();
            } else {
                toast.error(data.error || 'Action failed');
            }
        } catch {
            toast.error('Request failed');
        }
    };

    const deleteSubscriber = async (id: string) => {
        if (!confirm('Permanently delete this subscriber? Unsubscribing is usually recommended.')) return;
        try {
            const res = await fetch(`/api/admin/blog/email/subscribers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Subscriber deleted');
                loadSubscribers(subPage);
                loadOverview();
            } else {
                toast.error(data.error || 'Delete failed');
            }
        } catch {
            toast.error('Delete request failed');
        }
    };

    const handleAddSubscriber = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubEmail.trim()) {
            toast.error('Email address is required');
            return;
        }

        setAddingSub(true);
        try {
            const res = await fetch('/api/admin/blog/email/subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newSubEmail.trim(),
                    name: newSubName.trim() || undefined,
                    allTopics: newSubAllTopics,
                    topics: newSubAllTopics ? [] : newSubTopics,
                    frequency: newSubFrequency,
                    autoActivate: newSubAutoActivate,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Subscriber added successfully');
                setShowAddSubModal(false);
                setNewSubEmail('');
                setNewSubName('');
                setNewSubAllTopics(true);
                setNewSubTopics([]);
                loadSubscribers(1);
                loadOverview();
            } else {
                toast.error(data.error || 'Failed to add subscriber');
            }
        } catch {
            toast.error('Failed to create subscriber');
        } finally {
            setAddingSub(false);
        }
    };

    // Direct Send Handler
    const handleSendDirect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!directTo.trim() || !directSubject.trim() || !directContent.trim()) {
            toast.error('Recipient, Subject, and Content are required.');
            return;
        }

        setSendingDirect(true);
        try {
            const res = await fetch('/api/admin/blog/email/send-direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: directTo.trim(),
                    name: directName.trim() || undefined,
                    subject: directSubject.trim(),
                    content: directContent.trim(),
                    ctaLabel: directCtaLabel.trim() || undefined,
                    ctaUrl: directCtaUrl.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Email sent to ${directTo}`);
                setShowDirectSendModal(false);
                setDirectTo('');
                setDirectName('');
                setDirectSubject('');
                setDirectContent('');
                setDirectCtaLabel('');
                setDirectCtaUrl('');
                loadOverview();
            } else {
                toast.error(data.error || 'Failed to send direct email');
            }
        } catch {
            toast.error('Error sending direct email');
        } finally {
            setSendingDirect(false);
        }
    };

    // Campaign Deliveries Inspector & Single User Retry
    const openCampaignInspector = async (campaign: CampaignRow) => {
        setSelectedCampaign(campaign);
        setShowDeliveriesModal(true);
        setDelivSearch('');
        setDelivStatus('all');
        await fetchCampaignDeliveries(campaign.id, 'all', '');
    };

    const fetchCampaignDeliveries = async (campaignId: string, statusFilter = delivStatus, searchFilter = delivSearch) => {
        setDeliveriesLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (searchFilter) params.append('search', searchFilter);
            params.append('pageSize', '100');

            const res = await fetch(`/api/admin/blog/email/campaigns/${campaignId}/deliveries?${params}`);
            if (res.ok) {
                const data = await res.json();
                setDeliveries(data.deliveries || []);
            } else {
                toast.error('Failed to fetch campaign deliveries');
            }
        } catch {
            toast.error('Error loading deliveries');
        } finally {
            setDeliveriesLoading(false);
        }
    };

    const handleRetrySingleUser = async (deliveryId: string, email: string) => {
        setRetryingDeliveryId(deliveryId);
        try {
            const res = await fetch(`/api/admin/blog/email/deliveries/${deliveryId}/retry`, {
                method: 'POST',
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Retried successfully for ${email}`);
                setDeliveries((prev) =>
                    prev.map((d) => (d.id === deliveryId ? { ...d, status: 'SENT', error: null, attempts: d.attempts + 1 } : d))
                );
                loadOverview();
                loadCampaigns();
            } else {
                toast.error(data.error || `Retry failed for ${email}`);
                setDeliveries((prev) =>
                    prev.map((d) => (d.id === deliveryId ? { ...d, error: data.error || 'Retry attempt failed', attempts: d.attempts + 1 } : d))
                );
            }
        } catch {
            toast.error(`Network error retrying delivery for ${email}`);
        } finally {
            setRetryingDeliveryId(null);
        }
    };

    // Campaign Actions (Retry / Restart / Cancel)
    const campaignAction = async (id: string, action: string) => {
        if (action === 'retry' || action === 'restart') setRetryingCampaignId(id);
        try {
            const res = await fetch(`/api/admin/blog/email/campaigns/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Campaign ${action} completed`);
                loadCampaigns();
                loadOverview();
                if (selectedCampaign && selectedCampaign.id === id) {
                    fetchCampaignDeliveries(id);
                }
            } else {
                toast.error(data.error || 'Campaign action failed');
            }
        } catch {
            toast.error('Campaign action failed');
        } finally {
            setRetryingCampaignId(null);
        }
    };

    // Weekly Digest Broadcast
    const handleBroadcastWeekly = async () => {
        const count = weeklyAudience === 'verified_users'
            ? weeklyPreview?.estimatedAudience?.verifiedUsers
            : weeklyPreview?.estimatedAudience?.activeSubscribers;

        if (!confirm(`Queue and broadcast the weekly digest to ${count ?? ''} ${weeklyAudience === 'verified_users' ? 'verified platform users' : 'newsletter subscribers'}? Sends will start immediately.`)) {
            return;
        }

        setDispatchingWeekly(true);
        try {
            const res = await fetch('/api/admin/blog/email/weekly-digest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audience: weeklyAudience,
                    customSubject: weeklyCustomSubject.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Weekly digest broadcast queued successfully!');
                loadOverview();
                setTab('history');
                loadCampaigns();
            } else {
                toast.error(data.error || 'Failed to dispatch weekly digest');
            }
        } catch {
            toast.error('Error broadcasting weekly digest');
        } finally {
            setDispatchingWeekly(false);
        }
    };

    // Drain Queue Manual Flush
    const handleDrainQueue = async () => {
        setDrainingQueue(true);
        try {
            const res = await fetch('/api/cron/email/drain?timeBudgetMs=40000');
            const data = await res.json();
            if (res.ok) {
                toast.success(`Queue drain executed: ${data.sent || 0} sent, ${data.failed || 0} failed, ${data.remaining || 0} remaining.`);
                loadOverview();
                loadCampaigns();
            } else {
                toast.error(data.error || 'Queue drain failed');
            }
        } catch {
            toast.error('Network error executing queue drain');
        } finally {
            setDrainingQueue(false);
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
            if (res.ok && data.preview?.html) {
                setPreviewHtml(data.preview.html);
                setShowPreview(true);
            } else {
                toast.error(data.error || 'Preview generation failed');
            }
        } catch {
            toast.error('Preview request failed');
        } finally {
            setPreviewing(false);
        }
    };

    const handleTest = async () => {
        if (!testEmail.trim()) {
            toast.error('Enter a test recipient email address');
            return;
        }
        if (!cSubject.trim() || !cContent.trim()) {
            toast.error('Add subject and content before sending test');
            return;
        }
        setTesting(true);
        try {
            const res = await fetch('/api/admin/blog/email/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...composePayload(), to: testEmail.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Test email dispatched successfully');
            } else {
                toast.error(data.error || 'Failed to send test email');
            }
        } catch {
            toast.error('Network error sending test email');
        } finally {
            setTesting(false);
        }
    };

    const handleSend = async () => {
        if (!cSubject.trim() || !cContent.trim()) {
            toast.error('Subject and content are required');
            return;
        }
        if (!confirm('Queue this campaign to matching subscribers? Sending will start immediately in the background.')) return;
        setSending(true);
        try {
            const res = await fetch('/api/admin/blog/email/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(composePayload()),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || 'Campaign queued and sending in background!');
                setCSubject('');
                setCPreviewText('');
                setCContent('');
                setCCtaLabel('');
                setCCtaUrl('');
                setCTopics([]);
                setCAllTopics(true);
                loadOverview();
                setTab('history');
                loadCampaigns();
            } else {
                toast.error(data.error || 'Failed to queue campaign');
            }
        } catch {
            toast.error('Error queuing campaign');
        } finally {
            setSending(false);
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
                toast.success(data.message || 'Email settings saved');
            } else {
                toast.error(data.error || 'Save failed');
            }
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const toggleTopic = (value: string) => {
        setCTopics((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
    };

    const toggleNewSubTopic = (value: string) => {
        setNewSubTopics((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-500" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading Blog Email Hub...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <DashboardLayout user={user}>
            <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 -m-4 sm:-m-6 p-4 sm:p-6 lg:p-8 transition-colors duration-200">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 text-white">
                                    <Mail className="h-6 w-6" />
                                </div>
                                Blog Email &amp; Newsletter
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm sm:text-base">
                                Broadcast newsletters, manage subscriber lists, inspect deliveries, and retry failed recipients.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                onClick={() => {
                                    loadOverview();
                                    if (tab === 'subscribers') loadSubscribers();
                                    if (tab === 'history') loadCampaigns();
                                    if (tab === 'weekly') loadWeeklyPreview();
                                    toast.success('Refreshed live data');
                                }}
                                variant="outline"
                                size="sm"
                                className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-sm"
                            >
                                <RefreshCw className="h-4 w-4 mr-1.5" />
                                Refresh
                            </Button>
                            <Button
                                onClick={() => setShowDirectSendModal(true)}
                                size="sm"
                                variant="outline"
                                className="border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm"
                                title="Send a one-off email directly to any email address"
                            >
                                <SendHorizonal className="h-4 w-4 mr-1.5" />
                                Direct Send
                            </Button>
                            <Button
                                onClick={() => setShowAddSubModal(true)}
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            >
                                <UserPlus className="h-4 w-4 mr-1.5" />
                                Add Subscriber
                            </Button>
                        </div>
                    </div>

                    {/* System Config Health Warning */}
                    {overview?.config?.issues && overview.config.issues.length > 0 && (
                        <Card className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
                            <CardContent className="p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                        Email system is not fully configured
                                    </p>
                                    <ul className="mt-1 text-xs text-amber-700 dark:text-amber-200/80 list-disc list-inside space-y-0.5">
                                        {overview.config.issues.map((issue, i) => (
                                            <li key={i}>{issue}</li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Main Tabs */}
                    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                        <TabsList className="bg-slate-200/80 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800 p-1 flex-wrap h-auto rounded-xl">
                            <TabsTrigger
                                value="overview"
                                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="subscribers"
                                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                            >
                                Subscribers {overview ? `(${overview.subscribers.total})` : ''}
                            </TabsTrigger>
                            <TabsTrigger
                                value="compose"
                                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                            >
                                Compose
                            </TabsTrigger>
                            <TabsTrigger
                                value="history"
                                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                            >
                                Campaigns &amp; History
                            </TabsTrigger>
                            <TabsTrigger
                                value="weekly"
                                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                            >
                                Weekly &amp; Crons
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                            >
                                Settings
                            </TabsTrigger>
                        </TabsList>

                        {/* ========================================================= */}
                        {/* TAB: OVERVIEW                                             */}
                        {/* ========================================================= */}
                        <TabsContent value="overview" className="space-y-5">
                            {!overview ? (
                                <div className="flex justify-center py-16">
                                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                </div>
                            ) : (
                                <>
                                    {/* Subscribers Stats */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                        <StatCard
                                            icon={Users}
                                            label="Total Subscribers"
                                            value={overview.subscribers.total}
                                            tone="text-emerald-600 dark:text-emerald-400"
                                            bgTone="bg-emerald-50 dark:bg-emerald-500/10"
                                        />
                                        <StatCard
                                            icon={UserCheck}
                                            label="Active Verified"
                                            value={overview.subscribers.active}
                                            tone="text-emerald-600 dark:text-emerald-400"
                                            bgTone="bg-emerald-50 dark:bg-emerald-500/10"
                                        />
                                        <StatCard
                                            icon={Clock}
                                            label="Pending Opt-in"
                                            value={overview.subscribers.pending}
                                            tone="text-amber-600 dark:text-amber-400"
                                            bgTone="bg-amber-50 dark:bg-amber-500/10"
                                        />
                                        <StatCard
                                            icon={UserX}
                                            label="Unsubscribed"
                                            value={overview.subscribers.unsubscribed}
                                            tone="text-slate-600 dark:text-slate-400"
                                            bgTone="bg-slate-100 dark:bg-slate-800/40"
                                        />
                                        <StatCard
                                            icon={Ban}
                                            label="Bounced"
                                            value={overview.subscribers.bounced}
                                            tone="text-rose-600 dark:text-rose-400"
                                            bgTone="bg-rose-50 dark:bg-rose-500/10"
                                        />
                                        <StatCard
                                            icon={TrendingUp}
                                            label="New (30 Days)"
                                            value={overview.subscribers.newLast30Days}
                                            tone="text-sky-600 dark:text-sky-400"
                                            bgTone="bg-sky-50 dark:bg-sky-500/10"
                                        />
                                    </div>

                                    {/* Deliveries & Campaigns Stats */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <StatCard
                                            icon={Inbox}
                                            label="Total Campaigns"
                                            value={overview.campaigns.total}
                                            tone="text-indigo-600 dark:text-indigo-400"
                                            bgTone="bg-indigo-50 dark:bg-indigo-500/10"
                                        />
                                        <StatCard
                                            icon={Send}
                                            label="In Progress"
                                            value={overview.campaigns.inProgress}
                                            tone="text-sky-600 dark:text-sky-400"
                                            bgTone="bg-sky-50 dark:bg-sky-500/10"
                                        />
                                        <StatCard
                                            icon={CheckCircle2}
                                            label="Emails Sent"
                                            value={overview.deliveries.sent}
                                            tone="text-emerald-600 dark:text-emerald-400"
                                            bgTone="bg-emerald-50 dark:bg-emerald-500/10"
                                        />
                                        <StatCard
                                            icon={XCircle}
                                            label="Failed Deliveries"
                                            value={overview.deliveries.failed}
                                            tone="text-rose-600 dark:text-rose-400"
                                            bgTone="bg-rose-50 dark:bg-rose-500/10"
                                        />
                                    </div>

                                    {/* Recent Campaigns Section */}
                                    <Card className="bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 shadow-sm">
                                        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                    Recent Broadcast Campaigns
                                                </CardTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setTab('history')}
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                                >
                                                    View All
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 space-y-2">
                                            {overview.campaigns.recent.length === 0 ? (
                                                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                                    No email campaigns sent yet. Head over to the Compose tab to create your first newsletter!
                                                </div>
                                            ) : (
                                                overview.campaigns.recent.map((c) => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => openCampaignInspector(c)}
                                                        className="flex items-center justify-between gap-3 p-3.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:border-emerald-500/40 cursor-pointer transition-all"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                                    {c.subject}
                                                                </p>
                                                                <StatusBadge status={c.status} />
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                {c.type.replace(/_/g, ' ')} · {new Date(c.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-3 flex-shrink-0 text-right">
                                                            <div>
                                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                                    {c.sentCount}
                                                                </span>
                                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                    /{c.totalRecipients} sent
                                                                </span>
                                                                {c.failedCount > 0 && (
                                                                    <span className="text-xs text-rose-600 dark:text-rose-400 block">
                                                                        {c.failedCount} failed
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openCampaignInspector(c);
                                                                }}
                                                            >
                                                                <Eye className="h-3.5 w-3.5 mr-1" />
                                                                Inspect
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </TabsContent>

                        {/* ========================================================= */}
                        {/* TAB: SUBSCRIBERS                                          */}
                        {/* ========================================================= */}
                        <TabsContent value="subscribers" className="space-y-4">
                            <Card className="bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Search by email or name..."
                                                value={subSearch}
                                                onChange={(e) => setSubSearch(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && loadSubscribers(1)}
                                                className="pl-9 bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={subStatus}
                                                onValueChange={(v) => {
                                                    setSubStatus(v);
                                                    setSubPage(1);
                                                }}
                                            >
                                                <SelectTrigger className="w-full sm:w-44 bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                                                    <SelectValue placeholder="All statuses" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                    <SelectItem value="all">All Statuses</SelectItem>
                                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                                    <SelectItem value="PENDING">Pending Opt-In</SelectItem>
                                                    <SelectItem value="UNSUBSCRIBED">Unsubscribed</SelectItem>
                                                    <SelectItem value="BOUNCED">Bounced</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                onClick={() => loadSubscribers(1)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                <Search className="h-4 w-4 mr-1.5" /> Filter
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    {subLoading ? (
                                        <div className="flex justify-center py-16">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                        </div>
                                    ) : subscribers.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                                                No subscribers found
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                {subSearch || subStatus !== 'all'
                                                    ? 'Try adjusting your search query or status filter.'
                                                    : 'Add subscribers or share your blog subscribe form to start collecting readers.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {subscribers.map((s) => (
                                                <div
                                                    key={s.id}
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2.5">
                                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                                {s.email}
                                                            </p>
                                                            <StatusBadge status={s.status} />
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            <span>{s.name || 'No Name'}</span>
                                                            <span>•</span>
                                                            <span>{s.allTopics ? 'All topics' : `${s.topics?.length || 0} topics`}</span>
                                                            <span>•</span>
                                                            <span className="capitalize">{s.frequency.replace(/_/g, ' ').toLowerCase()}</span>
                                                            <span>•</span>
                                                            <span>{s.emailsSent} emails sent</span>
                                                            {s.bounceCount > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                                                                        {s.bounceCount} bounces
                                                                    </span>
                                                                </>
                                                            )}
                                                            <span>•</span>
                                                            <span>Joined {new Date(s.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setDirectTo(s.email);
                                                                setDirectName(s.name || '');
                                                                setDirectSubject(`Important update for ${s.name || 'you'}`);
                                                                setShowDirectSendModal(true);
                                                            }}
                                                            className="h-8 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                                                            title="Direct email send to this subscriber"
                                                        >
                                                            <Send className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                                                            Send Direct
                                                        </Button>

                                                        {s.status === 'PENDING' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => subscriberAction(s.id, 'activate')}
                                                                className="h-8 border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                                                title="Manually verify & activate"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                                                Activate
                                                            </Button>
                                                        )}
                                                        {s.status === 'PENDING' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => subscriberAction(s.id, 'resend_verification')}
                                                                className="h-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50"
                                                                title="Resend verification email"
                                                            >
                                                                <SendHorizonal className="h-3.5 w-3.5 mr-1" />
                                                                Resend Link
                                                            </Button>
                                                        )}
                                                        {s.status === 'ACTIVE' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => subscriberAction(s.id, 'unsubscribe')}
                                                                className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50"
                                                                title="Unsubscribe reader"
                                                            >
                                                                <UserX className="h-4 w-4 mr-1" />
                                                                Unsubscribe
                                                            </Button>
                                                        )}
                                                        {s.status === 'UNSUBSCRIBED' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => subscriberAction(s.id, 'resubscribe')}
                                                                className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                                                title="Resubscribe reader"
                                                            >
                                                                <UserCheck className="h-4 w-4 mr-1" />
                                                                Resubscribe
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => deleteSubscriber(s.id)}
                                                            className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                                            title="Permanently delete subscriber"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Pagination */}
                                    {subTotalPages > 1 && (
                                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Showing {subscribers.length} of {subTotal} subscribers (Page {subPage} of {subTotalPages})
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={subPage <= 1 || subLoading}
                                                    onClick={() => loadSubscribers(subPage - 1)}
                                                    className="h-8 border-slate-300 dark:border-slate-700"
                                                >
                                                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={subPage >= subTotalPages || subLoading}
                                                    onClick={() => loadSubscribers(subPage + 1)}
                                                    className="h-8 border-slate-300 dark:border-slate-700"
                                                >
                                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ========================================================= */}
                        {/* TAB: COMPOSE                                              */}
                        {/* ========================================================= */}
                        <TabsContent value="compose" className="space-y-4">
                            <Card className="bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                                        Compose Broadcast Campaign
                                    </CardTitle>
                                    <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                                        Send targeted newsletters or blog announcements to subscribers. Sends begin immediately in the background upon queuing.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 space-y-5">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                                Campaign Type
                                            </Label>
                                            <Select value={cType} onValueChange={setCType}>
                                                <SelectTrigger className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                    {CAMPAIGN_TYPES.map((t) => (
                                                        <SelectItem key={t.value} value={t.value}>
                                                            {t.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                                Preview Text (Optional)
                                            </Label>
                                            <Input
                                                value={cPreviewText}
                                                onChange={(e) => setCPreviewText(e.target.value)}
                                                placeholder="Snippet displayed in the email client preview"
                                                className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                            Email Subject Line
                                        </Label>
                                        <Input
                                            value={cSubject}
                                            onChange={(e) => setCSubject(e.target.value)}
                                            placeholder="Catchy headline that drives reader opens"
                                            className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                            Message Content
                                        </Label>
                                        <Textarea
                                            value={cContent}
                                            onChange={(e) => setCContent(e.target.value)}
                                            rows={8}
                                            placeholder="Write your email body here. Double line breaks automatically become distinct paragraphs with proper typographic spacing."
                                            className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white resize-y"
                                        />
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                                Call To Action Button Label (Optional)
                                            </Label>
                                            <Input
                                                value={cCtaLabel}
                                                onChange={(e) => setCCtaLabel(e.target.value)}
                                                placeholder="e.g., Read Full Story"
                                                className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                                Button Link Destination (Optional)
                                            </Label>
                                            <Input
                                                value={cCtaUrl}
                                                onChange={(e) => setCCtaUrl(e.target.value)}
                                                placeholder="/blog/... or https://..."
                                                className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <Separator className="bg-slate-200 dark:bg-slate-800" />

                                    {/* Audience Targeting */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    Target All Topics
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    Turn off to target only subscribers enrolled in specific farming or market categories.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={cAllTopics}
                                                onCheckedChange={setCAllTopics}
                                                className="data-[state=checked]:bg-emerald-600"
                                            />
                                        </div>

                                        {!cAllTopics && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
                                                {BLOG_TOPICS.map((t) => (
                                                    <label
                                                        key={t.value}
                                                        className="flex items-center gap-2 p-2.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-lg border border-slate-200/60 dark:border-slate-800/60 cursor-pointer hover:border-emerald-500/40 transition-colors"
                                                    >
                                                        <Checkbox
                                                            checked={cTopics.includes(t.value)}
                                                            onCheckedChange={() => toggleTopic(t.value)}
                                                            className="border-slate-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                                        />
                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                            {t.label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <Separator className="bg-slate-200 dark:bg-slate-800" />

                                    {/* Test Email Dispatch */}
                                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                                Send A Test Copy
                                            </Label>
                                            <Input
                                                value={testEmail}
                                                onChange={(e) => setTestEmail(e.target.value)}
                                                placeholder="your-admin@example.com"
                                                className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleTest}
                                            disabled={testing}
                                            variant="outline"
                                            className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm"
                                        >
                                            {testing ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Send className="h-4 w-4 mr-2 text-emerald-600" />
                                            )}
                                            Send Test Email
                                        </Button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <Button
                                            onClick={handlePreview}
                                            disabled={previewing}
                                            variant="outline"
                                            className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm"
                                        >
                                            {previewing ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Eye className="h-4 w-4 mr-2 text-indigo-600" />
                                            )}
                                            Live Preview
                                        </Button>
                                        <Button
                                            onClick={handleSend}
                                            disabled={sending}
                                            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md shadow-emerald-600/20"
                                        >
                                            {sending ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Send className="h-4 w-4 mr-2" />
                                            )}
                                            Queue Broadcast Campaign
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ========================================================= */}
                        {/* TAB: HISTORY & DELIVERIES                                 */}
                        {/* ========================================================= */}
                        <TabsContent value="history" className="space-y-4">
                            <Card className="bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                                            Campaign Broadcast History
                                        </CardTitle>
                                        <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                            Inspect recipient deliveries, restart cancelled campaigns, and retry any failed recipient.
                                        </CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={loadCampaigns}
                                        className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-4">
                                    {historyLoading ? (
                                        <div className="flex justify-center py-16">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                        </div>
                                    ) : campaigns.length === 0 ? (
                                        <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
                                            No campaigns found in history.
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {campaigns.map((c) => {
                                                const isCancelled = c.status === 'CANCELLED';
                                                const canRetry = c.status === 'PARTIALLY_FAILED' || c.status === 'FAILED' || isCancelled;
                                                const canCancel = c.status === 'QUEUED' || c.status === 'SENDING';
                                                return (
                                                    <div
                                                        key={c.id}
                                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                                                    >
                                                        <div
                                                            className="min-w-0 flex-1 cursor-pointer"
                                                            onClick={() => openCampaignInspector(c)}
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                                    {c.subject}
                                                                </p>
                                                                <StatusBadge status={c.status} />
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                {c.type.replace(/_/g, ' ')} ·{' '}
                                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                                    {c.sentCount}/{c.totalRecipients} sent
                                                                </span>
                                                                {c.failedCount > 0 && (
                                                                    <span className="text-rose-600 dark:text-rose-400 font-semibold ml-1.5">
                                                                        · {c.failedCount} failed
                                                                    </span>
                                                                )}{' '}
                                                                · Created {new Date(c.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openCampaignInspector(c)}
                                                                className="h-8 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm"
                                                            >
                                                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                                Inspect Recipients
                                                            </Button>

                                                            {isCancelled && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={retryingCampaignId === c.id}
                                                                    onClick={() => campaignAction(c.id, 'restart')}
                                                                    className="h-8 border-indigo-300 text-indigo-700 dark:text-indigo-400 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-medium"
                                                                    title="Restart cancelled campaign"
                                                                >
                                                                    {retryingCampaignId === c.id ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                                    ) : (
                                                                        <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
                                                                    )}
                                                                    Restart Campaign
                                                                </Button>
                                                            )}

                                                            {!isCancelled && canRetry && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={retryingCampaignId === c.id}
                                                                    onClick={() => campaignAction(c.id, 'retry')}
                                                                    className="h-8 border-amber-300 text-amber-700 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                                                                    title="Retry all failed recipients"
                                                                >
                                                                    {retryingCampaignId === c.id ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                                    ) : (
                                                                        <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                                                                    )}
                                                                    Retry Failed
                                                                </Button>
                                                            )}

                                                            {canCancel && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => campaignAction(c.id, 'cancel')}
                                                                    className="h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                                                    title="Cancel campaign"
                                                                >
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

                        {/* ========================================================= */}
                        {/* TAB: WEEKLY & CRONS                                       */}
                        {/* ========================================================= */}
                        <TabsContent value="weekly" className="space-y-6">
                            {/* Card 1: Weekly Digest Broadcast */}
                            <Card className="bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Sparkles className="h-5 w-5 text-amber-500" />
                                                Weekly Digest &amp; Top Picks Broadcast
                                            </CardTitle>
                                            <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                                                Broadcast this week&apos;s curated poultry farming articles and market insights directly to verified platform users or newsletter subscribers.
                                            </CardDescription>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={loadWeeklyPreview}
                                            className="border-slate-300 dark:border-slate-700 self-start sm:self-auto"
                                        >
                                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Check Articles
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 space-y-5">
                                    {weeklyLoading ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Audience Selection */}
                                            <div className="space-y-2">
                                                <Label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">
                                                    Target Audience
                                                </Label>
                                                <div className="grid sm:grid-cols-2 gap-3">
                                                    <div
                                                        onClick={() => setWeeklyAudience('verified_users')}
                                                        className={cn(
                                                            'p-3.5 rounded-xl border cursor-pointer transition-all',
                                                            weeklyAudience === 'verified_users'
                                                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                                                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300'
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                                All Verified Platform Users
                                                            </p>
                                                            <Badge className="bg-emerald-600 text-white text-[10px]">
                                                                {weeklyPreview?.estimatedAudience?.verifiedUsers ?? 0} Users
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            Broadcast to customers, sellers, companies, and stakeholders with verified accounts.
                                                        </p>
                                                    </div>

                                                    <div
                                                        onClick={() => setWeeklyAudience('subscribers')}
                                                        className={cn(
                                                            'p-3.5 rounded-xl border cursor-pointer transition-all',
                                                            weeklyAudience === 'subscribers'
                                                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                                                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300'
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                                Newsletter Subscribers
                                                            </p>
                                                            <Badge className="bg-sky-600 text-white text-[10px]">
                                                                {weeklyPreview?.estimatedAudience?.activeSubscribers ?? 0} Active
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            Broadcast to opted-in blog subscribers following the weekly digest cadence.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Articles Preview */}
                                            <div className="space-y-2">
                                                <Label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">
                                                    Articles Included This Week ({weeklyPreview?.articles?.length ?? 0})
                                                </Label>
                                                {!weeklyPreview?.articles?.length ? (
                                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                                        No published articles found in the database. Publish an article first.
                                                    </p>
                                                ) : (
                                                    <div className="grid sm:grid-cols-2 gap-2.5">
                                                        {weeklyPreview.articles.map((art) => (
                                                            <div
                                                                key={art.id}
                                                                className="p-3 bg-slate-50/80 dark:bg-slate-900/40 rounded-lg border border-slate-200/70 dark:border-slate-800"
                                                            >
                                                                <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1">
                                                                    {art.title}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    {art.category.replace(/_/g, ' ')} ·{' '}
                                                                    {art.publishedAt
                                                                        ? new Date(art.publishedAt).toLocaleDateString()
                                                                        : 'Recent'}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Custom Subject Override */}
                                            <div className="space-y-2">
                                                <Label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">
                                                    Subject Override (Optional)
                                                </Label>
                                                <Input
                                                    value={weeklyCustomSubject}
                                                    onChange={(e) => setWeeklyCustomSubject(e.target.value)}
                                                    placeholder="Default: Weekly Poultry Market Picks: [N] Top Articles This Week"
                                                    className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                                                />
                                            </div>

                                            {/* Trigger Broadcast Button */}
                                            <div className="pt-2">
                                                <Button
                                                    onClick={handleBroadcastWeekly}
                                                    disabled={dispatchingWeekly || !weeklyPreview?.articles?.length}
                                                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-600/20"
                                                >
                                                    {dispatchingWeekly ? (
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    ) : (
                                                        <Send className="h-4 w-4 mr-2" />
                                                    )}
                                                    Broadcast Weekly Digest Now
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Card 2: Queue Drain & Instant Flush */}
                            <Card className="bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Zap className="h-5 w-5 text-indigo-500" />
                                        Email Queue Drain &amp; Immediate Worker Flush
                                    </CardTitle>
                                    <CardDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                                        The email engine drains in small safe batches to respect Resend rate limits. Trigger an immediate worker pass to flush all queued deliveries right now.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                Run Queue Drain Worker
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Claims up to 50 queued deliveries across pending campaigns and sends them immediately.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleDrainQueue}
                                            disabled={drainingQueue}
                                            variant="outline"
                                            className="border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900"
                                        >
                                            {drainingQueue ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                            )}
                                            Flush Queue Now
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Card 3: Cron Setup & Architecture Guide */}
                            <Card className="bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                        <HelpCircle className="h-5 w-5 text-slate-500" />
                                        How The Cron Jobs &amp; Scheduled Tasks Work
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    <p>
                                        Next.js runs as serverless request handlers, meaning it does not run persistent clock ticks in the background on its own. Instead, scheduled jobs are triggered through lightweight HTTP endpoints:
                                    </p>
                                    <div className="space-y-2 pt-1 font-mono text-[11px]">
                                        <div className="p-2.5 bg-slate-100 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                            <span>GET /api/cron/email/drain</span>
                                            <Badge variant="outline" className="text-[10px]">Every 1 min (Vercel Cron)</Badge>
                                        </div>
                                        <div className="p-2.5 bg-slate-100 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                            <span>GET /api/cron/email/weekly-digest</span>
                                            <Badge variant="outline" className="text-[10px]">Every Mon 9am (Vercel Cron)</Badge>
                                        </div>
                                    </div>
                                    <p className="pt-2">
                                        <strong>Automatic Vercel Scheduling:</strong> These cron routes are now registered in <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">vercel.json</code>. When deployed to Vercel, Vercel Cron triggers them automatically with an authenticated Bearer token.
                                    </p>
                                    <p>
                                        <strong>Immediate Send on Action:</strong> Whenever you queue a campaign or broadcast weekly picks, the system also immediately fires a background send worker pass so emails start delivering without waiting for the next cron tick!
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ========================================================= */}
                        {/* TAB: SETTINGS                                             */}
                        {/* ========================================================= */}
                        <TabsContent value="settings" className="space-y-4">
                            <Card className="bg-white dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                        <SettingsIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        Email System Runtime Settings
                                    </CardTitle>
                                    <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                                        Control live behavior and email sending rules without redeploying code.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 space-y-4">
                                    {!settings ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                        </div>
                                    ) : (
                                        <>
                                            {([
                                                [
                                                    'blogNotificationsEnabled',
                                                    'Instant Article Notifications',
                                                    'Send broadcast emails to matching subscribers whenever an admin or author publishes a blog post.',
                                                ],
                                                [
                                                    'welcomeEmailEnabled',
                                                    'Welcome Email Onboard',
                                                    'Send an immediate welcome confirmation email once a subscriber confirms their address.',
                                                ],
                                                [
                                                    'weeklyDigestEnabled',
                                                    'Weekly Digest Automated Cron',
                                                    'Allow scheduled digest jobs to compile top stories into a single weekly email.',
                                                ],
                                                [
                                                    'doubleOptIn',
                                                    'Double Opt-In Verification',
                                                    'Require readers to click a verified confirmation link before activating their subscription.',
                                                ],
                                            ] as const).map(([key, label, desc]) => (
                                                <div
                                                    key={key}
                                                    className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60"
                                                >
                                                    <div className="pr-4">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {label}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {desc}
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={Boolean(settings[key])}
                                                        onCheckedChange={(v) => setSettings({ ...settings, [key]: v })}
                                                        className="data-[state=checked]:bg-emerald-600"
                                                    />
                                                </div>
                                            ))}

                                            <div className="space-y-2 pt-2">
                                                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                                    Default Sender Name
                                                </Label>
                                                <Input
                                                    value={settings.defaultSenderName}
                                                    onChange={(e) =>
                                                        setSettings({ ...settings, defaultSenderName: e.target.value })
                                                    }
                                                    className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                                    Footer Note (Optional)
                                                </Label>
                                                <Input
                                                    value={settings.footerNote || ''}
                                                    onChange={(e) =>
                                                        setSettings({ ...settings, footerNote: e.target.value })
                                                    }
                                                    placeholder="e.g., PoultryMarket Kenya Ltd. All rights reserved."
                                                    className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                                />
                                            </div>

                                            <Button
                                                onClick={saveSettings}
                                                disabled={savingSettings}
                                                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                            >
                                                {savingSettings ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : null}
                                                Save Settings
                                            </Button>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* ========================================================= */}
            {/* MODAL: CAMPAIGN DELIVERIES INSPECTOR & PER-USER RETRY     */}
            {/* ========================================================= */}
            <Dialog open={showDeliveriesModal} onOpenChange={setShowDeliveriesModal}>
                <DialogContent className="max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col p-6 shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-emerald-600" />
                                    Campaign Deliveries &amp; Per-User Retry
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                                    Subject: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedCampaign?.subject}</span>
                                </DialogDescription>
                            </div>
                            {selectedCampaign && (
                                <StatusBadge status={selectedCampaign.status} />
                            )}
                        </div>
                    </DialogHeader>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search recipient email or name..."
                                value={delivSearch}
                                onChange={(e) => setDelivSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && selectedCampaign) {
                                        fetchCampaignDeliveries(selectedCampaign.id, delivStatus, delivSearch);
                                    }
                                }}
                                className="pl-9 bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Select
                                value={delivStatus}
                                onValueChange={(v) => {
                                    setDelivStatus(v);
                                    if (selectedCampaign) fetchCampaignDeliveries(selectedCampaign.id, v, delivSearch);
                                }}
                            >
                                <SelectTrigger className="w-36 bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="FAILED">Failed</SelectItem>
                                    <SelectItem value="SENT">Sent</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="SKIPPED">Skipped</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    if (selectedCampaign) fetchCampaignDeliveries(selectedCampaign.id, delivStatus, delivSearch);
                                }}
                                className="border-slate-300 dark:border-slate-700"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>

                            {selectedCampaign?.status === 'CANCELLED' && (
                                <Button
                                    size="sm"
                                    onClick={() => campaignAction(selectedCampaign.id, 'restart')}
                                    disabled={retryingCampaignId === selectedCampaign.id}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                                >
                                    {retryingCampaignId === selectedCampaign.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    ) : (
                                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Restart Campaign
                                </Button>
                            )}

                            {selectedCampaign && (selectedCampaign.status === 'PARTIALLY_FAILED' || selectedCampaign.status === 'FAILED') && (
                                <Button
                                    size="sm"
                                    onClick={() => campaignAction(selectedCampaign.id, 'retry')}
                                    disabled={retryingCampaignId === selectedCampaign.id}
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                                >
                                    {retryingCampaignId === selectedCampaign.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                    ) : (
                                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Retry All Failed
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Deliveries List */}
                    <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[500px] space-y-2 pr-1">
                        {deliveriesLoading ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                            </div>
                        ) : deliveries.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                                No recipients found matching this filter.
                            </div>
                        ) : (
                            deliveries.map((d) => (
                                <div
                                    key={d.id}
                                    className="p-3 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                {d.email}
                                            </p>
                                            <StatusBadge status={d.status} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {d.recipientName && <span>{d.recipientName} •</span>}
                                            <span>{d.attempts} attempt{d.attempts !== 1 ? 's' : ''}</span>
                                            {d.sentAt && <span>• Sent {new Date(d.sentAt).toLocaleTimeString()}</span>}
                                            {d.lastAttemptAt && !d.sentAt && (
                                                <span>• Last attempt {new Date(d.lastAttemptAt).toLocaleTimeString()}</span>
                                            )}
                                        </div>
                                        {d.error && (
                                            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded border border-rose-200 dark:border-rose-900/50">
                                                <span className="font-semibold">Failure reason:</span> {d.error}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action button: Retry for this user */}
                                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                        {d.status !== 'SENT' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleRetrySingleUser(d.id, d.email)}
                                                disabled={retryingDeliveryId === d.id}
                                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm"
                                                title="Immediately re-attempt sending this campaign to this user"
                                            >
                                                {retryingDeliveryId === d.id ? (
                                                    <>
                                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                        Retrying...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="h-3 w-3 mr-1" />
                                                        Retry For This User
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        {d.status === 'SENT' && (
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Delivered
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeliveriesModal(false)}
                            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================= */}
            {/* MODAL: DIRECT PERSONAL SEND ("TRIGGER SEND")              */}
            {/* ========================================================= */}
            <Dialog open={showDirectSendModal} onOpenChange={setShowDirectSendModal}>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <SendHorizonal className="h-5 w-5 text-indigo-600" />
                            Direct Personal Email Send
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
                            Trigger an immediate one-off email send to a specific person or subscriber.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSendDirect} className="space-y-4 pt-2">
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                    Recipient Email *
                                </Label>
                                <Input
                                    type="email"
                                    required
                                    value={directTo}
                                    onChange={(e) => setDirectTo(e.target.value)}
                                    placeholder="user@example.com"
                                    className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                    Recipient Name (Optional)
                                </Label>
                                <Input
                                    value={directName}
                                    onChange={(e) => setDirectName(e.target.value)}
                                    placeholder="Wanjiku"
                                    className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                Subject *
                            </Label>
                            <Input
                                required
                                value={directSubject}
                                onChange={(e) => setDirectSubject(e.target.value)}
                                placeholder="Subject line"
                                className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                Message Body *
                            </Label>
                            <Textarea
                                required
                                rows={5}
                                value={directContent}
                                onChange={(e) => setDirectContent(e.target.value)}
                                placeholder="Enter message. Double line breaks create paragraphs."
                                className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm resize-y"
                            />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                    Button Label (Optional)
                                </Label>
                                <Input
                                    value={directCtaLabel}
                                    onChange={(e) => setDirectCtaLabel(e.target.value)}
                                    placeholder="Visit Blog"
                                    className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                    Button URL (Optional)
                                </Label>
                                <Input
                                    value={directCtaUrl}
                                    onChange={(e) => setDirectCtaUrl(e.target.value)}
                                    placeholder="/blog or https://..."
                                    className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowDirectSendModal(false)}
                                className="border-slate-300 dark:border-slate-700"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={sendingDirect}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {sendingDirect ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                                Send Email Now
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================= */}
            {/* MODAL: ADD SUBSCRIBER                                     */}
            {/* ========================================================= */}
            <Dialog open={showAddSubModal} onOpenChange={setShowAddSubModal}>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-emerald-600" />
                            Add Blog Subscriber
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
                            Directly enroll a reader into your newsletter database.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSubscriber} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                Email Address *
                            </Label>
                            <Input
                                type="email"
                                required
                                value={newSubEmail}
                                onChange={(e) => setNewSubEmail(e.target.value)}
                                placeholder="reader@example.com"
                                className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                Full Name (Optional)
                            </Label>
                            <Input
                                value={newSubName}
                                onChange={(e) => setNewSubName(e.target.value)}
                                placeholder="John Doe"
                                className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                                Delivery Cadence
                            </Label>
                            <Select value={newSubFrequency} onValueChange={setNewSubFrequency}>
                                <SelectTrigger className="bg-slate-50/50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                    <SelectItem value="EVERY_POST">Every New Post Alert</SelectItem>
                                    <SelectItem value="WEEKLY_DIGEST">Weekly Digest Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800">
                            <div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    Mark Active Immediately
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Bypasses double opt-in confirmation and sends broadcasts right away.
                                </p>
                            </div>
                            <Switch
                                checked={newSubAutoActivate}
                                onCheckedChange={setNewSubAutoActivate}
                                className="data-[state=checked]:bg-emerald-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                                    Topic Subscriptions
                                </Label>
                                <div className="flex items-center gap-1.5">
                                    <Checkbox
                                        id="subAllTopics"
                                        checked={newSubAllTopics}
                                        onCheckedChange={(c) => setNewSubAllTopics(Boolean(c))}
                                        className="border-slate-400 data-[state=checked]:bg-emerald-600"
                                    />
                                    <label htmlFor="subAllTopics" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                                        All Topics
                                    </label>
                                </div>
                            </div>
                            {!newSubAllTopics && (
                                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200/80 dark:border-slate-800">
                                    {BLOG_TOPICS.map((t) => (
                                        <label key={t.value} className="flex items-center gap-1.5 cursor-pointer text-xs">
                                            <Checkbox
                                                checked={newSubTopics.includes(t.value)}
                                                onCheckedChange={() => toggleNewSubTopic(t.value)}
                                                className="border-slate-400 data-[state=checked]:bg-emerald-600"
                                            />
                                            <span className="truncate text-slate-700 dark:text-slate-300">{t.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowAddSubModal(false)}
                                className="border-slate-300 dark:border-slate-700"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={addingSub}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {addingSub ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                                Save Subscriber
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================= */}
            {/* MODAL: EMAIL PREVIEW                                      */}
            {/* ========================================================= */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-hidden shadow-2xl p-5">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                            <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            Email Template Preview
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
                            Accurate rendering showing how recipients will see this broadcast in their inbox.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-slate-100 dark:bg-slate-950 rounded-xl overflow-auto border border-slate-200 dark:border-slate-800 max-h-[65vh]">
                        {previewHtml && (
                            <iframe
                                title="Email live preview"
                                srcDoc={previewHtml}
                                className="w-full h-[60vh] border-0"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
