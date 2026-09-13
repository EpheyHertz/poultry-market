'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    AlertCircle,
    CheckCircle2,
    Settings2,
    BellRing,
    ShieldOff,
    ArrowRight,
    HeartHandshake,
    Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { NewsletterShell } from '@/components/blog/newsletter-shell';
import {
    BLOG_TOPICS,
    SUBSCRIBER_FREQUENCIES,
    type BlogTopic,
    type SubscriberFrequencyValue,
} from '@/lib/email/topics';

// ────────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────────

interface SubscriberSummary {
    email: string;
    maskedEmail: string;
    name: string | null;
    status: 'PENDING' | 'ACTIVE' | 'UNSUBSCRIBED' | 'BOUNCED';
    topics: BlogTopic[];
    allTopics: boolean;
    frequency: SubscriberFrequencyValue;
    subscribedAt: string;
    verifiedAt: string | null;
}

interface ApiResponse {
    ok: boolean;
    state: string;
    message?: string;
    subscriber?: SubscriberSummary;
    resubscribeUrl?: string;
}

type View = 'loading' | 'invalid' | 'ready' | 'unsubscribed';

// ────────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────────

async function parseJson(response: Response): Promise<ApiResponse> {
    try {
        return (await response.json()) as ApiResponse;
    } catch {
        return { ok: false, state: 'error', message: 'Something went wrong. Please try again.' };
    }
}

// ────────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────────

export default function PreferencesClient() {
    const params = useSearchParams();
    const token = params?.get('token') ?? '';
    const wantsUnsubscribe = params?.get('action') === 'unsubscribe';

    const [view, setView] = useState<View>('loading');
    const [invalidMessage, setInvalidMessage] = useState<string | null>(null);

    // Loaded subscriber + editable form fields
    const [subscriber, setSubscriber] = useState<SubscriberSummary | null>(null);
    const [name, setName] = useState('');
    const [allTopics, setAllTopics] = useState(true);
    const [selectedTopics, setSelectedTopics] = useState<Set<BlogTopic>>(new Set());
    const [frequency, setFrequency] = useState<SubscriberFrequencyValue>('EVERY_POST');

    // Action states
    const [saving, setSaving] = useState(false);
    const [saveNote, setSaveNote] = useState<string | null>(null);
    const [working, setWorking] = useState(false);
    const [showUnsubPrompt, setShowUnsubPrompt] = useState(false);

    const startedRef = useRef(false);

    const hydrate = useCallback((data: SubscriberSummary) => {
        setSubscriber(data);
        setName(data.name ?? '');
        setAllTopics(data.allTopics || data.topics.length === 0);
        setSelectedTopics(new Set(data.topics));
        setFrequency(data.frequency);
    }, []);

    // Load current preferences on mount
    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;

        if (!token) {
            setInvalidMessage(
                'This preferences link is missing its token. Please open it directly from one of our emails.'
            );
            setView('invalid');
            return;
        }

        (async () => {
            try {
                const res = await fetch(`/api/blog/subscribe/preferences?token=${encodeURIComponent(token)}`);
                const data = await parseJson(res);
                if (data.ok && data.subscriber) {
                    hydrate(data.subscriber);
                    if (data.subscriber.status === 'UNSUBSCRIBED') {
                        setView('unsubscribed');
                    } else {
                        setView('ready');
                        setShowUnsubPrompt(wantsUnsubscribe && data.subscriber.status === 'ACTIVE');
                    }
                } else {
                    setInvalidMessage(data.message ?? 'This preferences link is not valid or has expired.');
                    setView('invalid');
                }
            } catch {
                setInvalidMessage('We could not reach the server. Please try again in a moment.');
                setView('invalid');
            }
        })();
    }, [token, wantsUnsubscribe, hydrate]);

    const toggleTopic = useCallback((value: BlogTopic) => {
        setSelectedTopics((prev) => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
        setSaveNote(null);
    }, []);

    const handleSave = useCallback(async () => {
        if (saving) return;
        setSaving(true);
        setSaveNote(null);

        const effectiveAll = allTopics || selectedTopics.size === 0;
        try {
            const res = await fetch('/api/blog/subscribe/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    name: name.trim() || null,
                    allTopics: effectiveAll,
                    topics: effectiveAll ? undefined : Array.from(selectedTopics),
                    frequency,
                }),
            });
            const data = await parseJson(res);
            if (data.ok && data.subscriber) {
                hydrate(data.subscriber);
                setSaveNote(data.message ?? 'Your preferences have been saved.');
            } else {
                setSaveNote(data.message ?? 'We could not save your preferences. Please try again.');
            }
        } catch {
            setSaveNote('We could not reach the server. Please try again shortly.');
        } finally {
            setSaving(false);
        }
    }, [saving, allTopics, selectedTopics, token, name, frequency, hydrate]);

    const handleUnsubscribe = useCallback(async () => {
        if (working) return;
        setWorking(true);
        try {
            const res = await fetch('/api/blog/subscribe/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: 'unsubscribe' }),
            });
            const data = await parseJson(res);
            if (data.ok) {
                setView('unsubscribed');
                setShowUnsubPrompt(false);
            } else {
                setSaveNote(data.message ?? 'We could not process that request. Please try again.');
            }
        } catch {
            setSaveNote('We could not reach the server. Please try again shortly.');
        } finally {
            setWorking(false);
        }
    }, [working, token]);

    const handleResubscribe = useCallback(async () => {
        if (working) return;
        setWorking(true);
        try {
            const res = await fetch('/api/blog/subscribe/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: 'resubscribe' }),
            });
            const data = await parseJson(res);
            if (data.ok && data.subscriber) {
                hydrate(data.subscriber);
                setView('ready');
                setSaveNote('Welcome back — your subscription is active again.');
            } else {
                setSaveNote(data.message ?? 'We could not complete that. Please try again.');
            }
        } catch {
            setSaveNote('We could not reach the server. Please try again shortly.');
        } finally {
            setWorking(false);
        }
    }, [working, token, hydrate]);

    const selectedCount = selectedTopics.size;
    const topicSummary = useMemo(() => {
        if (allTopics || selectedCount === 0) return 'Every new topic we publish';
        if (selectedCount === 1) return '1 topic selected';
        return `${selectedCount} topics selected`;
    }, [allTopics, selectedCount]);

    // ── Loading ────────────────────────────────────────────────────────────────
    if (view === 'loading') {
        return (
            <NewsletterShell>
                <div className="flex flex-col items-center py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <h1 className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
                        Loading your preferences…
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">This only takes a moment.</p>
                </div>
            </NewsletterShell>
        );
    }

    // ── Invalid / expired token ──────────────────────────────────────────────────
    if (view === 'invalid') {
        return (
            <NewsletterShell>
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
                        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Link not valid</h1>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-slate-400">
                        {invalidMessage}
                    </p>
                    <div className="mt-6">
                        <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                            <Link href="/blog#subscribe">Go to the blog</Link>
                        </Button>
                    </div>
                </div>
            </NewsletterShell>
        );
    }

    // ── Unsubscribed confirmation ────────────────────────────────────────────────
    if (view === 'unsubscribed') {
        return (
            <NewsletterShell>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <ShieldOff className="h-8 w-8 text-slate-500 dark:text-slate-400" aria-hidden />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">You&apos;ve been unsubscribed</h1>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-slate-400">
                        {subscriber?.maskedEmail ? (
                            <>
                                <span className="font-medium text-gray-900 dark:text-slate-100">
                                    {subscriber.maskedEmail}
                                </span>{' '}
                                won&apos;t receive any more Poultry Market emails. We&apos;re sorry to see you go!
                            </>
                        ) : (
                            <>You won&apos;t receive any more Poultry Market emails. We&apos;re sorry to see you go!</>
                        )}
                    </p>

                    <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-left dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <div className="flex items-start gap-3">
                            <HeartHandshake
                                className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400"
                                aria-hidden
                            />
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                                    Changed your mind?
                                </p>
                                <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-400">
                                    You can resubscribe instantly — your previous topic choices are still saved.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleResubscribe}
                            disabled={working}
                            className="mt-3 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {working ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                    Working…
                                </>
                            ) : (
                                <>
                                    <Undo2 className="mr-2 h-4 w-4" aria-hidden />
                                    Resubscribe
                                </>
                            )}
                        </Button>
                    </div>

                    {saveNote && <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">{saveNote}</p>}

                    <div className="mt-6">
                        <Link
                            href="/blog"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            Browse the blog
                            <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                    </div>
                </motion.div>
            </NewsletterShell>
        );
    }

    // ── Ready: the preferences form ──────────────────────────────────────────────
    return (
        <NewsletterShell className="max-w-2xl">
            <div className="mb-6 flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <Settings2 className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Email preferences</h1>
                    {subscriber?.maskedEmail && (
                        <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-slate-400">
                            {subscriber.maskedEmail}
                        </p>
                    )}
                </div>
            </div>

            {/* Unsubscribe prompt (arrived from an email "unsubscribe" link) */}
            <AnimatePresence initial={false}>
                {showUnsubPrompt && (
                    <motion.div
                        key="unsub-prompt"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-5 overflow-hidden"
                    >
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                Do you want to unsubscribe from all emails?
                            </p>
                            <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/70">
                                You can also just fine-tune the topics below to hear less from us — without leaving
                                entirely.
                            </p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <Button
                                    onClick={handleUnsubscribe}
                                    disabled={working}
                                    variant="outline"
                                    className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10"
                                >
                                    {working ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                            Working…
                                        </>
                                    ) : (
                                        'Unsubscribe from all'
                                    )}
                                </Button>
                                <Button
                                    onClick={() => setShowUnsubPrompt(false)}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    Keep my subscription
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-5">
                {/* Name */}
                <div className="space-y-1.5">
                    <Label htmlFor="pref-name" className="text-gray-700 dark:text-slate-200">
                        Name <span className="font-normal text-gray-400 dark:text-slate-500">(optional)</span>
                    </Label>
                    <Input
                        id="pref-name"
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setSaveNote(null);
                        }}
                        placeholder="Jane Wanjiku"
                        maxLength={100}
                        className="bg-white text-gray-900 placeholder:text-gray-400 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                </div>

                {/* Topics */}
                <fieldset className="space-y-3 rounded-xl border border-gray-100 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                        <legend className="text-sm font-medium text-gray-700 dark:text-slate-200">
                            Topics you care about
                        </legend>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="pref-all" className="text-xs text-gray-500 dark:text-slate-400">
                                Everything
                            </Label>
                            <Switch
                                id="pref-all"
                                checked={allTopics}
                                onCheckedChange={(checked) => {
                                    setAllTopics(checked === true);
                                    setSaveNote(null);
                                }}
                                aria-label="Send me every topic"
                            />
                        </div>
                    </div>

                    <AnimatePresence initial={false}>
                        {!allTopics && (
                            <motion.div
                                key="topic-grid"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                                    {BLOG_TOPICS.map((topic) => {
                                        const checked = selectedTopics.has(topic.value);
                                        return (
                                            <label
                                                key={topic.value}
                                                className={cn(
                                                    'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                                                    checked
                                                        ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-500/10'
                                                        : 'border-gray-200 hover:border-emerald-300 dark:border-slate-700 dark:hover:border-emerald-600'
                                                )}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => toggleTopic(topic.value)}
                                                    className="mt-0.5"
                                                    aria-label={topic.label}
                                                />
                                                <span className="min-w-0">
                                                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-slate-100">
                                                        <span aria-hidden>{topic.emoji}</span>
                                                        {topic.label}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-slate-400">
                                                        {topic.description}
                                                    </span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <p className="text-xs text-gray-400 dark:text-slate-500">{topicSummary}</p>
                </fieldset>

                {/* Frequency */}
                <fieldset className="space-y-2 rounded-xl border border-gray-100 p-3 dark:border-slate-800">
                    <legend className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-slate-200">
                        <BellRing className="h-4 w-4 text-gray-400 dark:text-slate-500" aria-hidden />
                        How often should we email you?
                    </legend>
                    <RadioGroup
                        value={frequency}
                        onValueChange={(value) => {
                            setFrequency(value as SubscriberFrequencyValue);
                            setSaveNote(null);
                        }}
                        className="gap-2"
                    >
                        {SUBSCRIBER_FREQUENCIES.map((freq) => (
                            <label
                                key={freq.value}
                                htmlFor={`pref-freq-${freq.value}`}
                                className={cn(
                                    'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                                    frequency === freq.value
                                        ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-500/10'
                                        : 'border-gray-200 hover:border-emerald-300 dark:border-slate-700 dark:hover:border-emerald-600'
                                )}
                            >
                                <RadioGroupItem id={`pref-freq-${freq.value}`} value={freq.value} className="mt-0.5" />
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium text-gray-800 dark:text-slate-100">
                                        {freq.label}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-slate-400">
                                        {freq.description}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </RadioGroup>
                </fieldset>

                {/* Save */}
                <div className="space-y-2">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-11 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                                Saving…
                            </>
                        ) : (
                            'Save preferences'
                        )}
                    </Button>
                    <AnimatePresence>
                        {saveNote && (
                            <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center justify-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"
                            >
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden />
                                {saveNote}
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Danger zone */}
            <div className="mt-8 border-t border-gray-100 pt-5 dark:border-slate-800">
                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                            Unsubscribe from all emails
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            You&apos;ll stop receiving every Poultry Market email.
                        </p>
                    </div>
                    <Button
                        onClick={handleUnsubscribe}
                        disabled={working}
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                        {working ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                Working…
                            </>
                        ) : (
                            'Unsubscribe'
                        )}
                    </Button>
                </div>
            </div>
        </NewsletterShell>
    );
}
