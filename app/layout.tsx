import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { seoConfig, structuredData } from '@/lib/seo';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.siteUrl),
  title: {
    default: seoConfig.defaultTitle,
    template: seoConfig.titleTemplate,
  },
  description: seoConfig.defaultDescription,
  keywords: seoConfig.keywords,
  authors: [{ name: seoConfig.author }],
  creator: seoConfig.creator,
  publisher: seoConfig.publisher,
  formatDetection: seoConfig.formatDetection,
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: seoConfig.siteUrl,
    siteName: seoConfig.siteName,
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
    images: seoConfig.images,
  },
  
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: seoConfig.defaultTitle,
    description: seoConfig.defaultDescription,
    site: seoConfig.twitter.site,
    creator: seoConfig.twitter.handle,
    images: seoConfig.twitter.images,
  },
  
  // Verification
  verification: seoConfig.verification,
  
  // Alternates
  alternates: seoConfig.alternates,
  
  // Robots
  robots: {
    index: seoConfig.robots.index,
    follow: seoConfig.robots.follow,
    nocache: seoConfig.robots.nocache,
    googleBot: {
      index: seoConfig.robots.googleBot.index,
      follow: seoConfig.robots.googleBot.follow,
      noimageindex: seoConfig.robots.googleBot.noimageindex,
      'max-video-preview': seoConfig.robots.googleBot['max-video-preview'],
      'max-image-preview': 'large', // Use one of the allowed values: "none", "large", or "standard"
      'max-snippet': seoConfig.robots.googleBot['max-snippet'],
    },
  },
  
  // Icons
  icons: {
    icon: '/images/favicon.png',
    shortcut: '/images/favicon16x16.png',
    apple: '/images/apple-touch-icon.png',
  },
  
  // Manifest
  manifest: seoConfig.manifest,
  
  // Additional SEO
  category: 'Agriculture & Food',
  classification: 'Business',
  referrer: 'origin-when-cross-origin',
};

export const viewport: Viewport = {
  themeColor: seoConfig.themeColor,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData.organization),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData.website),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData.marketplace),
          }}
        />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={seoConfig.siteUrl} />
        
        {/* Google Search Console Verification */}
        <meta name="google-site-verification" content="IgPxvlBVBb5z9Qvfgv34KXZPyVNGQXGtI_XHOS7VMSo" />
        
        {/* Additional meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PoultryMarket" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content={seoConfig.themeColor} />
        
        {/* Geo tags for Kenya */}
        <meta name="geo.region" content="KE" />
        <meta name="geo.country" content="Kenya" />
        <meta name="geo.placename" content="Kenya" />
        
        {/* Language alternatives */}
        <link rel="alternate" hrefLang="en-ke" href={seoConfig.siteUrl} />
        <link rel="alternate" hrefLang="x-default" href={seoConfig.siteUrl} />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}