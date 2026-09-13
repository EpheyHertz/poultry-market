import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Loader2 } from 'lucide-react';
import { NewsletterShell } from '@/components/blog/newsletter-shell';
import VerifyClient from './verify-client';

export const metadata: Metadata = {
    title: 'Confirm your subscription · Poultry Market',
    description: 'Confirm your email address to start receiving Poultry Market updates.',
    robots: { index: false, follow: false },
};

function VerifyFallback() {
    return (
        <NewsletterShell>
            <div className="flex flex-col items-center py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden />
                <p className="mt-4 text-sm text-gray-600 dark:text-slate-400">Loading…</p>
            </div>
        </NewsletterShell>
    );
}

export default function NewsletterVerifyPage() {
    return (
        <Suspense fallback={<VerifyFallback />}>
            <VerifyClient />
        </Suspense>
    );
}
