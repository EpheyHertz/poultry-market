'use client';

// components/ads/ad-slot.tsx
//
// A single AdSense display unit.
//
// Notes on the implementation:
//  - The push to `window.adsbygoogle` is guarded by a ref because React 18
//    StrictMode mounts effects twice in development, and pushing the same
//    <ins> element twice throws "adsbygoogle.push() error: All 'ins' elements
//    in the DOM with class=adsbygoogle already have ads in them".
//  - A `min-height` is reserved up front so the ad filling in later never
//    shifts the surrounding content (Cumulative Layout Shift is a ranking
//    signal, and blog pages are especially sensitive to it).
//  - When no slot id is configured the component renders `null`, which keeps
//    local development and un-configured deploys completely clean.

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ADSENSE_CLIENT, AD_SLOTS, AD_MIN_HEIGHT, type AdSlotName } from '@/lib/ads-config';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  /** Which configured placement to render. */
  name: AdSlotName;
  /** AdSense display format. `fluid` is used for in-feed/in-article units. */
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  /** Required by AdSense for `fluid` in-feed units. */
  layoutKey?: string;
  /** Set false for fixed-size placements such as the sidebar rectangle. */
  fullWidthResponsive?: boolean;
  /** Hide the small "Advertisement" caption. */
  hideLabel?: boolean;
  className?: string;
}

export default function AdSlot({
  name,
  format = 'auto',
  layoutKey,
  fullWidthResponsive = true,
  hideLabel = false,
  className,
}: AdSlotProps) {
  const slot = AD_SLOTS[name];
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!slot || pushedRef.current) return;
    pushedRef.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      // A failed push should never take the page down with it.
      console.warn('[AdSlot] adsbygoogle push failed:', err);
    }
  }, [slot]);

  // No slot configured yet — render nothing rather than an empty grey box.
  if (!slot) return null;

  return (
    <div
      className={cn('w-full overflow-hidden', className)}
      // `aria-hidden` keeps screen readers out of advertising content.
      aria-hidden="true"
    >
      {!hideLabel && (
        <span className="mb-1 block text-center text-[10px] uppercase tracking-widest text-gray-400 dark:text-slate-600">
          Advertisement
        </span>
      )}
      <ins
        className="adsbygoogle block"
        style={{ display: 'block', minHeight: AD_MIN_HEIGHT[name] }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  );
}
