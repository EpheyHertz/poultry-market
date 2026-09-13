/**
 * Central configuration for the email + subscription system.
 *
 * Everything that used to be guessed inline (from-addresses, app URL, brand
 * strings) now lives here so templates, the sender and the admin dashboard all
 * agree on one source of truth.
 */

import type { MailerAccount } from '@/lib/email';

export const BRAND = {
    name: 'Poultry Market Kenya',
    shortName: 'Poultry Market',
    tagline: 'Fresh poultry, trusted sellers and expert farming know-how.',
    fallbackUrl: 'https://poultrymarket.co.ke',
    location: 'Nairobi, Kenya',
} as const;

/** Palette used by the email templates (inline styles - no Tailwind in email). */
export const EMAIL_COLORS = {
    primary: '#16a34a',
    primaryDark: '#15803d',
    primarySoft: '#dcfce7',
    accent: '#f59e0b',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    background: '#f1f5f9',
    surface: '#ffffff',
    danger: '#dc2626',
} as const;

/** Friendly display names per Resend sub-account. */
const SENDER_NAMES: Record<MailerAccount, string> = {
    default: BRAND.name,
    reminder: `${BRAND.name} Reminders`,
    notify: `${BRAND.name} Notifications`,
    admin: `${BRAND.name} Team`,
    onboard: BRAND.name,
    blog: `${BRAND.name} Blog`,
};

export const MAILER_ACCOUNTS: MailerAccount[] = [
    'default',
    'reminder',
    'notify',
    'admin',
    'onboard',
    'blog',
];

export function isMailerAccount(value: unknown): value is MailerAccount {
    return typeof value === 'string' && (MAILER_ACCOUNTS as string[]).includes(value);
}

/**
 * Absolute base URL of the app. Emails can never use relative links, so this
 * always returns a fully qualified origin without a trailing slash.
 */
export function getAppUrl(): string {
    const raw =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXTAUTH_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
        BRAND.fallbackUrl;

    const trimmed = raw.trim().replace(/\/+$/, '');
    if (!trimmed) return BRAND.fallbackUrl;
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Builds an absolute URL for an in-app path (`/blog`, `blog`, both fine). */
export function absoluteUrl(path = '/'): string {
    if (/^https?:\/\//i.test(path)) return path;
    const base = getAppUrl();
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Extracts the bare mail domain from MAIL_DOMAIN, which may be configured as
 * either `example.com` or `anything@example.com`.
 */
export function getMailDomain(): string | null {
    const raw = process.env.MAIL_DOMAIN?.trim();
    if (!raw) return null;

    const atIndex = raw.indexOf('@');
    const domain = (atIndex > 0 ? raw.slice(atIndex + 1) : raw).trim().toLowerCase();
    if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return null;

    return domain;
}

export type SenderIdentity = {
    account: MailerAccount;
    email: string;
    name: string;
    from: string;
};

/** Resolves a `Name <address@domain>` sender for the given account. */
export function getSenderIdentity(
    account: MailerAccount = 'blog',
    overrideName?: string | null
): SenderIdentity | null {
    const domain = getMailDomain();
    if (!domain) return null;

    const email = `${account}@${domain}`;
    const name = sanitizeSenderName(overrideName) || SENDER_NAMES[account] || BRAND.name;

    return { account, email, name, from: `${name} <${email}>` };
}

/** Strips characters that would break the From header. */
export function sanitizeSenderName(name?: string | null): string {
    if (!name) return '';
    return name.replace(/["\r\n<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64);
}

/** Reply-to used across the platform (falls back to the admin inbox). */
export function getReplyTo(): string | undefined {
    return process.env.ADMIN_GMAIL_USER?.trim() || process.env.REPLY_TO_EMAIL?.trim() || undefined;
}

export function getSupportEmail(): string {
    return getReplyTo() || `support@${getMailDomain() || 'poultrymarket.co.ke'}`;
}

export type EmailConfigStatus = {
    ready: boolean;
    issues: string[];
    warnings: string[];
    details: {
        resendApiKey: boolean;
        mailDomain: string | null;
        appUrl: string;
        replyTo: string | null;
        cronSecret: boolean;
        sampleFrom: string | null;
    };
};

/**
 * Health check for the email stack - surfaced in the admin dashboard and by
 * `scripts/email-doctor.js` so misconfiguration is visible before a send fails.
 */
export function getEmailConfigStatus(): EmailConfigStatus {
    const issues: string[] = [];
    const warnings: string[] = [];

    const hasApiKey = Boolean(process.env.RESEND_API_KEY?.trim());
    if (!hasApiKey) issues.push('RESEND_API_KEY is not set - no email can be sent.');

    const domain = getMailDomain();
    if (!domain) {
        issues.push('MAIL_DOMAIN is missing or invalid - sender addresses cannot be built.');
    }

    const appUrl = getAppUrl();
    if (appUrl.includes('localhost')) {
        warnings.push('NEXT_PUBLIC_APP_URL points at localhost - links in emails will not work for recipients.');
    }

    const replyTo = getReplyTo();
    if (!replyTo) {
        warnings.push('ADMIN_GMAIL_USER / REPLY_TO_EMAIL not set - replies will go to the no-reply sender.');
    }

    const hasCronSecret = Boolean(process.env.CRON_SECRET?.trim());
    if (!hasCronSecret) {
        warnings.push('CRON_SECRET is not set - the queue drain endpoint cannot be triggered safely.');
    }

    return {
        ready: issues.length === 0,
        issues,
        warnings,
        details: {
            resendApiKey: hasApiKey,
            mailDomain: domain,
            appUrl,
            replyTo: replyTo ?? null,
            cronSecret: hasCronSecret,
            sampleFrom: getSenderIdentity('blog')?.from ?? null,
        },
    };
}

/** Tunables for the subscription lifecycle. */
export const EMAIL_LIMITS = {
    /** How long a verification link stays valid. */
    verificationTtlHours: 48,
    /** Minimum gap between verification emails for the same address. */
    resendCooldownSeconds: 60,
    /** Hard cap on verification emails per subscriber before manual help. */
    maxVerificationSends: 8,
    /** Recipients processed per drain batch. */
    batchSize: 25,
    /** Pause between batches to stay under provider rate limits (ms). */
    batchDelayMs: 1_000,
    /** Delivery attempts before a recipient is marked failed for good. */
    maxDeliveryAttempts: 3,
    /** Max recipients queued for a single campaign. */
    maxRecipientsPerCampaign: 50_000,
} as const;
