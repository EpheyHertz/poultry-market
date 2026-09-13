'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, MailCheck, AlertCircle, Clock, RefreshCw, ArrowRight, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NewsletterShell } from '@/components/blog/newsletter-shell';

interface VerifyResponse {
    ok: boolean;
    state: string;
    message?: string;
    email?: string;
    manageUrl?: string;
}

type View =
    | { kind: 'loading' }
    | { kind: 'success'; manageUrl?: string; message?: string }
    | { kind: 'expired'; email?: string; message?: string }
    | { kind: 'error'; message: string };

export default function VerifyClient() {
    const params = useSearchParams();
    const token = params?.get('token') ?? '';

    const [view, setView] = useState<View>({ kind: 'loading' });
    const [resending, setResending] = useState(false);
    const [resendNote, setResendNote] = useState<string | null>(null);
    const startedRef = useRef(false);

    useEffect(() => {
        // Guard against the double-invoke in React strict mode / fast refresh.
        if (startedRef.current) return;
        startedRef.current = true;

        if (!token) {
            setView({
                kind: 'error',
                message: 'This confirmation link is missing its token. Please open the link directly from your email.',
            });
            return;
        }

        (async () => {
            try {
                const res = await fetch('/api/blog/subscribe/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                const data: VerifyResponse = await res
                    .json()
                    .catch(() => ({ ok: false, state: 'error' }) as VerifyResponse);

                switch (data.state) {
                    case 'verified':
                    case 'already_verified':
                        setView({ kind: 'success', manageUrl: data.manageUrl, message: data.message });
                        break;
                    case 'expired':
                        setView({ kind: 'expired', email: data.email, message: data.message });
                        break;
                    default:
                        setView({ kind: 'error', message: data.message ?? 'This confirmation link is not valid.' });
                }
            } catch {
                setView({
                    kind: 'error',
                    message: 'We could not reach the server. Please try again in a moment.',
                });
            }
        })();
    }, [token]);

    const handleResend = useCallback(async () => {
        if (view.kind !== 'expired' || !view.email || resending) return;
        setResending(true);
        setResendNote(null);
        try {
            const res = await fetch('/api/blog/subscribe/resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: view.email }),
            });
            const data = await res.json().catch(() => ({}));
            setResendNote(
                data.message ?? 'If that address still needs confirming, a fresh link is on its way.'
            );
        } catch {
            setResendNote('We could not resend right now. Please try again shortly.');
        } finally {
            setResending(false);
        }
    }, [resending, view]);

    return (
        <NewsletterShell>
            {view.kind === 'loading' && (
                <div className="flex flex-col items-center py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <h1 className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
                        Confirming your subscription…
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">This only takes a moment.</p>
                </div>
            )}

            {view.kind === 'success' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                        <MailCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">You&apos;re all set! 🎉</h1>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-slate-400">
                        Your subscription is confirmed. We&apos;ll send fresh poultry farming insights straight to your
                        inbox.
                    </p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                            <Link href="/blog">
                                Explore the blog
                                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                            </Link>
                        </Button>
                        {view.manageUrl && (
                            <Button asChild variant="outline">
                                <Link href={view.manageUrl}>
                                    <Settings2 className="mr-1.5 h-4 w-4" aria-hidden />
                                    Manage preferences
                                </Link>
                            </Button>
                        )}
                    </div>
                </motion.div>
            )}

            {view.kind === 'expired' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
                        <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" aria-hidden />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">This link has expired</h1>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-slate-400">
                        {view.message ?? 'Confirmation links are valid for a limited time. We can send you a fresh one.'}
                    </p>
                    {view.email ? (
                        <div className="mt-6 space-y-2">
                            <Button
                                onClick={handleResend}
                                disabled={resending}
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {resending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                        Sending…
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                                        Send a new link
                                    </>
                                )}
                            </Button>
                            {resendNote && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">{resendNote}</p>
                            )}
                        </div>
                    ) : (
                        <div className="mt-6">
                            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                                <Link href="/blog#subscribe">Subscribe again</Link>
                            </Button>
                        </div>
                    )}
                </motion.div>
            )}

            {view.kind === 'error' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
                        <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                        We couldn&apos;t confirm that
                    </h1>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600 dark:text-slate-400">{view.message}</p>
                    <div className="mt-6">
                        <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                            <Link href="/blog#subscribe">Subscribe again</Link>
                        </Button>
                    </div>
                </motion.div>
            )}
        </NewsletterShell>
    );
}
