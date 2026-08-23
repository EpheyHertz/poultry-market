/**
 * Author recommended-resource collection endpoint (§1, §25).
 *
 *   GET    /api/author/resources  → the signed-in author's own resources
 *   POST   /api/author/resources  → create one
 *   PATCH  /api/author/resources  → reorder (accepts an ordered list of ids)
 *
 * Ownership is always derived from the session, never from the request body:
 * every query is scoped by `profileId` so one author can never read or mutate
 * another author's resources.
 *
 * All user-controlled values pass through `lib/author-resources.ts` — the same
 * validators the public renderer relies on, so what we store is always safe to
 * render (§4, §33 of the author spec).
 *
 * Note on metadata: we store what the author confirmed in the dashboard. Public
 * pages read those stored columns and never re-fetch the merchant (§24).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
    RESOURCE_LIMITS,
    normalizeRequiredResourceText,
    normalizeResourceText,
    toAuthorResourceView,
    validateResourceImageUrl,
    validateResourceUrl,
} from '@/lib/author-resources';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Columns every surface needs — kept in one place so shapes cannot drift. */
const RESOURCE_SELECT = {
    id: true,
    title: true,
    description: true,
    url: true,
    domain: true,
    merchant: true,
    imageUrl: true,
    isAffiliate: true,
    affiliateDisclosure: true,
    isActive: true,
    displayOrder: true,
} as const;

/** Resolve the signed-in user's author profile, or an HTTP response to return. */
async function requireAuthorProfile() {
    const user = await getCurrentUser();
    if (!user) {
        return {
            error: NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE }),
        } as const;
    }

    const profile = await prisma.authorProfile.findUnique({
        where: { userId: user.id },
        select: { id: true },
    });

    if (!profile) {
        return {
            error: NextResponse.json(
                { error: 'Create your author profile before adding recommended resources' },
                { status: 403, headers: NO_STORE },
            ),
        } as const;
    }

    return { profileId: profile.id, userId: user.id } as const;
}

/* ------------------------------------------------------------------ *
 * GET — list the author's own resources (active and inactive)
 * ------------------------------------------------------------------ */

export async function GET() {
    try {
        const auth = await requireAuthorProfile();
        if ('error' in auth) return auth.error;

        const rows = await prisma.authorResource.findMany({
            where: { profileId: auth.profileId },
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
                ...RESOURCE_SELECT,
                clickCount: true,
                articles: { select: { postId: true } },
            },
        });

        return NextResponse.json(
            {
                resources: rows.map((row) => ({
                    ...toAuthorResourceView(row),
                    // The dashboard shows the author their own click counts (§22);
                    // this is never exposed on public pages.
                    clickCount: row.clickCount,
                    articleIds: row.articles.map((link) => link.postId),
                })),
                limit: RESOURCE_LIMITS.maxPerAuthor,
            },
            { headers: NO_STORE },
        );
    } catch (error) {
        console.error('[api/author/resources] GET failed:', error);
        return NextResponse.json(
            { error: 'Failed to load your recommended resources' },
            { status: 500, headers: NO_STORE },
        );
    }
}

/* ------------------------------------------------------------------ *
 * POST — create a resource
 * ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuthorProfile();
        if ('error' in auth) return auth.error;

        let body: Record<string, unknown>;
        try {
            body = (await request.json()) as Record<string, unknown>;
        } catch {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400, headers: NO_STORE },
            );
        }

        const existingCount = await prisma.authorResource.count({
            where: { profileId: auth.profileId },
        });

        if (existingCount >= RESOURCE_LIMITS.maxPerAuthor) {
            return NextResponse.json(
                {
                    error: `You can add up to ${RESOURCE_LIMITS.maxPerAuthor} recommended resources. Remove one to add another.`,
                },
                { status: 400, headers: NO_STORE },
            );
        }

        const destination = validateResourceUrl(body.url);
        if (!destination.ok) {
            return NextResponse.json(
                { error: destination.error },
                { status: 400, headers: NO_STORE },
            );
        }

        const title = normalizeRequiredResourceText(body.title, 'Title', RESOURCE_LIMITS.title);
        if (!title.ok) {
            return NextResponse.json({ error: title.error }, { status: 400, headers: NO_STORE });
        }

        const description = normalizeResourceText(
            body.description,
            'Description',
            RESOURCE_LIMITS.description,
        );
        if (!description.ok) {
            return NextResponse.json(
                { error: description.error },
                { status: 400, headers: NO_STORE },
            );
        }

        const imageUrl = validateResourceImageUrl(body.imageUrl);
        if (!imageUrl.ok) {
            return NextResponse.json({ error: imageUrl.error }, { status: 400, headers: NO_STORE });
        }

        // The author declares whether a link is affiliate — we never infer it
        // from the domain, because plenty of Amazon links earn nothing (§2).
        const isAffiliate = body.isAffiliate === true;

        const disclosure = normalizeResourceText(
            body.affiliateDisclosure,
            'Disclosure',
            RESOURCE_LIMITS.disclosure,
        );
        if (!disclosure.ok) {
            return NextResponse.json(
                { error: disclosure.error },
                { status: 400, headers: NO_STORE },
            );
        }

        // An author-typed merchant wins, then whatever we identified. Blank
        // stays blank so the card falls back to the domain (§9).
        const merchant = normalizeResourceText(body.merchant, 'Merchant', 60);
        if (!merchant.ok) {
            return NextResponse.json({ error: merchant.error }, { status: 400, headers: NO_STORE });
        }

        const articleIds = await ownedArticleIds(auth.profileId, auth.userId, body.articleIds);

        const last = await prisma.authorResource.findFirst({
            where: { profileId: auth.profileId },
            orderBy: { displayOrder: 'desc' },
            select: { displayOrder: true },
        });

        const created = await prisma.authorResource.create({
            data: {
                profileId: auth.profileId,
                title: title.value,
                description: description.value,
                url: destination.value.url,
                domain: destination.value.domain,
                merchant: merchant.value ?? destination.value.merchant,
                imageUrl: imageUrl.value,
                isAffiliate,
                affiliateDisclosure: isAffiliate ? disclosure.value : null,
                isActive: body.isActive === false ? false : true,
                displayOrder: (last?.displayOrder ?? -1) + 1,
                metadataFetchedAt: new Date(),
                metadataResolved: body.metadataResolved === true,
                ...(articleIds.length
                    ? { articles: { create: articleIds.map((postId) => ({ postId })) } }
                    : {}),
            },
            select: { ...RESOURCE_SELECT, articles: { select: { postId: true } } },
        });

        return NextResponse.json(
            {
                resource: {
                    ...toAuthorResourceView(created),
                    articleIds: created.articles.map((link) => link.postId),
                },
            },
            { status: 201, headers: NO_STORE },
        );
    } catch (error) {
        console.error('[api/author/resources] POST failed:', error);
        return NextResponse.json(
            { error: 'Failed to save that recommended resource' },
            { status: 500, headers: NO_STORE },
        );
    }
}

/* ------------------------------------------------------------------ *
 * PATCH — reorder
 * ------------------------------------------------------------------ */

/**
 * Accepts `{ order: string[] }` — the ids in their new display order (§1).
 * Ids that do not belong to this author are ignored rather than trusted, and
 * the whole reorder runs in a transaction so the list is never half-sorted.
 */
export async function PATCH(request: NextRequest) {
    try {
        const auth = await requireAuthorProfile();
        if ('error' in auth) return auth.error;

        let body: { order?: unknown };
        try {
            body = (await request.json()) as { order?: unknown };
        } catch {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400, headers: NO_STORE },
            );
        }

        if (!Array.isArray(body.order) || body.order.some((id) => typeof id !== 'string')) {
            return NextResponse.json(
                { error: 'An ordered list of resource ids is required' },
                { status: 400, headers: NO_STORE },
            );
        }

        const requested = body.order as string[];
        if (requested.length > RESOURCE_LIMITS.maxPerAuthor) {
            return NextResponse.json(
                { error: 'Too many resource ids' },
                { status: 400, headers: NO_STORE },
            );
        }

        const owned = await prisma.authorResource.findMany({
            where: { profileId: auth.profileId, id: { in: requested } },
            select: { id: true },
        });

        const ownedIds = new Set(owned.map((row) => row.id));
        const ordered = requested.filter((id) => ownedIds.has(id));

        if (!ordered.length) {
            return NextResponse.json(
                { error: 'No matching resources to reorder' },
                { status: 404, headers: NO_STORE },
            );
        }

        await prisma.$transaction(
            ordered.map((id, index) =>
                prisma.authorResource.update({
                    where: { id },
                    data: { displayOrder: index },
                }),
            ),
        );

        return NextResponse.json({ success: true, order: ordered }, { headers: NO_STORE });
    } catch (error) {
        console.error('[api/author/resources] PATCH failed:', error);
        return NextResponse.json(
            { error: 'Failed to reorder your recommended resources' },
            { status: 500, headers: NO_STORE },
        );
    }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Filter requested article associations down to posts this author actually
 * wrote (§13). A relation row is only created for posts we can verify, so an
 * author cannot attach their affiliate links to somebody else's article.
 *
 * Ownership is checked on *both* links because `BlogPost.authorProfileId` is
 * nullable: posts written before the author profile existed are still owned by
 * the same user. Matching on `authorProfileId` alone would silently drop them.
 */
async function ownedArticleIds(
    profileId: string,
    userId: string,
    value: unknown,
): Promise<string[]> {
    if (!Array.isArray(value) || !value.length) return [];

    const ids = Array.from(
        new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0)),
    ).slice(0, 25);

    if (!ids.length) return [];

    const posts = await prisma.blogPost.findMany({
        where: {
            id: { in: ids },
            OR: [{ authorProfileId: profileId }, { authorId: userId }],
        },
        select: { id: true },
    });

    return posts.map((post) => post.id);
}
