'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    MailCheck,
    Loader2,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    BellRing,
    ShieldCheck,
    PartyPopper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    BLOG_TOPICS,
    SUBSCRIBER_FREQUENCIES,
    type BlogTopic,
    type SubscriberFrequencyValue,
} from '@/lib/email/topics';

// ────────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────────

/** Every subscribe endpoint returns this envelope. */
interface SubscribeResponse {
    ok: boolean;
    state: string;
    message?: string;
    email?: string;
    maskedEmail?: string;
    retryAfterSeconds?: number;
}

type Screen =
    | { kind: 'form' }
    | { kind: 'verification'; maskedEmail: string }
    | { kind: 'active'; maskedEmail: string }
    | { kind: 'error'; message: string };

interface NewsletterSubscribeProps {
    className?: string;
    /** Where this signup originated, stored on the subscriber for analytics. */
    source?: string;
}

// ────────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side fallback mask when the API doesn't return one. */
function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.slice(0, Math.min(2, local.length));
    const hidden = Math.max(1, local.length - visible.length);
    return `${visible}${'•'.repeat(hidden)}@${domain}`;
}

async function parseJson(response: Response): Promise<SubscribeResponse> {
    try {
        return (await response.json()) as SubscribeResponse;
    } catch {
        return { ok: false, state: 'error', message: 'Something went wrong. Please try again.' };
    }
}

// ────────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────────────

export default function NewsletterSubscribe({ className, source = 'blog' }: NewsletterSubscribeProps) {
    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [allTopics, setAllTopics] = useState(true);
    const [selectedTopics, setSelectedTopics] = useState<Set<BlogTopic>>(new Set());
    const [frequency, setFrequency] = useState<SubscriberFrequencyValue>('EVERY_POST');
    const honeypotRef = useRef<HTMLInputElement>(null);

    // Flow state
    const [screen, setScreen] = useState<Screen>({ kind: 'form' });
    const [submitting, setSubmitting] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [submittedEmail, setSubmittedEmail] = useState('');

    // Resend cooldown (seconds remaining)
    const [cooldown, setCooldown] = useState(0);
    const [resending, setResending] = useState(false);
    const [resendNote, setResendNote] = useState<string | null>(null);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const toggleTopic = useCallback((value: BlogTopic) => {
        setSelectedTopics((prev) => {
            const next = new Set(prev);
            if (next.has(value)) next.delete(value);
            else next.add(value);
            return next;
        });
    }, []);

    const applyResult = useCallback((data: SubscribeResponse, usedEmail: string) => {
        const masked = data.maskedEmail ?? maskEmail(usedEmail);
        switch (data.state) {
            case 'verification_sent':
            case 'verification_resent':
            case 'cooldown':
                setSubmittedEmail(usedEmail);
                setScreen({ kind: 'verification', maskedEmail: masked });
                setCooldown(data.retryAfterSeconds ?? 60);
                break;
            case 'already_active':
                setScreen({ kind: 'active', maskedEmail: masked });
                break;
            case 'invalid_email':
                setEmailError(data.message ?? 'Please enter a valid email address.');
                break;
            case 'send_failed':
                setEmailError(
                    data.message ?? "We couldn't send the confirmation email. Please try again in a moment."
                );
                break;
            case 'too_many_attempts':
                setScreen({
                    kind: 'error',
                    message: data.message ?? 'Too many attempts for now. Please try again a little later.',
                });
                break;
            default:
                setScreen({
                    kind: 'error',
                    message: data.message ?? 'Something went wrong on our side. Please try again.',
                });
        }
    }, []);

    const handleSubmit = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();
            if (submitting) return;
            setEmailError(null);

            const trimmedEmail = email.trim();
            if (!EMAIL_RE.test(trimmedEmail)) {
                setEmailError('Please enter a valid email address.');
                return;
            }

            // Honeypot: bots fill this hidden field; humans never see it.
            const honeypot = honeypotRef.current?.value ?? '';

            const noneChosen = selectedTopics.size === 0;
            const effectiveAll = allTopics || noneChosen;

            setSubmitting(true);
            try {
                const response = await fetch('/api/blog/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: trimmedEmail,
                        name: name.trim() || undefined,
                        allTopics: effectiveAll,
                        topics: effectiveAll ? undefined : Array.from(selectedTopics),
                        frequency,
                        source,
                        company: honeypot,
                    }),
                });
                const data = await parseJson(response);
                applyResult(data, trimmedEmail);
            } catch {
                setScreen({
                    kind: 'error',
                    message: 'We could not reach the server. Please check your connection and try again.',
                });
            } finally {
                setSubmitting(false);
            }
        },
        [allTopics, applyResult, email, frequency, name, selectedTopics, source, submitting]
    );

    const handleResend = useCallback(async () => {
        if (cooldown > 0 || resending || !submittedEmail) return;
        setResending(true);
        setResendNote(null);
        try {
            const response = await fetch('/api/blog/subscribe/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: submittedEmail }),
            });
            const data = await parseJson(response);
            if (data.state === 'already_active') {
                setScreen({ kind: 'active', maskedEmail: data.maskedEmail ?? maskEmail(submittedEmail) });
                return;
            }
            setCooldown(data.retryAfterSeconds ?? 60);
            setResendNote(
                data.state === 'verification_resent'
                    ? 'Done — we just sent another confirmation link.'
                    : data.message ?? 'If that address needs confirming, a new link is on its way.'
            );
        } catch {
            setResendNote('We could not resend right now. Please try again shortly.');
        } finally {
            setResending(false);
        }
    }, [cooldown, resending, submittedEmail]);

    const resetToForm = useCallback(() => {
        setScreen({ kind: 'form' });
        setEmailError(null);
        setResendNote(null);
    }, []);

    const selectedCount = selectedTopics.size;
    const topicSummary = useMemo(() => {
        if (allTopics || selectedCount === 0) return 'Every new topic we publish';
        if (selectedCount === 1) return '1 topic selected';
        return `${selectedCount} topics selected`;
    }, [allTopics, selectedCount]);

    return (
        <section
            className={cn(
                'relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 text-white shadow-xl sm:p-10 dark:from-emerald-700 dark:via-emerald-600 dark:to-teal-600',
                className
            )}
        >
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -top-1/3 -right-1/4 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-1/3 -left-1/4 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />

            <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
                {/* Pitch */}
                <div className="text-center lg:text-left">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm lg:mx-0">
                        <Mail className="h-6 w-6" aria-hidden />
                    </div>
                    <h2 className="text-2xl font-bold sm:text-3xl">Stay ahead of the flock</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-emerald-50 sm:text-base lg:mx-0">
                        Get expert poultry farming tips, market trends and fresh guides — delivered only for the
                        topics you care about.
                    </p>

                    <ul className="mt-6 hidden space-y-3 lg:block">
                        {[
                            { icon: BellRing, text: 'New articles the moment they go live' },
                            { icon: Sparkles, text: 'Choose exactly the topics you want' },
                            { icon: ShieldCheck, text: 'Double opt-in. Unsubscribe in one click.' },
                        ].map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3 text-sm text-emerald-50">
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
                                    <Icon className="h-4 w-4" aria-hidden />
                                </span>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Card */}
                <div className="rounded-2xl bg-white p-5 shadow-2xl sm:p-6 dark:bg-slate-900">
                    <AnimatePresence mode="wait">
                        {screen.kind === 'form' && (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.25 }}
                                onSubmit={handleSubmit}
                                className="space-y-4"
                                noValidate
                            >
                                {/* Honeypot — hidden from real users */}
                                <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden>
                                    <label htmlFor="nl-company">Company</label>
                                    <input
                                        ref={honeypotRef}
                                        id="nl-company"
                                        name="company"
                                        type="text"
                                        tabIndex={-1}
                                        autoComplete="off"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="nl-name" className="text-gray-700 dark:text-slate-200">
                                        Name <span className="font-normal text-gray-400 dark:text-slate-500">(optional)</span>
                                    </Label>
                                    <Input
                                        id="nl-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Jane Wanjiku"
                                        maxLength={100}
                                        className="bg-white dark:bg-slate-950"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="nl-email" className="text-gray-700 dark:text-slate-200">
                                        Email address
                                    </Label>
                                    <Input
                                        id="nl-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (emailError) setEmailError(null);
                                        }}
                                        placeholder="you@example.com"
                                        required
                                        aria-invalid={emailError ? true : undefined}
                                        aria-describedby={emailError ? 'nl-email-error' : undefined}
                                        className={cn(
                                            'bg-white dark:bg-slate-950',
                                            emailError && 'border-red-400 focus-visible:ring-red-400'
                                        )}
                                    />
                                    {emailError && (
                                        <p id="nl-email-error" className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                                            {emailError}
                                        </p>
                                    )}
                                </div>

                                {/* Topics */}
                                <fieldset className="space-y-3 rounded-xl border border-gray-100 p-3 dark:border-slate-800">
                                    <div className="flex items-center justify-between gap-3">
                                        <legend className="text-sm font-medium text-gray-700 dark:text-slate-200">
                                            What interests you?
                                        </legend>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="nl-all" className="text-xs text-gray-500 dark:text-slate-400">
                                                Send me everything
                                            </Label>
                                            <Switch
                                                id="nl-all"
                                                checked={allTopics}
                                                onCheckedChange={(checked) => setAllTopics(checked === true)}
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
                                    <legend className="text-sm font-medium text-gray-700 dark:text-slate-200">
                                        How often?
                                    </legend>
                                    <RadioGroup
                                        value={frequency}
                                        onValueChange={(value) => setFrequency(value as SubscriberFrequencyValue)}
                                        className="gap-2"
                                    >
                                        {SUBSCRIBER_FREQUENCIES.map((freq) => (
                                            <label
                                                key={freq.value}
                                                htmlFor={`nl-freq-${freq.value}`}
                                                className={cn(
                                                    'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors',
                                                    frequency === freq.value
                                                        ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-500/10'
                                                        : 'border-gray-200 hover:border-emerald-300 dark:border-slate-700 dark:hover:border-emerald-600'
                                                )}
                                            >
                                                <RadioGroupItem id={`nl-freq-${freq.value}`} value={freq.value} className="mt-0.5" />
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

                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="h-12 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                                            Subscribing…
                                        </>
                                    ) : (
                                        'Subscribe'
                                    )}
                                </Button>

                                <p className="text-center text-xs text-gray-400 dark:text-slate-500">
                                    We&apos;ll send a confirmation link. No spam — unsubscribe anytime.
                                </p>
                            </motion.form>
                        )}

                        {screen.kind === 'verification' && (
                            <motion.div
                                key="verification"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.25 }}
                                className="py-4 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0.6 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15"
                                >
                                    <MailCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                </motion.div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                                    Almost there — check your inbox
                                </h3>
                                <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-slate-400">
                                    We sent a confirmation link to{' '}
                                    <span className="font-medium text-gray-900 dark:text-slate-100">{screen.maskedEmail}</span>.
                                    Click it to activate your subscription.
                                </p>

                                <div className="mt-6 space-y-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleResend}
                                        disabled={cooldown > 0 || resending}
                                        className="h-11 w-full"
                                    >
                                        {resending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                                Sending…
                                            </>
                                        ) : cooldown > 0 ? (
                                            `Resend link in ${cooldown}s`
                                        ) : (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                                                Resend confirmation link
                                            </>
                                        )}
                                    </Button>
                                    {resendNote && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400">{resendNote}</p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={resetToForm}
                                        className="text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
                                    >
                                        Use a different email
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {screen.kind === 'active' && (
                            <motion.div
                                key="active"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.25 }}
                                className="py-6 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0.6 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15"
                                >
                                    <PartyPopper className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
                                </motion.div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                                    You&apos;re already subscribed
                                </h3>
                                <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-slate-400">
                                    <span className="font-medium text-gray-900 dark:text-slate-100">{screen.maskedEmail}</span>{' '}
                                    is already on the list. Want to change your topics? Use the manage link at the bottom of
                                    any of our emails.
                                </p>
                                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                                    Thanks for being part of the flock!
                                </div>
                            </motion.div>
                        )}

                        {screen.kind === 'error' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.25 }}
                                className="py-6 text-center"
                            >
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
                                    <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">Hmm, that didn&apos;t work</h3>
                                <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-slate-400">
                                    {screen.message}
                                </p>
                                <Button type="button" onClick={resetToForm} className="mt-6 h-11 bg-emerald-600 px-8 text-white hover:bg-emerald-700">
                                    Try again
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
