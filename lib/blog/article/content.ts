/**
 * Markdown content analysis for the article page.
 *
 * Three jobs:
 *  1. Extract the heading outline so the Table of Contents (§6) is generated
 *     from the real content instead of being hand-maintained.
 *  2. Compute reading time (§14) from the article body only — never from
 *     navigation, sidebar or recommendation text.
 *  3. Plan where in-article related-post cards may be inserted (§17), always at
 *     content-block boundaries so a paragraph is never cut in half.
 *
 * The slugs produced here are generated with `github-slugger`, the same
 * algorithm `rehype-slug` uses when rendering, so TOC links always resolve to
 * a real heading id (including duplicated headings, which get `-1`, `-2` …).
 */

import GithubSlugger from 'github-slugger';

export interface ArticleHeading {
    id: string;
    text: string;
    /** 1–6, as written in the Markdown. */
    level: number;
}

const WORDS_PER_MINUTE = 210;
const HEADING_PATTERN = /^\s{0,3}(#{1,6})\s+(.*\S)\s*$/;

/** Remove fenced code blocks so their contents never pollute analysis. */
function stripFencedCode(markdown: string): string {
    return markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/~~~[\s\S]*?~~~/g, ' ');
}

/** Reduce a heading's inline Markdown to plain text. */
export function headingToPlainText(raw: string): string {
    return raw
        .replace(/`([^`]*)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/[*_~]+/g, '')
        .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
        .replace(/\s*#+\s*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Build the heading outline for the Table of Contents.
 *
 * @param markdown raw article body
 * @param maxLevel deepest heading level to include (default 3 — h4+ makes for
 *   a noisy sidebar in long-form articles)
 */
export function extractHeadings(markdown: string, maxLevel = 3): ArticleHeading[] {
    if (!markdown) return [];

    const slugger = new GithubSlugger();
    const headings: ArticleHeading[] = [];
    const lines = stripFencedCode(markdown).split(/\r?\n/);

    for (const line of lines) {
        const match = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
        if (!match) continue;

        const level = match[1].length;
        const text = headingToPlainText(match[2]);
        if (!text || level > maxLevel) continue;

        headings.push({ id: slugger.slug(text), text, level });
    }

    return headings;
}

/**
 * Plain prose extracted from Markdown — used for word counts, reading time and
 * meta description fallbacks.
 */
export function markdownToPlainText(markdown: string): string {
    if (!markdown) return '';

    return stripFencedCode(markdown)
        // Reference-style definitions and raw HTML
        .replace(/^\s*\[[^\]]+\]:.*$/gm, ' ')
        .replace(/<[^>]+>/g, ' ')
        // Images contribute no reading time; links keep their label only
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        // Bare URLs are scanned, not read
        .replace(/https?:\/\/\S+/g, ' ')
        // Inline code, emphasis, headings, quotes, list markers, tables, rules
        .replace(/`([^`]*)`/g, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^\s{0,3}>\s?/gm, '')
        .replace(/^\s*([-*+]|\d+[.)])\s+/gm, '')
        .replace(/^\s*([-*_]\s*){3,}\s*$/gm, ' ')
        .replace(/\|/g, ' ')
        .replace(/[*_~]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function countWords(markdown: string): number {
    const text = markdownToPlainText(markdown);
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Reading time in minutes, computed from the article body (§14).
 *
 * Never returns 0 — a one-line article is still "1 min read".
 */
export function calculateReadingTime(markdown: string): number {
    const words = countWords(markdown);
    if (words === 0) return 1;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Resolve the reading time to display: always prefer a live calculation from
 * the content, and only fall back to the stored column when the body is
 * unavailable (§14 — "do not hardcode it").
 */
export function resolveReadingTime(
    markdown: string | null | undefined,
    stored?: number | null,
): number {
    if (markdown && markdown.trim().length > 0) return calculateReadingTime(markdown);
    if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) return Math.round(stored);
    return 1;
}

/* ------------------------------------------------------------------ *
 * In-article related-post placement (§17)
 * ------------------------------------------------------------------ */

/** How many in-article related posts an article of this length can carry. */
export function relatedInsertCount(wordCount: number): number {
    if (wordCount < 800) return 1;
    if (wordCount < 1500) return 2;
    if (wordCount < 2500) return 3;
    if (wordCount < 3500) return 4;
    return 5;
}

/** Where each card should land, as a fraction of the article's words. */
const TARGET_RATIOS: Record<number, number[]> = {
    1: [0.5],
    2: [0.35, 0.7],
    3: [0.3, 0.55, 0.8],
    4: [0.25, 0.45, 0.65, 0.85],
    5: [0.18, 0.34, 0.5, 0.66, 0.82],
};

/** Never interrupt the opening or the closing of an article. */
const MIN_RATIO = 0.15;
const MAX_RATIO = 0.9;
/** Keep cards apart, both in reading distance and in blocks. */
const MIN_RATIO_GAP = 0.12;
const MIN_BLOCK_GAP = 2;

type BlockKind = 'heading' | 'code' | 'paragraph' | 'other';

interface ContentBlock {
    text: string;
    words: number;
    kind: BlockKind;
    headingText: string | null;
}

export interface RelatedInsertPlan {
    /**
     * Markdown pieces to render in order. One card goes between consecutive
     * pieces, so there are always `contexts.length + 1` segments.
     */
    segments: string[];
    /**
     * Plain-text surrounding each boundary. Used to pick a post that is relevant
     * to the section the reader just finished, instead of an arbitrary one.
     */
    contexts: string[];
    wordCount: number;
}

/**
 * Split Markdown into top-level blocks: paragraphs, headings, lists, tables,
 * blockquotes and fenced code. Blank lines separate blocks, fences are kept
 * whole, and headings always start a block of their own.
 */
function toBlocks(markdown: string): ContentBlock[] {
    const lines = markdown.split(/\r?\n/);
    const groups: string[][] = [];
    let buffer: string[] = [];
    let fence: string | null = null;

    const flush = () => {
        if (buffer.length) groups.push(buffer);
        buffer = [];
    };

    for (const line of lines) {
        const fenceMatch = /^\s{0,3}(```+|~~~+)/.exec(line);

        if (fence) {
            buffer.push(line);
            if (fenceMatch && fenceMatch[1][0] === fence[0]) {
                fence = null;
                flush();
            }
            continue;
        }

        if (fenceMatch) {
            flush();
            fence = fenceMatch[1];
            buffer.push(line);
            continue;
        }

        if (!line.trim()) {
            flush();
            continue;
        }

        if (HEADING_PATTERN.test(line)) {
            flush();
            groups.push([line]);
            continue;
        }

        buffer.push(line);
    }
    flush();

    return groups.map((group) => {
        const text = group.join('\n');
        const first = group[0] ?? '';
        const heading = HEADING_PATTERN.exec(first);

        let kind: BlockKind = 'other';
        if (heading) kind = 'heading';
        else if (/^\s{0,3}(```+|~~~+)/.test(first)) kind = 'code';
        else if (!/^\s*([-*+]|\d+[.)]|>|\||!\[)/.test(first)) kind = 'paragraph';

        return {
            text,
            words: countWords(text),
            kind,
            headingText: heading ? headingToPlainText(heading[2]) : null,
        };
    });
}

/**
 * Boundaries that would separate two headings sharing the same text. Each
 * segment is rendered by its own Markdown renderer with its own slugger, so
 * splitting between duplicates would produce colliding heading ids and break
 * TOC anchors (§6).
 */
function duplicateHeadingRanges(blocks: ContentBlock[]): { from: number; to: number }[] {
    const positions = new Map<string, number[]>();

    blocks.forEach((block, index) => {
        if (!block.headingText) return;
        const key = block.headingText.toLowerCase();
        const list = positions.get(key);
        if (list) list.push(index);
        else positions.set(key, [index]);
    });

    const ranges: { from: number; to: number }[] = [];
    for (const list of positions.values()) {
        if (list.length > 1) ranges.push({ from: list[0], to: list[list.length - 1] });
    }
    return ranges;
}

/**
 * Plan in-article related-post insertions (§17).
 *
 * The number of cards comes from the article's real word count, and each card
 * is placed at a content-block boundary near an editorially sensible position —
 * preferably just before a heading, otherwise after a paragraph. Short articles
 * (or articles with no usable boundary) come back with a single segment and no
 * contexts, so the caller simply renders the body untouched.
 */
export function planRelatedInserts(
    markdown: string | null | undefined,
    options?: { maxInserts?: number },
): RelatedInsertPlan {
    const source = (markdown ?? '').trim();
    const wordCount = countWords(source);

    if (!source) return { segments: [], contexts: [], wordCount };

    const single: RelatedInsertPlan = { segments: [source], contexts: [], wordCount };
    const desired = Math.min(
        relatedInsertCount(wordCount),
        Math.max(0, options?.maxInserts ?? 5),
    );
    if (desired < 1) return single;

    const blocks = toBlocks(source);
    // Fewer than three blocks leaves no room for a card between real content.
    if (blocks.length < 3) return single;

    const totalWords = blocks.reduce((sum, block) => sum + block.words, 0);
    if (totalWords <= 0) return single;

    const forbidden = duplicateHeadingRanges(blocks);
    const candidates: { index: number; ratio: number; bonus: number }[] = [];
    let consumed = 0;

    for (let index = 0; index < blocks.length; index += 1) {
        // `index` splits *before* blocks[index]; skip the article's first block.
        if (index > 0) {
            const ratio = consumed / totalWords;
            const previous = blocks[index - 1];
            const isBlocked = forbidden.some((range) => index > range.from && index <= range.to);

            if (
                ratio >= MIN_RATIO &&
                ratio <= MAX_RATIO &&
                !isBlocked &&
                // Never orphan a heading from the section it introduces.
                previous.kind !== 'heading'
            ) {
                const bonus =
                    blocks[index].kind === 'heading' ? 2 : previous.kind === 'paragraph' ? 1 : 0;
                candidates.push({ index, ratio, bonus });
            }
        }

        consumed += blocks[index].words;
    }

    if (!candidates.length) return single;

    const chosen: { index: number; ratio: number }[] = [];
    for (const target of TARGET_RATIOS[desired] ?? TARGET_RATIOS[1]) {
        let best: { index: number; ratio: number } | null = null;
        let bestCost = Number.POSITIVE_INFINITY;

        for (const candidate of candidates) {
            const tooClose = chosen.some(
                (picked) =>
                    Math.abs(picked.ratio - candidate.ratio) < MIN_RATIO_GAP ||
                    Math.abs(picked.index - candidate.index) < MIN_BLOCK_GAP,
            );
            if (tooClose) continue;

            // Distance to the ideal position, nudged by how clean the break is.
            const cost = Math.abs(candidate.ratio - target) - candidate.bonus * 0.03;
            if (cost < bestCost) {
                bestCost = cost;
                best = { index: candidate.index, ratio: candidate.ratio };
            }
        }

        if (best) chosen.push(best);
    }

    if (!chosen.length) return single;
    chosen.sort((a, b) => a.index - b.index);

    const segments: string[] = [];
    const contexts: string[] = [];
    let start = 0;

    for (const point of chosen) {
        segments.push(
            blocks
                .slice(start, point.index)
                .map((block) => block.text)
                .join('\n\n'),
        );

        // Context = nearest heading above + the blocks either side of the card.
        const headingAbove = blocks
            .slice(0, point.index)
            .reverse()
            .find((block) => block.headingText)?.headingText;
        const around = [
            ...blocks.slice(Math.max(0, point.index - 2), point.index),
            ...blocks.slice(point.index, point.index + 2),
        ].map((block) => block.text);

        contexts.push(
            markdownToPlainText([headingAbove ?? '', ...around].join('\n\n')).slice(0, 800),
        );

        start = point.index;
    }

    segments.push(
        blocks
            .slice(start)
            .map((block) => block.text)
            .join('\n\n'),
    );

    // A blank segment would leave a card with no prose on one side.
    if (segments.some((segment) => !segment.trim())) return single;

    return { segments, contexts, wordCount };
}

/** Short, clean summary from Markdown — used when `excerpt` is empty. */
export function buildExcerpt(markdown: string | null | undefined, maxLength = 180): string {
    const text = markdownToPlainText(markdown ?? '');
    if (!text) return '';
    if (text.length <= maxLength) return text;
    const cut = text.slice(0, maxLength - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
