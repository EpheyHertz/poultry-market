'use client';

import { useEffect, useRef } from 'react';

const CONTAINER_ID = 'container-c06840bf29bbbfacf5b701c5270b8148';
const SCRIPT_IDS = [
  'poultry-market-blog-ad-bf51056e6b241130904a89e2c692776a',
  'poultry-market-blog-ad-c06840bf29bbbfacf5b701c5270b8148',
  'poultry-market-blog-ad-87ea952c7b37082237e3a77610a59933',
] as const;

const SCRIPT_SOURCES = [
  'https://bauval.org/14/bf51056e6b241130904a89e2c692776a',
  'https://bauval.org/21/c06840bf29bbbfacf5b701c5270b8148',
  'https://abscloud.org/1/87ea952c7b37082237e3a77610a59933',
] as const;

export default function BlogNetworkAds() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scripts = SCRIPT_SOURCES.map((src, index) => {
      const existing = document.getElementById(SCRIPT_IDS[index]);
      if (existing) return existing;

      const script = document.createElement('script');
      script.id = SCRIPT_IDS[index];
      script.src = src;
      script.async = index === 1;
      script.setAttribute('data-cfasync', 'false');
      if (index < 2) {
        container.before(script);
      } else {
        container.after(script);
      }
      return script;
    });

    return () => {
      scripts.forEach((script) => script.remove());
      container.replaceChildren();
    };
  }, []);

  return <div ref={containerRef} id={CONTAINER_ID} />;
}
