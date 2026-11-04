'use client';

import { useEffect, useRef } from 'react';

const SMARTLINK_URL = 'https://araplhn.org/4/af46c861425288cda99bb097e6dfcf93';
const POPUNDER_SRC = 'https://abscloud.org/1/87ea952c7b37082237e3a77610a59933';

export function BlogSmartlinkAd({ className = '' }: { className?: string }) {
  return (
    <aside
      aria-label="Sponsored link"
      className={`rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 ${className}`}
    >
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-700/70 dark:text-emerald-300/70">
        Sponsored
      </p>
      <a
        href={SMARTLINK_URL}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="text-sm font-semibold text-emerald-800 underline decoration-emerald-500/50 underline-offset-4 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-white"
      >
        Discover a poultry resource
      </a>
    </aside>
  );
}

export function BlogPopunderAd() {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || document.querySelector('[data-poultry-blog-popunder]')) return;

    const script = document.createElement('script');
    script.src = POPUNDER_SRC;
    script.async = false;
    script.setAttribute('data-cfasync', 'false');
    script.dataset.poultryBlogPopunder = 'true';
    anchor.appendChild(script);

    return () => {
      script.remove();
      anchor.replaceChildren();
    };
  }, []);

  return <div ref={anchorRef} className="hidden" aria-hidden="true" />;
}
