'use client';

// components/ads.tsx
//
// AdSense loader. We inject a plain <script> instead of using next/script
// because next/script stamps a `data-nscript` attribute onto the tag, which
// AdSense rejects with:
//   "AdSense head tag doesn't support data-nscript attribute"
// Injecting manually also lets us guarantee the tag is only ever added once,
// no matter how many pages render this component.

import { useEffect } from 'react';

const ADSENSE_CLIENT = 'ca-pub-7786183795346128';
const SCRIPT_ID = 'adsbygoogle-js';

export default function AdsenseScript() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(script);
  }, []);

  return null;
}
