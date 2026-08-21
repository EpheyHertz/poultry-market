'use client';

/**
 * ShareButtons (§11, §13)
 *
 * Three variants, one implementation:
 *   - `row`   — compact horizontal row (mobile + under the article header)
 *   - `rail`  — vertical floating rail (desktop ≥1280px, beside the article)
 *   - `icon`  — single button that uses the Web Share API when available
 *
 * No third-party SDKs: plain share intent URLs opened in a new window.
 */

import { useCallback, useState } from 'react';
import { Check, Facebook, Link2, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ShareNetwork = 'facebook' | 'whatsapp' | 'x' | 'copy' | 'native';

interface ShareButtonsProps {
    /** Absolute canonical URL of the article. */
    url: string;
    title: string;
    variant?: 'row' | 'rail' | 'icon';
    className?: string;
    /** Analytics hook (§13 "share click"). */
    onShare?: (network: ShareNetwork) => void;
}

/** X logo isn't in lucide — small inline mark keeps the bundle lean. */
function XIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

export function ShareButtons({
    url,
    title,
    variant = 'row',
    className,
    onShare,
}: ShareButtonsProps) {
    const [copied, setCopied] = useState(false);

    const openShareWindow = useCallback((shareUrl: string) => {
        window.open(shareUrl, '_blank', 'noopener,noreferrer,width=640,height=580');
    }, []);

    const handleShare = useCallback(
        async (network: ShareNetwork) => {
            const encodedUrl = encodeURIComponent(url);
            const encodedTitle = encodeURIComponent(title);
            onShare?.(network);

            switch (network) {
                case 'facebook':
                    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
                    break;
                case 'whatsapp':
                    openShareWindow(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`);
                    break;
                case 'x':
                    openShareWindow(
                        `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
                    );
                    break;
                case 'copy':
                    try {
                        await navigator.clipboard.writeText(url);
                        setCopied(true);
                        toast.success('Link copied to clipboard');
                        setTimeout(() => setCopied(false), 2000);
                    } catch {
                        toast.error('Could not copy the link');
                    }
                    break;
                case 'native':
                    try {
                        if (navigator.share) {
                            await navigator.share({ title, url });
                        } else {
                            await navigator.clipboard.writeText(url);
                            toast.success('Link copied to clipboard');
                        }
                    } catch {
                        // User dismissed the share sheet — not an error.
                    }
                    break;
            }
        },
        [onShare, openShareWindow, title, url],
    );

    const buttons: Array<{
        network: ShareNetwork;
        label: string;
        icon: React.ReactNode;
        hover: string;
    }> = [
            {
                network: 'facebook',
                label: 'Share on Facebook',
                icon: <Facebook className="h-4 w-4" aria-hidden="true" />,
                hover: 'hover:border-[#1877F2] hover:text-[#1877F2]',
            },
            {
                network: 'whatsapp',
                label: 'Share on WhatsApp',
                icon: <MessageCircle className="h-4 w-4" aria-hidden="true" />,
                hover: 'hover:border-[#25D366] hover:text-[#25D366]',
            },
            {
                network: 'x',
                label: 'Share on X',
                icon: <XIcon className="h-[15px] w-[15px]" />,
                hover: 'hover:border-gray-900 hover:text-gray-900 dark:hover:border-white dark:hover:text-white',
            },
            {
                network: 'copy',
                label: 'Copy link',
                icon: copied ? (
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                ) : (
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                ),
                hover: 'hover:border-emerald-500 hover:text-emerald-600',
            },
        ];

    if (variant === 'icon') {
        return (
            <button
                type="button"
                onClick={() => handleShare('native')}
                aria-label="Share this article"
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400',
                    className,
                )}
            >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share
            </button>
        );
    }

    if (variant === 'rail') {
        return (
            <div className={cn('flex flex-col items-center gap-2', className)}>
                <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Share
                </span>
                {buttons.map((button) => (
                    <button
                        key={button.network}
                        type="button"
                        onClick={() => handleShare(button.network)}
                        aria-label={button.label}
                        title={button.label}
                        className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
                            button.hover,
                        )}
                    >
                        {button.icon}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wide text-gray-400 sm:inline">
                Share
            </span>
            {buttons.map((button) => (
                <button
                    key={button.network}
                    type="button"
                    onClick={() => handleShare(button.network)}
                    aria-label={button.label}
                    title={button.label}
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all duration-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
                        button.hover,
                    )}
                >
                    {button.icon}
                </button>
            ))}
        </div>
    );
}

export default ShareButtons;
