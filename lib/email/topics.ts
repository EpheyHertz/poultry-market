/**
 * Single source of truth for the blog topics a subscriber can tick.
 *
 * This intentionally reuses the existing `BlogPostCategory` taxonomy - no
 * parallel topic table, no duplicated enum. The import is type-only so this
 * module stays safe to use inside client components.
 */

import type { BlogPostCategory } from '@prisma/client';

export type BlogTopic = BlogPostCategory;

export type BlogTopicMeta = {
    value: BlogTopic;
    label: string;
    description: string;
    emoji: string;
    /** Hex colour used in emails (inline styles). */
    color: string;
};

/**
 * Declared as a Record so TypeScript fails the build if a new
 * `BlogPostCategory` is added to the schema without describing it here.
 */
const TOPIC_META: Record<BlogTopic, Omit<BlogTopicMeta, 'value'>> = {
    FARMING_TIPS: {
        label: 'Farming Tips',
        description: 'Practical day-to-day practices that lift productivity.',
        emoji: '🌾',
        color: '#16a34a',
    },
    POULTRY_HEALTH: {
        label: 'Poultry Health',
        description: 'Disease prevention, vaccination and biosecurity.',
        emoji: '🩺',
        color: '#dc2626',
    },
    FEED_NUTRITION: {
        label: 'Feed & Nutrition',
        description: 'Rations, formulation and keeping feed costs down.',
        emoji: '🌽',
        color: '#d97706',
    },
    EQUIPMENT_GUIDES: {
        label: 'Equipment Guides',
        description: 'Housing, brooders, feeders and honest tool reviews.',
        emoji: '🛠️',
        color: '#475569',
    },
    MARKET_TRENDS: {
        label: 'Market Trends',
        description: 'Prices, demand signals and where the market is heading.',
        emoji: '📈',
        color: '#2563eb',
    },
    SUCCESS_STORIES: {
        label: 'Success Stories',
        description: 'Real farmer journeys and the lessons behind them.',
        emoji: '🏆',
        color: '#ca8a04',
    },
    INDUSTRY_NEWS: {
        label: 'Industry News',
        description: 'Policy, regulation and sector-wide updates.',
        emoji: '📰',
        color: '#0f766e',
    },
    SEASONAL_ADVICE: {
        label: 'Seasonal Advice',
        description: 'What to do differently each rainy and dry season.',
        emoji: '🌦️',
        color: '#0891b2',
    },
    BEGINNER_GUIDES: {
        label: 'Beginner Guides',
        description: 'Start-here explainers for brand new poultry farmers.',
        emoji: '🐣',
        color: '#7c3aed',
    },
    ADVANCED_TECHNIQUES: {
        label: 'Advanced Techniques',
        description: 'Scaling, automation and advanced flock management.',
        emoji: '🚀',
        color: '#be185d',
    },
};

/** Display order used by the subscribe form, preferences page and admin UI. */
export const BLOG_TOPIC_ORDER: BlogTopic[] = [
    'FARMING_TIPS',
    'POULTRY_HEALTH',
    'FEED_NUTRITION',
    'BEGINNER_GUIDES',
    'EQUIPMENT_GUIDES',
    'MARKET_TRENDS',
    'SEASONAL_ADVICE',
    'SUCCESS_STORIES',
    'INDUSTRY_NEWS',
    'ADVANCED_TECHNIQUES',
];

export const BLOG_TOPICS: BlogTopicMeta[] = BLOG_TOPIC_ORDER.map((value) => ({
    value,
    ...TOPIC_META[value],
}));

const TOPIC_VALUE_SET = new Set<string>(BLOG_TOPIC_ORDER);

export function isBlogTopic(value: unknown): value is BlogTopic {
    return typeof value === 'string' && TOPIC_VALUE_SET.has(value);
}

export function getTopicMeta(value: BlogTopic): BlogTopicMeta {
    return { value, ...TOPIC_META[value] };
}

export function getTopicLabel(value: string): string {
    if (isBlogTopic(value)) return TOPIC_META[value].label;
    // Fallback for unexpected values: SOME_CATEGORY -> "Some Category"
    return value
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/**
 * Accepts anything a client might POST and returns a clean, de-duplicated,
 * display-ordered list of valid topics.
 */
export function normalizeTopics(input: unknown): BlogTopic[] {
    if (!input) return [];

    const raw = Array.isArray(input)
        ? input
        : typeof input === 'string'
            ? input.split(',')
            : [];

    const seen = new Set<BlogTopic>();
    for (const entry of raw) {
        if (typeof entry !== 'string') continue;
        const candidate = entry.trim().toUpperCase();
        if (isBlogTopic(candidate)) seen.add(candidate);
    }

    return BLOG_TOPIC_ORDER.filter((topic) => seen.has(topic));
}

/** Parses the legacy `categoryUpdates` JSON string column. */
export function parseLegacyTopics(value: string | null | undefined): BlogTopic[] {
    if (!value) return [];
    try {
        return normalizeTopics(JSON.parse(value));
    } catch {
        return normalizeTopics(value);
    }
}

/** Human readable summary of a subscriber's topic selection. */
export function describeTopicSelection(topics: BlogTopic[], allTopics: boolean): string {
    if (allTopics || topics.length === 0 || topics.length === BLOG_TOPIC_ORDER.length) {
        return 'Every topic we publish';
    }
    if (topics.length <= 3) {
        return topics.map(getTopicLabel).join(', ');
    }
    return `${topics.slice(0, 3).map(getTopicLabel).join(', ')} +${topics.length - 3} more`;
}

/** Subscriber sending cadence, mirrored from the `SubscriberFrequency` enum. */
export const SUBSCRIBER_FREQUENCIES = [
    {
        value: 'EVERY_POST' as const,
        label: 'Every new article',
        description: 'Get an email as soon as we publish something in your topics.',
    },
    {
        value: 'WEEKLY_DIGEST' as const,
        label: 'Weekly digest',
        description: 'One roundup email per week instead of individual alerts.',
    },
    {
        value: 'IMPORTANT_ONLY' as const,
        label: 'Only the big stuff',
        description: 'Rare emails - major announcements and must-read guides.',
    },
];

export type SubscriberFrequencyValue = (typeof SUBSCRIBER_FREQUENCIES)[number]['value'];

export function isSubscriberFrequency(value: unknown): value is SubscriberFrequencyValue {
    return (
        typeof value === 'string' &&
        SUBSCRIBER_FREQUENCIES.some((frequency) => frequency.value === value)
    );
}

export function getFrequencyLabel(value: string): string {
    return SUBSCRIBER_FREQUENCIES.find((f) => f.value === value)?.label ?? 'Every new article';
}
