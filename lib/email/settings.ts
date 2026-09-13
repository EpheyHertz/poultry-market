/**
 * Runtime toggles for the email system.
 *
 * Stored in the `email_settings` table (one row per key) so an admin can turn
 * features on/off without a redeploy. Reads are cached for a few seconds so the
 * send loop does not hammer the database, and every read falls back to the
 * defaults if the table is unreachable - email must never crash a request.
 */
import { prisma } from '@/lib/prisma';
import type { MailerAccount } from '@/lib/email';
import { isMailerAccount, sanitizeSenderName } from './config';

export type EmailSettings = {
    /** Send a notification to matching subscribers when an article is published. */
    blogNotificationsEnabled: boolean;
    /** Send the welcome email right after a subscriber confirms. */
    welcomeEmailEnabled: boolean;
    /** Allow the weekly digest cron to build campaigns. */
    weeklyDigestEnabled: boolean;
    /** Require email confirmation before a subscriber becomes ACTIVE. */
    doubleOptIn: boolean;
    /** Default mailbox used for newsletter/campaign sends. */
    defaultSenderAccount: MailerAccount;
    /** Default "From" display name. */
    defaultSenderName: string;
    /** Extra line rendered in the footer of campaign emails. */
    footerNote: string;
};

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
    blogNotificationsEnabled: true,
    welcomeEmailEnabled: true,
    weeklyDigestEnabled: false,
    doubleOptIn: true,
    defaultSenderAccount: 'blog',
    defaultSenderName: 'Poultry Market Kenya Blog',
    footerNote: '',
};

export type EmailSettingKey = keyof EmailSettings;

const SETTING_KEYS = Object.keys(DEFAULT_EMAIL_SETTINGS) as EmailSettingKey[];

const CACHE_TTL_MS = 15_000;
let cache: { value: EmailSettings; at: number } | null = null;

/** Drop the in-process cache (called after every write). */
export function clearEmailSettingsCache(): void {
    cache = null;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(v)) return true;
        if (['false', '0', 'no', 'off'].includes(v)) return false;
    }
    if (typeof value === 'number') return value !== 0;
    return fallback;
}

function coerceString(value: unknown, fallback: string, maxLength = 200): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    return trimmed.slice(0, maxLength);
}

function coerceSetting(key: EmailSettingKey, raw: unknown, current: EmailSettings): EmailSettings[EmailSettingKey] {
    switch (key) {
        case 'blogNotificationsEnabled':
        case 'welcomeEmailEnabled':
        case 'weeklyDigestEnabled':
        case 'doubleOptIn':
            return coerceBoolean(raw, current[key]);
        case 'defaultSenderAccount':
            return isMailerAccount(raw) ? raw : current.defaultSenderAccount;
        case 'defaultSenderName':
            return sanitizeSenderName(coerceString(raw, current.defaultSenderName, 80)) || DEFAULT_EMAIL_SETTINGS.defaultSenderName;
        case 'footerNote':
            return coerceString(raw, current.footerNote, 240);
        default:
            return current[key];
    }
}

/** Reads every setting, merged over the defaults. Never throws. */
export async function getEmailSettings(options: { fresh?: boolean } = {}): Promise<EmailSettings> {
    if (!options.fresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
        return cache.value;
    }

    const value: EmailSettings = { ...DEFAULT_EMAIL_SETTINGS };

    try {
        const rows = await prisma.emailSetting.findMany({
            where: { key: { in: SETTING_KEYS } },
            select: { key: true, value: true },
        });

        for (const row of rows) {
            const key = row.key as EmailSettingKey;
            if (!SETTING_KEYS.includes(key)) continue;
            // Values are stored as `{ v: <primitive> }` so JSON columns stay object-shaped.
            const raw =
                row.value && typeof row.value === 'object' && !Array.isArray(row.value) && 'v' in (row.value as object)
                    ? (row.value as { v: unknown }).v
                    : row.value;
            (value as Record<string, unknown>)[key] = coerceSetting(key, raw, value);
        }
    } catch (error) {
        console.error('[email:settings] falling back to defaults:', error);
        return { ...DEFAULT_EMAIL_SETTINGS };
    }

    cache = { value, at: Date.now() };
    return value;
}

/** Applies a partial patch and returns the full, re-read settings object. */
export async function updateEmailSettings(
    patch: Partial<EmailSettings>,
    updatedById?: string | null
): Promise<EmailSettings> {
    const current = await getEmailSettings({ fresh: true });
    const entries = (Object.keys(patch) as EmailSettingKey[]).filter((key) => SETTING_KEYS.includes(key));

    for (const key of entries) {
        const next = coerceSetting(key, patch[key], current);
        await prisma.emailSetting.upsert({
            where: { key },
            create: { key, value: { v: next as never }, updatedById: updatedById ?? null },
            update: { value: { v: next as never }, updatedById: updatedById ?? null },
        });
    }

    clearEmailSettingsCache();
    return getEmailSettings({ fresh: true });
}

/** Convenience guard used by the publish hooks. */
export async function isEmailFeatureEnabled(
    key: 'blogNotificationsEnabled' | 'welcomeEmailEnabled' | 'weeklyDigestEnabled' | 'doubleOptIn'
): Promise<boolean> {
    const settings = await getEmailSettings();
    return settings[key];
}
