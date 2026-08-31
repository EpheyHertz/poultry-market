'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, ImagePlus, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    MAX_PRODUCT_IMAGES,
    MAX_PRODUCT_IMAGE_BYTES,
    getProductTypeOptions,
} from '@/lib/seller-products';

export type ProductFormValues = {
    id?: string;
    name: string;
    description: string;
    price: number | string;
    stock: number | string;
    type: string;
    customType?: string | null;
    images?: string[];
};

type ProductFormProps = {
    mode: 'create' | 'edit';
    /** e.g. `/seller/products` or `/company/products` */
    basePath: string;
    /** Session role, used to resolve the product types this account may list */
    role: string;
    product?: ProductFormValues;
};

type FieldErrors = Partial<Record<'name' | 'description' | 'price' | 'stock' | 'type' | 'customType' | 'images', string>>;

const MAX_IMAGE_DIMENSION = 1200;

function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onerror = () => resolve(file);
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onerror = () => resolve(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_IMAGE_DIMENSION) {
                        height *= MAX_IMAGE_DIMENSION / width;
                        width = MAX_IMAGE_DIMENSION;
                    }
                } else if (height > MAX_IMAGE_DIMENSION) {
                    width *= MAX_IMAGE_DIMENSION / height;
                    height = MAX_IMAGE_DIMENSION;
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    },
                    'image/jpeg',
                    0.7,
                );
            };
        };
    });
}

export default function ProductForm({ mode, basePath, role, product }: ProductFormProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typeOptions = getProductTypeOptions(role);

    const [values, setValues] = useState({
        name: product?.name ?? '',
        description: product?.description ?? '',
        price: product?.price !== undefined && product?.price !== null ? String(product.price) : '',
        stock: product?.stock !== undefined && product?.stock !== null ? String(product.stock) : '',
        type: product?.type ?? '',
        customType: product?.customType ?? '',
    });
    const [images, setImages] = useState<string[]>(product?.images ?? []);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isEdit = mode === 'edit';

    const setValue = (field: keyof typeof values, value: string) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

    const validate = (): FieldErrors => {
        const errors: FieldErrors = {};

        if (!values.name.trim()) errors.name = 'Product name is required.';
        if (!values.description.trim()) errors.description = 'Add a short description so buyers know what they are getting.';
        if (!values.type) errors.type = 'Choose a category.';
        if (values.type === 'CUSTOM' && !values.customType.trim()) {
            errors.customType = 'Name your custom category.';
        }

        const price = Number(values.price);
        if (!values.price.trim() || Number.isNaN(price) || price <= 0) {
            errors.price = 'Enter a price greater than 0.';
        }

        const stock = Number(values.stock);
        if (!values.stock.trim() || Number.isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
            errors.stock = 'Enter the available quantity (0 or more).';
        }

        if (images.length === 0) {
            errors.images = 'Add at least one product photo.';
        }

        return errors;
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length === 0) return;

        if (images.length + files.length > MAX_PRODUCT_IMAGES) {
            toast.error(`You can upload up to ${MAX_PRODUCT_IMAGES} photos.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        setFieldErrors((prev) => ({ ...prev, images: undefined }));

        try {
            for (const file of files) {
                if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
                    toast.error(`${file.name} is larger than 10MB.`);
                    continue;
                }

                const compressed = await compressImage(file);
                const body = new FormData();
                body.append('file', compressed);

                const response = await fetch('/api/upload/cloudinary', { method: 'POST', body });

                if (!response.ok) {
                    toast.error(`We could not upload ${file.name}. Please try again.`);
                    continue;
                }

                const data = await response.json();
                if (data?.url) {
                    setImages((prev) => [...prev, data.url]);
                }
            }
        } catch {
            toast.error('Image upload failed. Please check your connection and try again.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSaving || isUploading) return;

        const errors = validate();
        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            setFormError('Please fix the highlighted fields and try again.');
            return;
        }

        setFormError('');
        setIsSaving(true);

        try {
            const payload = {
                name: values.name.trim(),
                description: values.description.trim(),
                type: values.type,
                customType: values.type === 'CUSTOM' ? values.customType.trim() : undefined,
                price: Number(values.price),
                stock: Number(values.stock),
                images,
            };

            const response = await fetch(isEdit ? `/api/products/${product?.id}` : '/api/products', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(data?.error || 'We could not save this product. Please try again.');
            }

            toast.success(isEdit ? 'Product updated.' : 'Product created.');
            router.push(basePath);
            router.refresh();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'We could not save this product. Please try again.';
            setFormError(message);
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const busy = isSaving || isUploading;

    return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0">
                        <Link href={basePath} aria-label="Back to products">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                            {isEdit ? 'Edit product' : 'Add product'}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {isEdit
                                ? 'Update the details buyers see on your listing.'
                                : 'Publish a new listing to your storefront.'}
                        </p>
                    </div>
                </div>
            </div>

            {formError ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formError}</AlertDescription>
                </Alert>
            ) : null}

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <Card className="border-border/70">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Product details</CardTitle>
                        <CardDescription>Basic information shown on the marketplace.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="product-name">Product name</Label>
                            <Input
                                id="product-name"
                                value={values.name}
                                onChange={(event) => setValue('name', event.target.value)}
                                placeholder="e.g. Free-range brown eggs (tray of 30)"
                                aria-invalid={Boolean(fieldErrors.name)}
                                aria-describedby={fieldErrors.name ? 'product-name-error' : undefined}
                                disabled={busy}
                            />
                            {fieldErrors.name ? (
                                <p id="product-name-error" className="text-sm text-destructive">
                                    {fieldErrors.name}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-type">Category</Label>
                            <Select
                                value={values.type}
                                onValueChange={(value) => setValue('type', value)}
                                disabled={busy}
                            >
                                <SelectTrigger
                                    id="product-type"
                                    aria-invalid={Boolean(fieldErrors.type)}
                                    aria-describedby={fieldErrors.type ? 'product-type-error' : undefined}
                                >
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {typeOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {fieldErrors.type ? (
                                <p id="product-type-error" className="text-sm text-destructive">
                                    {fieldErrors.type}
                                </p>
                            ) : null}
                        </div>

                        {values.type === 'CUSTOM' ? (
                            <div className="space-y-2">
                                <Label htmlFor="product-custom-type">Custom category name</Label>
                                <Input
                                    id="product-custom-type"
                                    value={values.customType}
                                    onChange={(event) => setValue('customType', event.target.value)}
                                    placeholder="e.g. Duck eggs"
                                    aria-invalid={Boolean(fieldErrors.customType)}
                                    aria-describedby={fieldErrors.customType ? 'product-custom-type-error' : undefined}
                                    disabled={busy}
                                />
                                {fieldErrors.customType ? (
                                    <p id="product-custom-type-error" className="text-sm text-destructive">
                                        {fieldErrors.customType}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="product-description">Description</Label>
                            <Textarea
                                id="product-description"
                                value={values.description}
                                onChange={(event) => setValue('description', event.target.value)}
                                rows={5}
                                placeholder="Describe quality, packaging, delivery options and anything buyers should know."
                                aria-invalid={Boolean(fieldErrors.description)}
                                aria-describedby={fieldErrors.description ? 'product-description-error' : undefined}
                                disabled={busy}
                            />
                            {fieldErrors.description ? (
                                <p id="product-description-error" className="text-sm text-destructive">
                                    {fieldErrors.description}
                                </p>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/70">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Pricing &amp; stock</CardTitle>
                        <CardDescription>Prices are listed in Kenyan Shillings (KSH).</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="product-price">Price (KSH)</Label>
                            <Input
                                id="product-price"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={values.price}
                                onChange={(event) => setValue('price', event.target.value)}
                                placeholder="0.00"
                                aria-invalid={Boolean(fieldErrors.price)}
                                aria-describedby={fieldErrors.price ? 'product-price-error' : undefined}
                                disabled={busy}
                            />
                            {fieldErrors.price ? (
                                <p id="product-price-error" className="text-sm text-destructive">
                                    {fieldErrors.price}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-stock">Quantity available</Label>
                            <Input
                                id="product-stock"
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="1"
                                value={values.stock}
                                onChange={(event) => setValue('stock', event.target.value)}
                                placeholder="0"
                                aria-invalid={Boolean(fieldErrors.stock)}
                                aria-describedby={fieldErrors.stock ? 'product-stock-error' : 'product-stock-hint'}
                                disabled={busy}
                            />
                            {fieldErrors.stock ? (
                                <p id="product-stock-error" className="text-sm text-destructive">
                                    {fieldErrors.stock}
                                </p>
                            ) : (
                                <p id="product-stock-hint" className="text-xs text-muted-foreground">
                                    Set to 0 to show the listing as out of stock.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/70">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Photos</CardTitle>
                        <CardDescription>
                            Up to {MAX_PRODUCT_IMAGES} photos, 10MB each. The first photo is used as the cover image.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <input
                            ref={fileInputRef}
                            id="product-images"
                            type="file"
                            accept="image/*"
                            multiple
                            className="sr-only"
                            onChange={handleFileChange}
                            disabled={busy || images.length >= MAX_PRODUCT_IMAGES}
                        />

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={busy || images.length >= MAX_PRODUCT_IMAGES}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading…
                                    </>
                                ) : (
                                    <>
                                        <ImagePlus className="mr-2 h-4 w-4" />
                                        Upload photos
                                    </>
                                )}
                            </Button>
                            <span className="text-xs text-muted-foreground" aria-live="polite">
                                {images.length} of {MAX_PRODUCT_IMAGES} added
                            </span>
                        </div>

                        {images.length > 0 ? (
                            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                {images.map((url, index) => (
                                    <li
                                        key={`${url}-${index}`}
                                        className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                                    >
                                        <Image
                                            src={url}
                                            alt={`Product photo ${index + 1}`}
                                            fill
                                            sizes="160px"
                                            className="object-cover"
                                        />
                                        {index === 0 ? (
                                            <span className="absolute left-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                                                Cover
                                            </span>
                                        ) : null}
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute right-1.5 top-1.5 h-7 w-7"
                                            onClick={() => removeImage(index)}
                                            disabled={busy}
                                            aria-label={`Remove photo ${index + 1}`}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                                <ImagePlus className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
                                <p className="mt-2 text-sm text-muted-foreground">No photos added yet.</p>
                            </div>
                        )}

                        {fieldErrors.images ? (
                            <p className="text-sm text-destructive">{fieldErrors.images}</p>
                        ) : null}
                    </CardContent>
                </Card>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button asChild variant="outline" className="sm:w-auto">
                        <Link href={basePath}>Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={busy} className="sm:w-auto">
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {isEdit ? 'Save changes' : 'Publish product'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
