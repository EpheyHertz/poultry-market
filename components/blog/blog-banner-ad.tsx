'use client';

import { useEffect, useId, useRef } from 'react';

type BannerAdVariant = 'rectangle' | 'leaderboard' | 'mobile';

interface BlogBannerAdProps {
  variant: BannerAdVariant;
  className?: string;
}

const ADS = {
  rectangle: {
    key: '8f029b4f04075a9a894d66729f5b5e7d',
    width: 300,
    height: 250,
  },
  leaderboard: {
    key: '1dc52e24eb6795f728bb864e7d7c95ed',
    width: 728,
    height: 90,
  },
  mobile: {
    key: '8fd9cf485289716d26ebe804c4e7d382',
    width: 320,
    height: 50,
  },
} as const;

export default function BlogBannerAd({ variant, className = '' }: BlogBannerAdProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const instanceId = useId().replace(/:/g, '');
  const ad = ADS[variant];

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const options = document.createElement('script');
    options.id = `blog-banner-options-${variant}-${instanceId}`;
    options.text = `window.atOptions = ${JSON.stringify({
      key: ad.key,
      format: 'iframe',
      height: ad.height,
      width: ad.width,
      params: {},
    })};`;

    const script = document.createElement('script');
    script.id = `blog-banner-script-${variant}-${instanceId}`;
    script.src = `https://bauval.org/22/${ad.key}`;
    script.async = false;

    anchor.append(options, script);

    return () => {
      options.remove();
      script.remove();
      anchor.replaceChildren();
    };
  }, [ad.height, ad.key, ad.width, instanceId, variant]);

  return (
    <div
      ref={anchorRef}
      aria-label="Advertisement"
      className={`flex w-full justify-center overflow-x-auto overflow-y-hidden ${className}`}
      style={{ minHeight: ad.height }}
    />
  );
}
