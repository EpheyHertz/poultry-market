'use client';

/**
 * Author dashboard — "Recommended Resources" manager (ext §1, §14, §15).
 *
 * Flow the spec asks for:
 *   paste URL → "Check link" → server validates + reads metadata → editable
 *   preview → save. Nothing is stored until the author confirms.
 *
 * Notes:
 *  - The URL check is a *server* call (`/api/author/resources/preview`). The
 *    browser never fetches the merchant, and validation cannot be bypassed by
 *    editing client state (ext §5, §17).
 *  - Metadata is only a suggestion. Every field stays editable and a failed
 *    lookup is not an error — the author can type everything by hand
 *    (ext §7, §20).
 *  - "This is an affiliate link" is an explicit author declaration. We never
 *    infer it from the domain (ext §2, §10).
 *  - Reordering uses the existing PATCH endpoint with the full id order, so the
 *    list can never end up half-sorted.
 *  - Uses the same shadcn primitives, spacing and emerald accent as the rest of
 *    the author dashboard — no new design language.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ArrowDown,
    ArrowUp,
    ExternalLink,
    Eye,
    EyeOff,
    Image as ImageIcon,
    Link2,
    Loader2,
    Package,
    Pencil,
    Plus,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
    DEFAULT_AFFILIATE_DISCLOSURE,
    RESOURCE_LIMITS,
    resourceMerchantLabel,
    validateResourceUrl,
    type AuthorResourceView,
} from '@/lib/author-resources';

/** A row as the dashboard sees it — includes the author's own click count. */
interface ManagedResource extends AuthorResourceView {
    clickCount?: number;
    /** Posts this resource is attached to (ext §13). */
    articleIds?: string[];
}

/** Minimal shape we need from the author's own posts list. */
interface AuthorPostOption {
    id: string;
    title: string;
    status: string;
}

/** Statuses a reader can actually see — attaching to a draft would be pointless. */
const PUBLIC_POST_STATUSES = new Set(['PUBLISHED', 'APPROVED']);

/** The editable draft behind the add/edit form. */
interface ResourceDraft {
    url: string;
    title: string;
    description: string;
    imageUrl: string;
    merchant: string;
    domain: string;
    isAffiliate: boolean;
    affiliateDisclosure: string;
    metadataResolved: boolean;
    /** Article associations (ext §13) — a real relation, not free text. */
    articleIds: string[];
}

const EMPTY_DRAFT: ResourceDraft = {
    url: '',
    title: '',
    description: '',
    imageUrl: '',
    merchant: '',
    domain: '',
    isAffiliate: false,
    affiliateDisclosure: '',
    metadataResolved: false,
    articleIds: [],
};

interface AuthorResourcesManagerProps {
    /**
     * The author's public username. When known we surface a "Preview" link to
     * the live profile section so the author can see exactly what readers see
     * (ext §14 "Preview"). Optional — the manager works without it.
     */
    authorUsername?: string | null;
}

export function AuthorResourcesManager({ authorUsername }: AuthorResourcesManagerProps = {}) {
    const [resources, setResources] = useState<ManagedResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<ResourceDraft>(EMPTY_DRAFT);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    // The author's own publicly visible posts, for the optional
    // "show on specific articles" control (ext §13).
    const [posts, setPosts] = useState<AuthorPostOption[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const postsLoadedRef = useRef(false);

    /* ----------------------------- load ----------------------------- */

    const load = useCallback(async () => {
        try {
            const response = await fetch('/api/author/resources');
            if (!response.ok) {
                // A 403 simply means the profile isn't created yet — the parent
                // page already guides the author, so stay quiet here.
                if (response.status !== 403) throw new Error('Failed to load resources');
                setResources([]);
                return;
            }
            const payload = (await response.json()) as { resources: ManagedResource[] };
            setResources(payload.resources ?? []);
        } catch {
            toast.error('Could not load your recommended resources');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    /**
     * Loaded lazily the first time the form opens, so the dashboard doesn't pay
     * for a posts query nobody asked for. Reuses the existing my-posts endpoint
     * rather than adding another one.
     */
    const loadPosts = useCallback(async () => {
        if (postsLoadedRef.current) return;
        postsLoadedRef.current = true;

        setPostsLoading(true);
        try {
            const response = await fetch('/api/blog/my-posts?limit=50');
            if (!response.ok) throw new Error('Failed to load posts');
            const payload = (await response.json()) as { posts?: AuthorPostOption[] };
            setPosts(
                (payload.posts ?? []).filter((post) => PUBLIC_POST_STATUSES.has(post.status)),
            );
        } catch {
            // Non-fatal: the association control simply stays hidden and the
            // resource still shows on the author profile.
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    }, []);

    /* ----------------------------- form ----------------------------- */

    const openAddForm = () => {
        if (resources.length >= RESOURCE_LIMITS.maxPerAuthor) {
            toast.error(`You can add up to ${RESOURCE_LIMITS.maxPerAuthor} resources.`);
            return;
        }
        setEditingId(null);
        setDraft(EMPTY_DRAFT);
        setFormOpen(true);
        void loadPosts();
    };

    const openEditForm = (resource: ManagedResource) => {
        setEditingId(resource.id);
        setDraft({
            url: resource.url,
            title: resource.title,
            description: resource.description ?? '',
            imageUrl: resource.imageUrl ?? '',
            merchant: resource.merchant ?? '',
            domain: resource.domain,
            isAffiliate: resource.isAffiliate,
            affiliateDisclosure: resource.affiliateDisclosure ?? '',
            metadataResolved: true,
            articleIds: resource.articleIds ?? [],
        });
        setFormOpen(true);
        void loadPosts();
    };

    /** Toggle one article association in the draft (ext §13). */
    const toggleArticle = (postId: string) => {
        setDraft((prev) => ({
            ...prev,
            articleIds: prev.articleIds.includes(postId)
                ? prev.articleIds.filter((id) => id !== postId)
                : [...prev.articleIds, postId],
        }));
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingId(null);
        setDraft(EMPTY_DRAFT);
    };

    /**
     * "Check link" — validate locally for instant feedback, then ask the server
     * for metadata. Local validation is a convenience only; the server repeats
     * every check (ext §5).
     */
    const checkLink = async () => {
        const local = validateResourceUrl(draft.url);
        if (!local.ok) {
            toast.error(local.error);
            return;
        }

        setChecking(true);
        try {
            const response = await fetch('/api/author/resources/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: draft.url }),
            });

            const payload = await response.json();

            if (!response.ok) {
                toast.error(payload?.error ?? 'Could not check that link');
                return;
            }

            setDraft((prev) => ({
                ...prev,
                url: payload.url ?? prev.url,
                domain: payload.domain ?? prev.domain,
                // Never overwrite something the author already typed.
                title: prev.title || payload.title || '',
                description: prev.description || payload.description || '',
                imageUrl: prev.imageUrl || payload.imageUrl || '',
                merchant: prev.merchant || payload.merchant || '',
                metadataResolved: Boolean(payload.resolved),
            }));

            if (payload.resolved) {
                toast.success('Link checked — details filled in below');
            } else {
                // Not a failure (ext §7): plenty of merchants block scrapers.
                toast.info("We couldn't read this page's details. Please add them below.");
            }
        } catch {
            toast.error('Could not check that link');
        } finally {
            setChecking(false);
        }
    };

    /** Reuses the existing upload endpoint — no new image infrastructure. */
    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Images must be 5MB or smaller');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'author-resources');

            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const payload = await response.json();

            if (!response.ok || !payload?.url) {
                toast.error(payload?.error ?? 'Image upload failed');
                return;
            }

            setDraft((prev) => ({ ...prev, imageUrl: payload.url }));
            toast.success('Image uploaded');
        } catch {
            toast.error('Image upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const save = async () => {
        const local = validateResourceUrl(draft.url);
        if (!local.ok) {
            toast.error(local.error);
            return;
        }
        if (!draft.title.trim()) {
            toast.error('Give this resource a title');
            return;
        }

        setSaving(true);
        try {
            const body = {
                url: draft.url,
                title: draft.title,
                description: draft.description,
                imageUrl: draft.imageUrl,
                merchant: draft.merchant,
                isAffiliate: draft.isAffiliate,
                affiliateDisclosure: draft.affiliateDisclosure,
                metadataResolved: draft.metadataResolved,
                // ext §13: a real relation. The server ignores ids that don't
                // belong to this author, so this can't be used to attach a
                // resource to somebody else's article.
                articleIds: draft.articleIds,
            };

            const response = await fetch(
                editingId ? `/api/author/resources/${editingId}` : '/api/author/resources',
                {
                    method: editingId ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                },
            );

            const payload = await response.json();

            if (!response.ok) {
                toast.error(payload?.error ?? 'Could not save that resource');
                return;
            }

            toast.success(editingId ? 'Resource updated' : 'Resource added');
            closeForm();
            await load();
        } catch {
            toast.error('Could not save that resource');
        } finally {
            setSaving(false);
        }
    };

    /* --------------------------- list actions --------------------------- */

    const toggleActive = async (resource: ManagedResource) => {
        setBusyId(resource.id);
        try {
            const response = await fetch(`/api/author/resources/${resource.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !resource.isActive }),
            });
            if (!response.ok) throw new Error();

            setResources((prev) =>
                prev.map((item) =>
                    item.id === resource.id ? { ...item, isActive: !item.isActive } : item,
                ),
            );
            toast.success(resource.isActive ? 'Hidden from your profile' : 'Now visible');
        } catch {
            toast.error('Could not update that resource');
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (resource: ManagedResource) => {
        if (!window.confirm(`Remove "${resource.title}" from your recommendations?`)) return;

        setBusyId(resource.id);
        try {
            const response = await fetch(`/api/author/resources/${resource.id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error();

            setResources((prev) => prev.filter((item) => item.id !== resource.id));
            toast.success('Resource removed');
        } catch {
            toast.error('Could not remove that resource');
        } finally {
            setBusyId(null);
        }
    };

    const move = async (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= resources.length) return;

        const next = [...resources];
        [next[index], next[target]] = [next[target], next[index]];

        // Optimistic: the list reorders immediately, then we persist.
        const previous = resources;
        setResources(next);

        try {
            const response = await fetch('/api/author/resources', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: next.map((item) => item.id) }),
            });
            if (!response.ok) throw new Error();
        } catch {
            setResources(previous);
            toast.error('Could not save the new order');
        }
    };

    /* ------------------------------ render ------------------------------ */

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                            Recommended Resources
                        </CardTitle>
                        <CardDescription>
                            Share the tools, guides and products you recommend. They appear on your
                            author profile and can be attached to individual articles.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* ext §14 "Preview" — see the section exactly as readers do. */}
                        {authorUsername && resources.length > 0 ? (
                            <Button variant="outline" size="sm" asChild>
                                <Link
                                    href={`/author/${authorUsername}#author-resources`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                                    Preview
                                </Link>
                            </Button>
                        ) : null}
                        {!formOpen ? (
                            <Button onClick={openAddForm} size="sm" disabled={loading}>
                                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                Add recommended resource
                            </Button>
                        ) : null}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* ------------------------- add / edit form ------------------------- */}
                {formOpen ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {editingId ? 'Edit resource' : 'New resource'}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={closeForm} aria-label="Close form">
                                <X className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {/* URL + check */}
                            <div className="space-y-2">
                                <Label htmlFor="resource-url">Link *</Label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Input
                                        id="resource-url"
                                        value={draft.url}
                                        onChange={(event) =>
                                            setDraft((prev) => ({ ...prev, url: event.target.value }))
                                        }
                                        placeholder="https://www.amazon.com/dp/... or any product page"
                                        maxLength={RESOURCE_LIMITS.url}
                                        inputMode="url"
                                        autoComplete="off"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={checkLink}
                                        disabled={checking || !draft.url.trim()}
                                        className="shrink-0"
                                    >
                                        {checking ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                        ) : (
                                            <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                        )}
                                        Check link
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Works with Amazon, Jumia, eBay, AliExpress, your own shop — any
                                    public https:// page. Your affiliate tags are kept exactly as you
                                    paste them.
                                </p>
                                {draft.domain ? (
                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                        Destination: {resourceMerchantLabel(draft.merchant, draft.domain)}
                                    </p>
                                ) : null}
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="resource-title">Title *</Label>
                                <Input
                                    id="resource-title"
                                    value={draft.title}
                                    onChange={(event) =>
                                        setDraft((prev) => ({ ...prev, title: event.target.value }))
                                    }
                                    placeholder="e.g., Poultry Vaccination Guide"
                                    maxLength={RESOURCE_LIMITS.title}
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="resource-description">Why you recommend it</Label>
                                <Textarea
                                    id="resource-description"
                                    value={draft.description}
                                    onChange={(event) =>
                                        setDraft((prev) => ({ ...prev, description: event.target.value }))
                                    }
                                    placeholder="A practical guide for poultry farmers…"
                                    maxLength={RESOURCE_LIMITS.description}
                                    rows={3}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {draft.description.length}/{RESOURCE_LIMITS.description}
                                </p>
                            </div>

                            {/* Image */}
                            <div className="space-y-2">
                                <Label htmlFor="resource-image">Image</Label>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                    {draft.imageUrl ? (
                                        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                                            {/* Remote merchant image — plain img by design. */}
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={draft.imageUrl}
                                                alt=""
                                                className="h-full w-full object-cover"
                                                referrerPolicy="no-referrer"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setDraft((prev) => ({ ...prev, imageUrl: '' }))}
                                                aria-label="Remove image"
                                                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                                            >
                                                <X className="h-3 w-3" aria-hidden="true" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                                            <ImageIcon
                                                className="h-5 w-5 text-gray-400"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1 space-y-2">
                                        <Input
                                            id="resource-image"
                                            value={draft.imageUrl}
                                            onChange={(event) =>
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    imageUrl: event.target.value,
                                                }))
                                            }
                                            placeholder="https://… image URL"
                                            inputMode="url"
                                        />
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(event) => {
                                                    const file = event.target.files?.[0];
                                                    if (file) void handleImageUpload(file);
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                            >
                                                {uploading ? (
                                                    <Loader2
                                                        className="mr-2 h-4 w-4 animate-spin"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                                                )}
                                                Upload your own
                                            </Button>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Optional. Without an image the card shows a clean
                                            merchant label instead.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Merchant */}
                            <div className="space-y-2">
                                <Label htmlFor="resource-merchant">Merchant or platform</Label>
                                <Input
                                    id="resource-merchant"
                                    value={draft.merchant}
                                    onChange={(event) =>
                                        setDraft((prev) => ({ ...prev, merchant: event.target.value }))
                                    }
                                    placeholder={draft.domain || 'e.g., Amazon, Jumia, your shop'}
                                    maxLength={60}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Leave blank and we&apos;ll show the website domain.
                                </p>
                            </div>

                            {/* Affiliate declaration — author's call, never inferred. */}
                            <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <Label
                                            htmlFor="resource-affiliate"
                                            className="text-sm font-medium"
                                        >
                                            This is an affiliate link
                                        </Label>
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Turn this on if you earn a commission. We&apos;ll add a
                                            clear disclosure for readers and tag the link correctly.
                                        </p>
                                    </div>
                                    <Switch
                                        id="resource-affiliate"
                                        checked={draft.isAffiliate}
                                        onCheckedChange={(checked) =>
                                            setDraft((prev) => ({ ...prev, isAffiliate: checked }))
                                        }
                                        aria-label="This is an affiliate link"
                                    />
                                </div>

                                {draft.isAffiliate ? (
                                    <div className="mt-3 space-y-2">
                                        <Label htmlFor="resource-disclosure" className="text-xs">
                                            Custom disclosure (optional)
                                        </Label>
                                        <Input
                                            id="resource-disclosure"
                                            value={draft.affiliateDisclosure}
                                            onChange={(event) =>
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    affiliateDisclosure: event.target.value,
                                                }))
                                            }
                                            placeholder={DEFAULT_AFFILIATE_DISCLOSURE}
                                            maxLength={RESOURCE_LIMITS.disclosure}
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Leave blank to use our standard wording.
                                        </p>
                                    </div>
                                ) : null}
                            </div>

                            {/*
                                ext §12 / §13: article placement is deliberate.
                                A resource always lives on the author profile;
                                it only appears inside an article when the author
                                explicitly attaches it here. Hidden entirely when
                                the author has no published posts yet.
                            */}
                            {postsLoading ? (
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                    Loading your articles…
                                </div>
                            ) : posts.length > 0 ? (
                                <fieldset className="space-y-2">
                                    <legend className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Show on specific articles (optional)
                                    </legend>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Only pick articles where this resource is genuinely relevant.
                                        Leave everything unchecked to show it on your profile only.
                                    </p>
                                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
                                        {posts.map((post) => {
                                            const inputId = `resource-post-${post.id}`;
                                            return (
                                                <label
                                                    key={post.id}
                                                    htmlFor={inputId}
                                                    className="flex min-h-[40px] cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                >
                                                    <Checkbox
                                                        id={inputId}
                                                        checked={draft.articleIds.includes(post.id)}
                                                        onCheckedChange={() => toggleArticle(post.id)}
                                                    />
                                                    <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
                                                        {post.title}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {draft.articleIds.length > 0 ? (
                                        <p className="text-xs text-emerald-700 dark:text-emerald-400">
                                            Showing on {draft.articleIds.length}{' '}
                                            {draft.articleIds.length === 1 ? 'article' : 'articles'}
                                        </p>
                                    ) : null}
                                </fieldset>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                                <Button onClick={save} disabled={saving}>
                                    {saving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                    ) : null}
                                    {editingId ? 'Save changes' : 'Add resource'}
                                </Button>
                                <Button variant="outline" onClick={closeForm} disabled={saving}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* ----------------------------- list ----------------------------- */}
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Loading your resources…
                    </div>
                ) : resources.length === 0 ? (
                    !formOpen ? (
                        // Motivational, not salesy (ext §27 / author-spec §27).
                        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center dark:border-gray-700">
                            <Package
                                className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500"
                                aria-hidden="true"
                            />
                            <p className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                No recommended resources yet
                            </p>
                            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
                                Share the guides, tools and products you actually use. Readers who
                                trust your articles are the readers most likely to value your
                                recommendations.
                            </p>
                            <Button onClick={openAddForm} size="sm" className="mt-4">
                                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                Add your first resource
                            </Button>
                        </div>
                    ) : null
                ) : (
                    <ul className="space-y-3">
                        {resources.map((resource, index) => (
                            <li
                                key={resource.id}
                                className={cn(
                                    'flex flex-col gap-3 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center dark:border-gray-800',
                                    !resource.isActive && 'opacity-60',
                                )}
                            >
                                {/* Thumbnail */}
                                <div className="h-16 w-full shrink-0 overflow-hidden rounded-md bg-gray-100 sm:w-24 dark:bg-gray-800">
                                    {resource.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={resource.imageUrl}
                                            alt=""
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <Package
                                                className="h-4 w-4 text-gray-400"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {resource.title}
                                        </p>
                                        {resource.isAffiliate ? (
                                            <Badge variant="secondary" className="text-[10px]">
                                                Affiliate
                                            </Badge>
                                        ) : null}
                                        {!resource.isActive ? (
                                            <Badge variant="outline" className="text-[10px]">
                                                Hidden
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                                        {resourceMerchantLabel(resource.merchant, resource.domain)}
                                        {typeof resource.clickCount === 'number' && resource.clickCount > 0
                                            ? ` · ${resource.clickCount} ${resource.clickCount === 1 ? 'click' : 'clicks'}`
                                            : ''}
                                        {resource.articleIds && resource.articleIds.length > 0
                                            ? ` · on ${resource.articleIds.length} ${resource.articleIds.length === 1 ? 'article' : 'articles'}`
                                            : ''}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => void move(index, -1)}
                                        disabled={index === 0}
                                        aria-label={`Move ${resource.title} up`}
                                    >
                                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => void move(index, 1)}
                                        disabled={index === resources.length - 1}
                                        aria-label={`Move ${resource.title} down`}
                                    >
                                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => void toggleActive(resource)}
                                        disabled={busyId === resource.id}
                                        aria-label={
                                            resource.isActive
                                                ? `Hide ${resource.title} from your profile`
                                                : `Show ${resource.title} on your profile`
                                        }
                                    >
                                        {resource.isActive ? (
                                            <Eye className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditForm(resource)}
                                        aria-label={`Edit ${resource.title}`}
                                    >
                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => void remove(resource)}
                                        disabled={busyId === resource.id}
                                        aria-label={`Remove ${resource.title}`}
                                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {resources.length > 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {resources.length}/{RESOURCE_LIMITS.maxPerAuthor} resources · hidden resources
                        never appear on your public profile.
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

export default AuthorResourcesManager;
