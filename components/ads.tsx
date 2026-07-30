// components/adsense-script.tsx

import Script from "next/script";

export default function AdsenseScript() {
  return (
    <Script
      id="adsense-auto-ads"
      async
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7786183795346128"
      crossOrigin="anonymous"
    />
  );
}