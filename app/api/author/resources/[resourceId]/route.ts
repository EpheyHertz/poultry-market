/**
 * Single recommended-resource endpoint (§1).
 *
 *   PATCH  /api/author/resources/:id  → edit, enable/disable, re-point the URL
 *   DELETE /api/author/resources/:id  → remove
 *
 * Both handlers confirm the row belongs to the signed-in author's profile
 * before touching it, so a guessed id gets a 404 rather than someone else's
 * data. Every field is re-validated on update — an author cannot edit their way
 * past the checks that applied at creation time.
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

type RouteContext = { params: Promise<{ resourceId: string }> };

/**
 * Load the resource only if the caller owns it.
 * Returns a ready-to-send response on any failure so handlers stay flat.
 */
async function requireOwnedResource(resourceId: string) {
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
                { error: 'Author profile not found' },
                { status: 403, headers: NO_STORE },
            ),
        } as const;
    }

    // Scoping by profileId means a valid id belonging to another author is
    // indistinguishable from one that does not exist.
    const resource = await prisma.authorResource.findFirst({
        where: { id: resourceId, profileId: profile.id },
        select: { id: true, isAffiliate: true, affiliateDisclosure: true },
    });

    if (!resource) {
        return {
            error: NextResponse.json(
                { error: 'Resource not found' },
                { status: 404, headers: NO_STORE },
            ),
        } as const;
    }

    return { profileId: profile.id, userId: user.id, resource } as const;
}

/* ------------------------------------------------------------------ *
 * PATCH — partial update
 * ------------------------------------------------------------------ */

export async function PATCH(request: NextRequest, context: RouteContext) {
    try {
        const { resourceId } = await context.params;
        const auth = await requireOwnedResource(resourceId);
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

        const data: Record<string, unknown> = {};

        if ('title' in body) {
            const title = normalizeRequiredResourceText(body.title, 'Title', RESOURCE_LIMITS.title);
            if (!title.ok) {
                return NextResponse.json(
                    { error: title.error },
                    { status: 400, headers: NO_STORE },
                );
            }
            data.title = title.value;
        }

        if ('description' in body) {
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
            data.description = description.value;
        }

        // Re-pointing the URL re-derives the domain and merchant so the card can
        // never show a label from the previous destination.
        if ('url' in body) {
            const destination = validateResourceUrl(body.url);
            if (!destination.ok) {
                return NextResponse.json(
                    { error: destination.error },
                    { status: 400, headers: NO_STORE },
                );
            }
            data.url = destination.value.url;
            data.domain = destination.value.domain;
            if (!('merchant' in body)) {
                data.merchant = destination.value.merchant;
            }
            data.metadataFetchedAt = new Date();
        }

        if ('merchant' in body) {
            const merchant = normalizeResourceText(body.merchant, 'Merchant', 60);
            if (!merchant.ok) {
                return NextResponse.json(
                    { error: merchant.error },
                    { status: 400, headers: NO_STORE },
                );
            }
            data.merchant = merchant.value;
        }

        if ('imageUrl' in body) {
            const imageUrl = validateResourceImageUrl(body.imageUrl);
            if (!imageUrl.ok) {
                return NextResponse.json(
                    { error: imageUrl.error },
                    { status: 400, headers: NO_STORE },
                );
            }
            data.imageUrl = imageUrl.value;
        }

        if ('isActive' in body) {
            if (typeof body.isActive !== 'boolean') {
                return NextResponse.json(
                    { error: 'isActive must be true or false' },
                    { status: 400, headers: NO_STORE },
                );
            }
            data.isActive = body.isActive;
        }

        // Affiliate status and its disclosure move together: clearing the flag
        // clears the disclosure so a stale notice can never linger (§10).
        const nextIsAffiliate =
            'isAffiliate' in body ? body.isAffiliate === true : auth.resource.isAffiliate;

        if ('isAffiliate' in body) {
            data.isAffiliate = nextIsAffiliate;
        }

        if ('affiliateDisclosure' in body || 'isAffiliate' in body) {
            const disclosure = normalizeResourceText(
                'affiliateDisclosure' in body
                    ? body.affiliateDisclosure
                    : auth.resource.affiliateDisclosure,
                'Disclosure',
                RESOURCE_LIMITS.disclosure,
            );
            if (!disclosure.ok) {
                return NextResponse.json(
                    { error: disclosure.error },
                    { status: 400, headers: NO_STORE },
                );
            }
            data.affiliateDisclosure = nextIsAffiliate ? disclosure.value : null;
        }

        if (!Object.keys(data).length && !('articleIds' in body)) {
            return NextResponse.json(
                { error: 'Nothing to update' },
                { status: 400, headers: NO_STORE },
            );
        }

        // Article associations are replaced wholesale, but only with posts this
        // author actually wrote (§13).
        if ('articleIds' in body) {
            const postIds = await ownedArticleIds(auth.profileId, auth.userId, body.articleIds);
            await prisma.$transaction([
                prisma.authorResourceArticle.deleteMany({ where: { resourceId } }),
                ...(postIds.length
                    ? [
                        prisma.authorResourceArticle.createMany({
                            data: postIds.map((postId) => ({ resourceId, postId })),
                            skipDuplicates: true,
                        }),
                    ]
                    : []),
            ]);
        }

        const updated = Object.keys(data).length
            ? await prisma.authorResource.update({
                where: { id: resourceId },
                data,
                select: { ...RESOURCE_SELECT, articles: { select: { postId: true } } },
            })
            : await prisma.authorResource.findUniqueOrThrow({
                where: { id: resourceId },
                select: { ...RESOURCE_SELECT, articles: { select: { postId: true } } },
            });

        return NextResponse.json(
            {
                resource: {
                    ...toAuthorResourceView(updated),
                    articleIds: updated.articles.map((link) => link.postId),
                },
            },
            { headers: NO_STORE },
        );
    } catch (error) {
        console.error('[api/author/resources/:id] PATCH failed:', error);
        return NextResponse.json(
            { error: 'Failed to update that recommended resource' },
            { status: 500, headers: NO_STORE },
        );
    }
}

/* ------------------------------------------------------------------ *
 * DELETE
 * ------------------------------------------------------------------ */

export async function DELETE(_request: NextRequest, context: RouteContext) {
    try {
        const { resourceId } = await context.params;
        const auth = await requireOwnedResource(resourceId);
        if ('error' in auth) return auth.error;

        // Article associations go with it via `onDelete: Cascade`.
        await prisma.authorResource.delete({ where: { id: resourceId } });

        return NextResponse.json({ success: true }, { headers: NO_STORE });
    } catch (error) {
        console.error('[api/author/resources/:id] DELETE failed:', error);
        return NextResponse.json(
            { error: 'Failed to remove that recommended resource' },
            { status: 500, headers: NO_STORE },
        );
    }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Same ownership filter the collection route applies (§13).
 *
 * Both links are checked because `BlogPost.authorProfileId` is nullable —
 * posts published before the author profile existed still belong to the user.
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
