import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared, presentational wrapper for the standalone newsletter pages
 * (verify / preferences / unsubscribed). No hooks, so it is safe to render
 * from either server or client components.
 */
export function NewsletterShell({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
            <div className={cn('w-full max-w-lg', className)}>
                <div className="mb-6 text-center">
                    <Link
                        href="/blog"
                        className="inline-flex items-center gap-2 text-emerald-700 transition-opacity hover:opacity-80 dark:text-emerald-400"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                            <Leaf className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="text-lg font-bold">Poultry Market</span>
                    </Link>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
                    {children}
                </div>
                <p className="mt-6 text-center text-xs text-gray-400 dark:text-slate-600">
                    Poultry Market — practical poultry farming, delivered.
                </p>
            </div>
        </div>
    );
}
