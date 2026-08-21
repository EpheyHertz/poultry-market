'use client';

/**
 * ReadingProgress (§3, §23)
 *
 * A 3px bar pinned to the top of the viewport.
 *
 * Progress is measured against the **article content element** — not the
 * document — so it reads 0% when the body starts and exactly 100% when the
 * last line of the article is visible, regardless of how tall the footer,
 * comments or recommendation rails are.
 *
 * Implementation notes:
 *   - `requestAnimationFrame` throttling: at most one measurement per frame.
 *   - Passive scroll/resize listeners.
 *   - `transform: scaleX()` so the browser animates on the compositor.
 *   - `top-0` with a z-index below the sticky navbar (z-50) so it never
 *     covers navigation controls.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ReadingProgressProps {
    /** id of the element holding the article body (defaults to `article-content`). */
    targetId?: string;
    className?: string;
    /** Optional callback used by ArticleAnalytics for scroll-depth milestones. */
    onProgress?: (percent: number) => void;
}

export function ReadingProgress({
    targetId = 'article-content',
    className,
    onProgress,
}: ReadingProgressProps) {
    const [progress, setProgress] = useState(0);
    const frameRef = useRef<number | null>(null);
    const onProgressRef = useRef(onProgress);

    // Keep the latest callback without re-binding scroll listeners.
    useEffect(() => {
        onProgressRef.current = onProgress;
    }, [onProgress]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const compute = () => {
            frameRef.current = null;

            const target = document.getElementById(targetId);
            if (!target) return;

            const rect = target.getBoundingClientRect();
            const viewport = window.innerHeight;

            // Distance the reader must scroll from "article top at viewport top"
            // to "article bottom at viewport bottom".
            const scrollableHeight = rect.height - viewport;

            let percent: number;
            if (scrollableHeight <= 0) {
                // Article is shorter than the viewport: it is either fully
                // visible (100%) or still below the fold (0%).
                percent = rect.bottom <= viewport ? 100 : 0;
            } else {
                percent = (-rect.top / scrollableHeight) * 100;
            }

            const clamped = Math.min(100, Math.max(0, Math.round(percent * 10) / 10));
            setProgress(clamped);
            onProgressRef.current?.(clamped);
        };

        const schedule = () => {
            if (frameRef.current !== null) return;
            frameRef.current = window.requestAnimationFrame(compute);
        };

        compute();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });

        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
        };
    }, [targetId]);

    return (
        <div
            className={cn(
                'fixed left-0 right-0 top-0 z-[60] h-[3px] bg-transparent',
                className,
            )}
            role="progressbar"
            aria-label="Article reading progress"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className="h-full origin-left bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 transition-transform duration-150 ease-out"
                style={{ transform: `scaleX(${progress / 100})`, width: '100%' }}
            />
        </div>
    );
}

export default ReadingProgress;
