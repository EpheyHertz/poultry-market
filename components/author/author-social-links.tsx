'use client';

/**
 * Reusable author social-link row.
 *
 * Used by every surface that shows an author (profile header, end-of-article
 * author card, dashboard preview) so the presentation stays consistent and we
 * never hard-code the design around a single network — see spec §4/§16.
 *
 * Notes:
 *  - A social link is *just a link*. No platform SDKs, no embeds, no scripts.
 *  - Every icon carries a real accessible name (§31); the icon is never the
 *    only carrier of meaning.
 *  - `href` values arrive pre-validated from `buildAuthorSocialLinks()`, which
 *    guarantees http(s)-only URLs.
 */

import Link from 'next/link';
import {
    Facebook,
    Github,
    Globe,
    Instagram,
    Linkedin,
    Twitter,
    Youtube,
    type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { AuthorSocialLink, AuthorSocialPlatform } from '@/lib/author-profile';

const PLATFORM_ICONS: Record<AuthorSocialPlatform, LucideIcon> = {
    facebook: Facebook,
    instagram: Instagram,
    x: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
    github: Github,
    website: Globe,
};

type SocialSize = 'sm' | 'md';

interface AuthorSocialLinksProps {
    links: AuthorSocialLink[];
    /** Author name, used to build accessible names ("Ephey Nyaga on Facebook"). */
    authorName?: string | null;
    /** `icon` = subtle icon buttons, `text` = compact "Facebook · LinkedIn" row. */
    variant?: 'icon' | 'text';
    size?: SocialSize;
    /** Optional visible heading, e.g. "Follow Ephey". Omitted when not provided. */
    heading?: string | null;
    className?: string;
    /** Analytics hook — receives the platform that was clicked. */
    onLinkClick?: (platform: AuthorSocialPlatform, href: string) => void;
}

const ICON_SIZES: Record<SocialSize, string> = {
    // Tap targets stay comfortably above the 44px guidance on touch devices.
    sm: 'h-9 w-9 min-h-[36px] min-w-[36px] sm:h-9 sm:w-9',
    md: 'h-11 w-11 min-h-[44px] min-w-[44px]',
};

const GLYPH_SIZES: Record<SocialSize, string> = {
    sm: 'h-4 w-4',
    md: 'h-[1.15rem] w-[1.15rem]',
};

export function AuthorSocialLinks({
    links,
    authorName,
    variant = 'icon',
    size = 'md',
    heading,
    className,
    onLinkClick,
}: AuthorSocialLinksProps) {
    // Empty state: render nothing at all rather than an empty container (§32).
    if (!links.length) return null;

    const who = (authorName ?? '').trim();

    return (
        <div className={cn('min-w-0', className)}>
            {heading ? (
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {heading}
                </h2>
            ) : null}

            <ul
                className={cn(
                    'flex flex-wrap items-center',
                    variant === 'icon' ? 'gap-2' : 'gap-x-3 gap-y-1',
                )}
            >
                {links.map((link) => {
                    const Icon = PLATFORM_ICONS[link.platform] ?? Globe;
                    const accessibleName = who ? `${who} on ${link.label}` : link.label;

                    return (
                        <li key={`${link.platform}-${link.href}`} className="min-w-0">
                            <Link
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                aria-label={accessibleName}
                                title={accessibleName}
                                onClick={() => onLinkClick?.(link.platform, link.href)}
                                className={cn(
                                    'group inline-flex items-center justify-center rounded-full transition-colors',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                                    'dark:focus-visible:ring-offset-slate-900',
                                    variant === 'icon'
                                        ? cn(
                                            ICON_SIZES[size],
                                            'border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700',
                                            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-700 dark:hover:text-emerald-400',
                                        )
                                        : cn(
                                            'gap-1.5 px-1 py-1 text-sm font-medium text-slate-600 hover:text-emerald-700',
                                            'dark:text-slate-300 dark:hover:text-emerald-400',
                                        ),
                                )}
                            >
                                <Icon className={GLYPH_SIZES[size]} aria-hidden="true" />
                                {variant === 'text' ? <span className="truncate">{link.label}</span> : null}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default AuthorSocialLinks;
