'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlogImageProps {
  src?: string | null;
  alt: string;
  /** Aspect ratio wrapper class (e.g. "aspect-video"). Ignored when `fill` is used inside a sized parent. */
  className?: string;
  /** Tailwind sizes hint for responsive loading. */
  sizes?: string;
  /** Enable the zoom-on-hover effect (parent must be `group`). */
  zoom?: boolean;
  /** Prioritize above-the-fold images (disables lazy loading). */
  priority?: boolean;
  /** Rounded corner radius class. */
  rounded?: string;
}

/**
 * Shared article image: maintains aspect ratio, lazy loads by default,
 * zooms on hover, and shows a branded placeholder when the source is
 * missing or fails to load.
 */
export default function BlogImage({
  src,
  alt,
  className,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  zoom = true,
  priority = false,
  rounded,
}: BlogImageProps) {
  const [errored, setErrored] = useState(false);
  const showPlaceholder = !src || errored;

  return (
    <div className={cn('relative overflow-hidden bg-emerald-50 dark:bg-emerald-950/30', rounded, className)}>
      {showPlaceholder ? (
        <div
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100 dark:from-emerald-900/50 dark:via-emerald-800/30 dark:to-teal-900/50"
          role="img"
          aria-label={alt}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.12),transparent_70%)]" />
          <ImageOff className="h-10 w-10 text-emerald-500/50 dark:text-emerald-400/50" aria-hidden />
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          onError={() => setErrored(true)}
          className={cn(
            'object-cover transition-transform duration-700 ease-out',
            zoom && 'group-hover:scale-110'
          )}
        />
      )}
    </div>
  );
}
