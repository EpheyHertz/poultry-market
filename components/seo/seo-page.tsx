import { Metadata } from 'next';
import { generatePageSEO, generateBreadcrumbStructuredData } from '@/lib/seo';

interface SEOPageProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  breadcrumbs?: Array<{ name: string; url?: string }>;
  structuredData?: any;
  children: React.ReactNode;
}

export function generateSEOMetadata({
  title,
  description,
  path = '',
  image,
  keywords,
}: Omit<SEOPageProps, 'children' | 'breadcrumbs' | 'structuredData'>): Metadata {
  const seo = generatePageSEO(title, description, path, image, keywords);
  
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    openGraph: seo.openGraph,
    twitter: seo.twitter,
    alternates: {
      canonical: seo.canonical,
    },
  };
}

export default function SEOPage({ 
  title, 
  description, 
  path, 
  image, 
  keywords, 
  breadcrumbs,
  structuredData,
  children 
}: SEOPageProps) {
  return (
    <>
      {/* Breadcrumb Structured Data */}
      {breadcrumbs && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateBreadcrumbStructuredData(breadcrumbs)),
          }}
        />
      )}
      
      {/* Additional Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      )}
      
      {children}
    </>
  );
}
