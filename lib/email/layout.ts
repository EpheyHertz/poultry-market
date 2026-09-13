/**
 * Shared HTML shell + building blocks for every transactional and campaign
 * email. Table based, 600px, inline styles, with a hidden preheader and a
 * compliant footer (manage preferences + unsubscribe on every bulk message).
 */

import { BRAND, EMAIL_COLORS, absoluteUrl } from './config';
import { getTopicMeta, type BlogTopic } from './topics';

export function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Only allow links we are willing to put in an email. */
export function safeUrl(url: string | null | undefined, fallback = ''): string {
    const value = (url ?? '').trim();
    if (!value) return fallback;
    if (/^https?:\/\//i.test(value) || value.startsWith('mailto:')) return escapeHtml(value);
    if (value.startsWith('/')) return escapeHtml(absoluteUrl(value));
    return fallback;
}

export type EmailLayoutOptions = {
    /** <title> + fallback heading for screen readers. */
    title: string;
    /** Inbox preview line - the single biggest open-rate lever. */
    preheader?: string;
    /** Main heading rendered at the top of the card. */
    heading?: string;
    /** Optional line under the heading. */
    subheading?: string;
    /** Pre-rendered HTML for the body. */
    body: string;
    /** Small print above the footer links. */
    footerNote?: string;
    manageUrl?: string | null;
    unsubscribeUrl?: string | null;
    /** Accent used for the top bar + heading rule. */
    accentColor?: string;
};

export function renderEmailLayout(options: EmailLayoutOptions): string {
    const {
        title,
        preheader = '',
        heading,
        subheading,
        body,
        footerNote,
        manageUrl,
        unsubscribeUrl,
        accentColor = EMAIL_COLORS.primary,
    } = options;

    const year = new Date().getFullYear();
    const homeUrl = absoluteUrl('/');
    const blogUrl = absoluteUrl('/blog');

    const footerLinks: string[] = [
        `<a href="${escapeHtml(blogUrl)}" style="color:${EMAIL_COLORS.muted};text-decoration:underline;">Read the blog</a>`,
    ];
    if (manageUrl) {
        footerLinks.push(
            `<a href="${safeUrl(manageUrl)}" style="color:${EMAIL_COLORS.muted};text-decoration:underline;">Manage preferences</a>`
        );
    }
    if (unsubscribeUrl) {
        footerLinks.push(
            `<a href="${safeUrl(unsubscribeUrl)}" style="color:${EMAIL_COLORS.muted};text-decoration:underline;">Unsubscribe</a>`
        );
    }

    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escapeHtml(title)}</title>
<style>
  body { margin:0; padding:0; width:100% !important; background:${EMAIL_COLORS.background}; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  table { border-collapse:collapse !important; }
  a { color:${EMAIL_COLORS.primaryDark}; }
  .pm-wrapper { width:100%; background:${EMAIL_COLORS.background}; }
  .pm-card { width:600px; max-width:100%; }
  @media only screen and (max-width:620px) {
    .pm-card { width:100% !important; }
    .pm-pad { padding-left:20px !important; padding-right:20px !important; }
    .pm-h1 { font-size:22px !important; line-height:30px !important; }
    .pm-btn a { display:block !important; text-align:center !important; }
  }
  @media (prefers-color-scheme: dark) {
    .pm-wrapper { background:#0b1120 !important; }
    .pm-surface { background:#111827 !important; }
    .pm-text { color:#e5e7eb !important; }
    .pm-muted { color:#9ca3af !important; }
    .pm-border { border-color:#1f2937 !important; }
    .pm-soft { background:#0f291c !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.background};">
  <div style="display:none;font-size:1px;color:${EMAIL_COLORS.background};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <div style="display:none;max-height:0;overflow:hidden;">&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>

  <table role="presentation" class="pm-wrapper" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_COLORS.background};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="pm-card" width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 0 16px 0;" align="center">
              <a href="${escapeHtml(homeUrl)}" style="text-decoration:none;color:${EMAIL_COLORS.text};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;">
                <span style="font-size:20px;">&#128020;</span>
                <span class="pm-text" style="color:${EMAIL_COLORS.text};">${escapeHtml(BRAND.name)}</span>
              </a>
            </td>
          </tr>
          <tr>
            <td class="pm-surface" style="background:${EMAIL_COLORS.surface};border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:5px;background:${accentColor};font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td class="pm-pad" style="padding:32px 36px 8px 36px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                    ${heading
            ? `<h1 class="pm-h1 pm-text" style="margin:0 0 ${subheading ? '8px' : '16px'} 0;font-size:26px;line-height:34px;font-weight:700;color:${EMAIL_COLORS.text};">${escapeHtml(heading)}</h1>`
            : ''}
                    ${subheading
            ? `<p class="pm-muted" style="margin:0 0 16px 0;font-size:15px;line-height:23px;color:${EMAIL_COLORS.muted};">${escapeHtml(subheading)}</p>`
            : ''}
                  </td>
                </tr>
                <tr>
                  <td class="pm-pad" style="padding:0 36px 32px 36px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:25px;color:${EMAIL_COLORS.text};">
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="pm-pad" style="padding:22px 24px 8px 24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:${EMAIL_COLORS.muted};" align="center">
              ${footerNote ? `<p class="pm-muted" style="margin:0 0 10px 0;color:${EMAIL_COLORS.muted};">${footerNote}</p>` : ''}
              <p class="pm-muted" style="margin:0 0 10px 0;color:${EMAIL_COLORS.muted};">${footerLinks.join('&nbsp;&nbsp;&bull;&nbsp;&nbsp;')}</p>
              <p class="pm-muted" style="margin:0;color:${EMAIL_COLORS.muted};">&copy; ${year} ${escapeHtml(BRAND.name)} &bull; ${escapeHtml(BRAND.location)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Bulletproof-ish CTA button. */
export function emailButton(
    label: string,
    url: string,
    options: { color?: string; align?: 'left' | 'center'; secondary?: boolean } = {}
): string {
    const { color = EMAIL_COLORS.primary, align = 'left', secondary = false } = options;
    const background = secondary ? EMAIL_COLORS.surface : color;
    const textColor = secondary ? color : '#ffffff';
    const border = secondary ? `2px solid ${color}` : `2px solid ${color}`;

    return `<table role="presentation" cellpadding="0" cellspacing="0" class="pm-btn" style="margin:8px 0 8px 0;" align="${align}">
  <tr>
    <td style="border-radius:10px;background:${background};border:${border};">
      <a href="${safeUrl(url)}" style="display:inline-block;padding:13px 26px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:${textColor};text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function emailParagraph(html: string, options: { muted?: boolean; small?: boolean } = {}): string {
    const size = options.small ? '14px' : '16px';
    const lineHeight = options.small ? '22px' : '25px';
    const color = options.muted ? EMAIL_COLORS.muted : EMAIL_COLORS.text;
    const cls = options.muted ? 'pm-muted' : 'pm-text';
    return `<p class="${cls}" style="margin:0 0 16px 0;font-size:${size};line-height:${lineHeight};color:${color};">${html}</p>`;
}

export function emailDivider(): string {
    return `<hr class="pm-border" style="border:none;border-top:1px solid ${EMAIL_COLORS.border};margin:24px 0;" />`;
}

/** Soft callout box used for tips and "what happens next" copy. */
export function emailCallout(html: string, options: { color?: string; title?: string } = {}): string {
    const color = options.color ?? EMAIL_COLORS.primary;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
  <tr>
    <td class="pm-soft pm-border" style="background:${EMAIL_COLORS.primarySoft};border-left:4px solid ${color};border-radius:10px;padding:16px 18px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:23px;color:${EMAIL_COLORS.text};">
      ${options.title ? `<strong style="display:block;margin-bottom:6px;">${escapeHtml(options.title)}</strong>` : ''}
      ${html}
    </td>
  </tr>
</table>`;
}

/** Renders the subscriber's ticked topics as chips. */
export function emailTopicChips(topics: BlogTopic[], allTopics: boolean): string {
    if (allTopics || topics.length === 0) {
        return `<span style="display:inline-block;padding:6px 12px;margin:0 6px 6px 0;border-radius:999px;background:${EMAIL_COLORS.primarySoft};color:${EMAIL_COLORS.primaryDark};font-size:13px;font-weight:600;">Every topic</span>`;
    }

    return topics
        .map((topic) => {
            const meta = getTopicMeta(topic);
            return `<span style="display:inline-block;padding:6px 12px;margin:0 6px 6px 0;border-radius:999px;background:#f1f5f9;color:${meta.color};font-size:13px;font-weight:600;">${meta.emoji} ${escapeHtml(meta.label)}</span>`;
        })
        .join('');
}

export type EmailArticle = {
    title: string;
    url: string;
    excerpt?: string | null;
    imageUrl?: string | null;
    category?: string | null;
    categoryColor?: string | null;
    authorName?: string | null;
    readingTime?: number | null;
    publishedAt?: Date | string | null;
};

function formatDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Article card used by blog notifications and the weekly digest. */
export function emailArticleCard(article: EmailArticle, options: { compact?: boolean } = {}): string {
    const meta: string[] = [];
    if (article.category) meta.push(escapeHtml(article.category));
    if (article.readingTime) meta.push(`${article.readingTime} min read`);
    const dateLabel = formatDate(article.publishedAt);
    if (dateLabel) meta.push(escapeHtml(dateLabel));

    const image =
        !options.compact && article.imageUrl
            ? `<tr>
    <td>
      <a href="${safeUrl(article.url)}" style="display:block;">
        <img src="${safeUrl(article.imageUrl)}" width="528" alt="${escapeHtml(article.title)}" style="width:100%;max-width:528px;height:auto;display:block;border-radius:10px;" />
      </a>
    </td>
  </tr>`
            : '';

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="pm-border" style="margin:0 0 18px 0;border:1px solid ${EMAIL_COLORS.border};border-radius:12px;">
  <tr>
    <td style="padding:${options.compact ? '16px 18px' : '18px'};font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${image}
        <tr>
          <td style="padding-top:${image ? '14px' : '0'};">
            ${article.category
            ? `<span style="display:inline-block;margin:0 0 8px 0;padding:4px 10px;border-radius:999px;background:${EMAIL_COLORS.primarySoft};color:${article.categoryColor || EMAIL_COLORS.primaryDark};font-size:12px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">${escapeHtml(article.category)}</span>`
            : ''}
            <a href="${safeUrl(article.url)}" style="text-decoration:none;">
              <h2 class="pm-text" style="margin:0 0 8px 0;font-size:19px;line-height:27px;font-weight:700;color:${EMAIL_COLORS.text};">${escapeHtml(article.title)}</h2>
            </a>
            ${article.excerpt
            ? `<p class="pm-muted" style="margin:0 0 12px 0;font-size:15px;line-height:23px;color:${EMAIL_COLORS.muted};">${escapeHtml(article.excerpt)}</p>`
            : ''}
            <p class="pm-muted" style="margin:0 0 14px 0;font-size:13px;line-height:20px;color:${EMAIL_COLORS.muted};">
              ${article.authorName ? `By ${escapeHtml(article.authorName)}${meta.length ? ' &bull; ' : ''}` : ''}${meta.join(' &bull; ')}
            </p>
            <a href="${safeUrl(article.url)}" style="font-size:15px;font-weight:600;color:${EMAIL_COLORS.primaryDark};text-decoration:none;">Read the article &rarr;</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Converts admin-authored plain text into safe HTML:
 * blank lines -> paragraphs, single newlines -> <br>, "- " -> bullets,
 * **bold**, *italic*, and bare URLs become links. Everything is escaped first,
 * so operators can never inject markup into an outgoing email.
 */
export function contentToHtml(content: string): string {
    const escaped = escapeHtml(content.trim());
    if (!escaped) return '';

    const blocks = escaped.split(/\n\s*\n/);

    return blocks
        .map((block) => {
            const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
            const isList = lines.length > 0 && lines.every((line) => /^[-*•]\s+/.test(line));

            if (isList) {
                const items = lines
                    .map(
                        (line) =>
                            `<li style="margin:0 0 8px 0;">${inlineFormat(line.replace(/^[-*•]\s+/, ''))}</li>`
                    )
                    .join('');
                return `<ul style="margin:0 0 16px 0;padding-left:22px;font-size:16px;line-height:25px;color:${EMAIL_COLORS.text};">${items}</ul>`;
            }

            return emailParagraph(inlineFormat(lines.join('<br />')));
        })
        .join('');
}

function inlineFormat(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
        .replace(
            /(^|[\s>])((?:https?:\/\/)[^\s<]+[^\s<.,:;!?)])/g,
            (_match, prefix, url) =>
                `${prefix}<a href="${url}" style="color:${EMAIL_COLORS.primaryDark};text-decoration:underline;">${url}</a>`
        );
}
