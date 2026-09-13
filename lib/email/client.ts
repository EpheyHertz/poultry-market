/**
 * Low level send wrapper around Resend for the subscription system.
 *
 * Why not reuse `sendEmail()` from `lib/email.ts` directly?
 *  - it cannot set custom headers, so `List-Unsubscribe` (required by Gmail /
 *    Yahoo bulk sender rules) was impossible
 *  - it ignores Resend's `{ error }` response object, so API level failures
 *    were reported as successes
 *  - it never returns the provider message id, which we now persist per
 *    delivery for support/debugging
 *  - it ships a junk `text: "Default email body"` part on every HTML mail,
 *    which hurts deliverability
 *
 * `lib/email.ts` is left completely untouched for the rest of the app; this
 * module is used by the subscription + campaign pipeline only.
 */

import { Resend } from 'resend';
import type { MailerAccount } from '@/lib/email';
import { getReplyTo, getSenderIdentity } from './config';

let cachedClient: Resend | null = null;
let cachedKey: string | null = null;

function getClient(apiKey: string): Resend {
    if (!cachedClient || cachedKey !== apiKey) {
        cachedClient = new Resend(apiKey);
        cachedKey = apiKey;
    }
    return cachedClient;
}

export type SendMailInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
    account?: MailerAccount;
    /** Overrides the display name (e.g. an author's name for their post). */
    senderName?: string | null;
    replyTo?: string;
    /** Adds RFC 8058 one-click unsubscribe headers. */
    unsubscribeUrl?: string;
    headers?: Record<string, string>;
};

export type SendMailResult =
    | { success: true; messageId: string | null }
    | { success: false; error: string; retryable: boolean };

/** Headers must never contain CR/LF, and subjects must be a single line. */
function sanitizeHeaderValue(value: string): string {
    return value.replace(/[\r\n]+/g, ' ').trim();
}

export function sanitizeSubject(subject: string): string {
    const cleaned = sanitizeHeaderValue(subject).replace(/\s+/g, ' ');
    return cleaned.slice(0, 200) || '(no subject)';
}

/**
 * Produces a readable plain-text alternative from our HTML templates so every
 * message is a proper multipart/alternative (big deliverability win).
 */
export function htmlToPlainText(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<\/(?:p|div|tr|h1|h2|h3|h4|li|table)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<hr\s*\/?>/gi, '\n----------------\n')
        .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
            const text = String(label).replace(/<[^>]+>/g, '').trim();
            const url = String(href).trim();
            if (!text) return url;
            if (url.startsWith('mailto:') || text === url) return text;
            return `${text} (${url})`;
        })
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&bull;/g, '-')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .trim();
}

/** Resend error names that are worth retrying later. */
const RETRYABLE_ERRORS = new Set([
    'rate_limit_exceeded',
    'daily_quota_exceeded',
    'internal_server_error',
    'application_error',
    'service_unavailable',
]);

function classifyError(name: string | undefined, message: string): boolean {
    if (name && RETRYABLE_ERRORS.has(name)) return true;
    return /timeout|timed out|network|fetch failed|socket|ECONN|EAI_AGAIN|502|503|504|429/i.test(
        message
    );
}

/**
 * Sends one email. Never throws - callers get a discriminated result so a
 * single bad recipient can never take down a campaign drain.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
        return {
            success: false,
            error: 'RESEND_API_KEY is not configured',
            retryable: false,
        };
    }

    const sender = getSenderIdentity(input.account ?? 'blog', input.senderName);
    if (!sender) {
        return {
            success: false,
            error: 'MAIL_DOMAIN is missing or invalid - cannot build a sender address',
            retryable: false,
        };
    }

    const subject = sanitizeSubject(input.subject);
    const text = input.text?.trim() || htmlToPlainText(input.html);

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(input.headers ?? {})) {
        if (value) headers[key] = sanitizeHeaderValue(value);
    }

    if (input.unsubscribeUrl) {
        // RFC 8058: required by Gmail/Yahoo for bulk senders.
        headers['List-Unsubscribe'] = `<${sanitizeHeaderValue(input.unsubscribeUrl)}>`;
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    try {
        const { data, error } = await getClient(apiKey).emails.send({
            from: sender.from,
            to: input.to,
            subject,
            html: input.html,
            text,
            replyTo: input.replyTo?.trim() || getReplyTo(),
            ...(Object.keys(headers).length ? { headers } : {}),
        });

        // Resend resolves (does not throw) on API errors - the old helper
        // treated these as successes.
        if (error) {
            const message = error.message || 'Unknown Resend error';
            return {
                success: false,
                error: `${error.name || 'resend_error'}: ${message}`,
                retryable: classifyError(error.name, message),
            };
        }

        return { success: true, messageId: data?.id ?? null };
    } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        return { success: false, error: message, retryable: classifyError(undefined, message) };
    }
}

/** Small helper used between campaign batches. */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
