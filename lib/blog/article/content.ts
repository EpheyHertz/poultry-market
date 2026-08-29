/**
 * Markdown content analysis for the article page.
 *
 * Two jobs:
 *  1. Extract the heading outline so the Table of Contents (§6) is generated
 *     from the real content instead of being hand-maintained.
 *  2. Compute reading time (§14) from the article body only — never from
 *     navigation, sidebar or recommendation text.
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

/**
 * Split the body so in-content elements (related-article links, an inline ad)
 * can be inserted *after meaningful sections* rather than mid-sentence
 * (§17 — "do not interrupt the reader too aggressively").
 *
 * Returns 2…`maxInserts + 1` Markdown segments — the caller renders one slot
 * between consecutive segments — or `null` meaning "render in one piece" when:
 *   - the article is too short to justify an interruption,
 *   - there is no usable h2/h3 boundary outside the intro, or
 *   - a heading text repeats (each segment gets its own slugger, so duplicated
 *     text would generate colliding heading ids and break the TOC).
 */
export function splitMarkdownForInserts(
    markdown: string | null | undefined,
    maxInserts = 1,
    options?: { minLength?: number },
): string[] | null {
    const source = markdown ?? '';
    const length = source.trim().length;
    const minLength = options?.minLength ?? 3200;

    if (maxInserts < 1 || length < minLength) return null;

    // One interruption per `minLength` of prose, never more than asked for.
    const inserts = Math.max(1, Math.min(maxInserts, Math.floor(length / minLength)));

    const lines = source.split(/\r?\n/);
    const candidates: { line: number; offset: number }[] = [];
    const headingCounts = new Map<string, number>();

    let offset = 0;
    let fence: string | null = null;

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const fenceMatch = /^\s{0,3}(```+|~~~+)/.exec(line);

        if (fence) {
            if (fenceMatch && fenceMatch[1][0] === fence[0]) fence = null;
        } else if (fenceMatch) {
            fence = fenceMatch[1];
        } else {
            const heading = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
            if (heading) {
                const text = headingToPlainText(heading[2]).toLowerCase();
                headingCounts.set(text, (headingCounts.get(text) ?? 0) + 1);

                // Only h2/h3 are real section boundaries; skip the intro band and
                // never split so late that the tail is a stub.
                if (
                    heading[1].length <= 3 &&
                    offset > source.length * 0.2 &&
                    offset < source.length * 0.85
                ) {
                    candidates.push({ line: index, offset });
                }
            }
        }

        offset += line.length + 1;
    }

    if (candidates.length === 0) return null;
    for (const count of headingCounts.values()) {
        if (count > 1) return null;
    }

    // Spread the slots evenly and keep them at least a section apart.
    const minGap = source.length * 0.15;
    const chosen: { line: number; offset: number }[] = [];

    for (let slot = 1; slot <= inserts; slot += 1) {
        const target = (source.length * slot) / (inserts + 1);
        let best: { line: number; offset: number } | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const candidate of candidates) {
            if (chosen.some((picked) => Math.abs(picked.offset - candidate.offset) < minGap)) continue;
            const distance = Math.abs(candidate.offset - target);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = candidate;
            }
        }

        if (best) chosen.push(best);
    }

    if (chosen.length === 0) return null;
    chosen.sort((a, b) => a.line - b.line);

    const segments: string[] = [];
    let start = 0;
    for (const point of chosen) {
        segments.push(lines.slice(start, point.line).join('\n').trim());
        start = point.line;
    }
    segments.push(lines.slice(start).join('\n').trim());

    // An empty segment would render a gap with no prose around it.
    return segments.every(Boolean) ? segments : null;
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
