/**
 * Every email the subscription system can send, in one place.
 *
 * Each renderer returns a ready-to-send `{ subject, html, text }` so routes and
 * the campaign drain never hand-roll markup.
 */

import { BRAND, EMAIL_COLORS, absoluteUrl, getSupportEmail } from './config';
import { firstNameOf } from './address';
import { htmlToPlainText } from './client';
import {
    emailArticleCard,
    emailButton,
    emailCallout,
    emailDivider,
    emailParagraph,
    emailTopicChips,
    escapeHtml,
    renderEmailLayout,
    safeUrl,
    contentToHtml,
    type EmailArticle,
} from './layout';
import { describeTopicSelection, getFrequencyLabel, getTopicLabel, type BlogTopic } from './topics';

export type RenderedEmail = {
    subject: string;
    html: string;
    text: string;
};

function finalize(subject: string, html: string): RenderedEmail {
    return { subject, html, text: htmlToPlainText(html) };
}

function preferenceSummary(topics: BlogTopic[], allTopics: boolean, frequency: string): string {
    return `<div style="margin:0 0 18px 0;">
  <p class="pm-muted" style="margin:0 0 8px 0;font-size:13px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:${EMAIL_COLORS.muted};">Your topics</p>
  <div style="margin:0 0 12px 0;">${emailTopicChips(topics, allTopics)}</div>
  <p class="pm-muted" style="margin:0;font-size:14px;line-height:21px;color:${EMAIL_COLORS.muted};">Delivery: <strong style="color:${EMAIL_COLORS.text};">${escapeHtml(getFrequencyLabel(frequency))}</strong></p>
</div>`;
}

/* ------------------------------------------------------------------ */
/* 1. Double opt-in verification                                       */
/* ------------------------------------------------------------------ */

export function renderVerificationEmail(params: {
    name?: string | null;
    topics: BlogTopic[];
    allTopics: boolean;
    frequency: string;
    verifyUrl: string;
    expiresHours: number;
    isResend?: boolean;
}): RenderedEmail {
    const greetingName = firstNameOf(params.name);
    const subject = params.isResend
        ? 'Here is your confirmation link again'
        : 'Confirm your blog subscription';

    const body = `
${emailParagraph(`Hi ${escapeHtml(greetingName)},`)}
${emailParagraph(
        `Thanks for subscribing to the <strong>${escapeHtml(BRAND.name)}</strong> blog. Tap the button below to confirm your email address and we will start sending you the guides you picked.`
    )}
${emailButton('Confirm my subscription', params.verifyUrl)}
${emailParagraph(
        `This link expires in <strong>${params.expiresHours} hours</strong> and can only be used once.`,
        { muted: true, small: true }
    )}
${emailDivider()}
${preferenceSummary(params.topics, params.allTopics, params.frequency)}
${emailParagraph(
        `Button not working? Copy and paste this link into your browser:<br /><span style="word-break:break-all;color:${EMAIL_COLORS.primaryDark};">${safeUrl(params.verifyUrl)}</span>`,
        { muted: true, small: true }
    )}
${emailParagraph(
        `If you did not request this, simply ignore this email - nothing will be sent to you and the address will be removed automatically.`,
        { muted: true, small: true }
    )}`;

    const html = renderEmailLayout({
        title: subject,
        preheader: 'One quick click and your poultry insights start flowing.',
        heading: 'Confirm your subscription',
        subheading: 'We need to be sure this email address is really yours.',
        body,
        footerNote: `You are receiving this because someone used this address to subscribe to the ${escapeHtml(BRAND.name)} blog.`,
    });

    const text = [
        `Hi ${greetingName},`,
        '',
        `Confirm your subscription to the ${BRAND.name} blog by opening this link:`,
        params.verifyUrl,
        '',
        `The link expires in ${params.expiresHours} hours and can only be used once.`,
        `Topics: ${describeTopicSelection(params.topics, params.allTopics)}`,
        `Delivery: ${getFrequencyLabel(params.frequency)}`,
        '',
        'If you did not request this, ignore this email.',
    ].join('\n');

    return { subject, html, text };
}

/* ------------------------------------------------------------------ */
/* 2. Welcome (after verification)                                     */
/* ------------------------------------------------------------------ */

export function renderWelcomeEmail(params: {
    name?: string | null;
    topics: BlogTopic[];
    allTopics: boolean;
    frequency: string;
    manageUrl: string;
    unsubscribeUrl: string;
    latestArticles?: EmailArticle[];
}): RenderedEmail {
    const greetingName = firstNameOf(params.name);
    const subject = `You're in! Welcome to the ${BRAND.name} blog`;

    const articles = (params.latestArticles ?? []).slice(0, 2);
    const articlesBlock = articles.length
        ? `${emailDivider()}
${emailParagraph('<strong>Start with these</strong>')}
${articles.map((article) => emailArticleCard(article, { compact: true })).join('')}`
        : '';

    const body = `
${emailParagraph(`Hi ${escapeHtml(greetingName)},`)}
${emailParagraph(
        `Your subscription is confirmed. From now on you will get practical poultry farming content from Kenyan farmers, vets and agri-business experts - no fluff, no spam.`
    )}
${preferenceSummary(params.topics, params.allTopics, params.frequency)}
${emailButton('Browse the blog', absoluteUrl('/blog'))}
${emailCallout(
        `<strong>Tip:</strong> add our address to your contacts so the articles land in your inbox instead of the promotions tab.`
    )}
${articlesBlock}
${emailDivider()}
${emailParagraph(
        `Changed your mind about a topic? You can <a href="${safeUrl(params.manageUrl)}" style="color:${EMAIL_COLORS.primaryDark};">update your preferences</a> at any time - no account needed.`,
        { muted: true, small: true }
    )}`;

    const html = renderEmailLayout({
        title: subject,
        preheader: `You are subscribed to ${describeTopicSelection(params.topics, params.allTopics)}.`,
        heading: 'Welcome aboard 🎉',
        subheading: 'Your subscription is confirmed and active.',
        body,
        manageUrl: params.manageUrl,
        unsubscribeUrl: params.unsubscribeUrl,
    });

    return finalize(subject, html);
}

/* ------------------------------------------------------------------ */
/* 3. New article notification                                         */
/* ------------------------------------------------------------------ */

export function renderBlogNotificationEmail(params: {
    name?: string | null;
    article: EmailArticle;
    topic?: BlogTopic | null;
    manageUrl: string;
    unsubscribeUrl: string;
    alsoRead?: EmailArticle[];
}): RenderedEmail {
    const greetingName = firstNameOf(params.name);
    const subject = params.article.title.slice(0, 150);
    const topicLabel = params.topic ? getTopicLabel(params.topic) : null;

    const alsoRead = (params.alsoRead ?? []).slice(0, 2);
    const alsoBlock = alsoRead.length
        ? `${emailDivider()}
${emailParagraph('<strong>While you are here</strong>')}
${alsoRead.map((article) => emailArticleCard(article, { compact: true })).join('')}`
        : '';

    const body = `
${emailParagraph(`Hi ${escapeHtml(greetingName)},`)}
${emailParagraph(
        topicLabel
            ? `A new <strong>${escapeHtml(topicLabel)}</strong> article just went live on the ${escapeHtml(BRAND.name)} blog.`
            : `A new article just went live on the ${escapeHtml(BRAND.name)} blog.`
    )}
${emailArticleCard(params.article)}
${emailButton('Read the full article', params.article.url)}
${alsoBlock}`;

    const html = renderEmailLayout({
        title: subject,
        preheader:
            params.article.excerpt?.slice(0, 140) ||
            `Fresh from the ${BRAND.name} blog${topicLabel ? ` - ${topicLabel}` : ''}.`,
        heading: 'New on the blog',
        subheading: topicLabel ? `Because you follow ${topicLabel}` : undefined,
        body,
        footerNote: `You are getting this because you subscribed to blog updates${topicLabel ? ` about ${escapeHtml(topicLabel)}` : ''}.`,
        manageUrl: params.manageUrl,
        unsubscribeUrl: params.unsubscribeUrl,
    });

    return finalize(subject, html);
}

/* ------------------------------------------------------------------ */
/* 4. Weekly digest                                                    */
/* ------------------------------------------------------------------ */

export function renderWeeklyDigestEmail(params: {
    name?: string | null;
    articles: EmailArticle[];
    manageUrl: string;
    unsubscribeUrl: string;
    periodLabel?: string;
}): RenderedEmail {
    const greetingName = firstNameOf(params.name);
    const count = params.articles.length;
    const subject =
        count === 1
            ? 'Your weekly poultry roundup: 1 new article'
            : `Your weekly poultry roundup: ${count} new articles`;

    const [lead, ...rest] = params.articles;

    const body = `
${emailParagraph(`Hi ${escapeHtml(greetingName)},`)}
${emailParagraph(
        `Here is what we published${params.periodLabel ? ` ${escapeHtml(params.periodLabel)}` : ' this week'} in the topics you follow.`
    )}
${lead ? emailArticleCard(lead) : ''}
${rest.map((article) => emailArticleCard(article, { compact: true })).join('')}
${emailButton('See everything on the blog', absoluteUrl('/blog'))}`;

    const html = renderEmailLayout({
        title: subject,
        preheader: lead ? `Starting with: ${lead.title}` : 'Your weekly poultry farming roundup.',
        heading: 'This week on the blog',
        subheading: count === 1 ? '1 new article for you' : `${count} new articles for you`,
        body,
        manageUrl: params.manageUrl,
        unsubscribeUrl: params.unsubscribeUrl,
    });

    return finalize(subject, html);
}

/* ------------------------------------------------------------------ */
/* 5. Admin composed campaign / broadcast                              */
/* ------------------------------------------------------------------ */

export function renderCampaignEmail(params: {
    name?: string | null;
    subject: string;
    content: string;
    previewText?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    imageUrl?: string | null;
    manageUrl?: string | null;
    unsubscribeUrl?: string | null;
    signOff?: string | null;
    isTest?: boolean;
}): RenderedEmail {
    const greetingName = firstNameOf(params.name);
    const subject = params.isTest ? `[TEST] ${params.subject}` : params.subject;

    const hero =
        params.imageUrl && safeUrl(params.imageUrl)
            ? `<img src="${safeUrl(params.imageUrl)}" alt="" width="528" style="width:100%;max-width:528px;height:auto;display:block;border-radius:12px;margin:0 0 22px 0;" />`
            : '';

    const cta =
        params.ctaLabel && params.ctaUrl && safeUrl(params.ctaUrl)
            ? emailButton(params.ctaLabel, params.ctaUrl)
            : '';

    const testBanner = params.isTest
        ? emailCallout(
            'This is a <strong>test send</strong>. Recipients of the real campaign will not see this banner.',
            { color: EMAIL_COLORS.accent }
        )
        : '';

    const body = `
${testBanner}
${hero}
${emailParagraph(`Hi ${escapeHtml(greetingName)},`)}
${contentToHtml(params.content)}
${cta}
${params.signOff
            ? emailParagraph(escapeHtml(params.signOff).replace(/\n/g, '<br />'), { muted: true, small: true })
            : emailParagraph(`- The ${escapeHtml(BRAND.name)} team`, { muted: true, small: true })}`;

    const html = renderEmailLayout({
        title: subject,
        preheader: params.previewText?.slice(0, 150) || '',
        body,
        manageUrl: params.manageUrl ?? null,
        unsubscribeUrl: params.unsubscribeUrl ?? null,
    });

    return finalize(subject, html);
}

/* ------------------------------------------------------------------ */
/* 6. Unsubscribe confirmation                                         */
/* ------------------------------------------------------------------ */

export function renderUnsubscribedEmail(params: {
    name?: string | null;
    resubscribeUrl: string;
}): RenderedEmail {
    const greetingName = firstNameOf(params.name);
    const subject = 'You have been unsubscribed';

    const body = `
${emailParagraph(`Hi ${escapeHtml(greetingName)},`)}
${emailParagraph(
        `You will not receive any more blog emails from us. No hard feelings - the articles are always free to read on the website.`
    )}
${emailButton('Keep reading on the blog', absoluteUrl('/blog'), { secondary: true })}
${emailDivider()}
${emailParagraph(
        `Unsubscribed by mistake, or only wanted fewer emails? You can <a href="${safeUrl(params.resubscribeUrl)}" style="color:${EMAIL_COLORS.primaryDark};">resubscribe and pick just the topics you want</a>.`,
        { muted: true, small: true }
    )}
${emailParagraph(
        `Questions? Reply to this email or write to <a href="mailto:${escapeHtml(getSupportEmail())}" style="color:${EMAIL_COLORS.primaryDark};">${escapeHtml(getSupportEmail())}</a>.`,
        { muted: true, small: true }
    )}`;

    const html = renderEmailLayout({
        title: subject,
        preheader: 'Your email has been removed from the blog mailing list.',
        heading: 'You are unsubscribed',
        subheading: 'This was the last email you will get from the blog list.',
        body,
        accentColor: EMAIL_COLORS.muted,
    });

    return finalize(subject, html);
}
