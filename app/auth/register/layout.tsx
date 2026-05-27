import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seo';

export const metadata: Metadata = {
  title: `Sign Up | ${seoConfig.siteName}`,
  description: 'Create a PoultryMarket account to access verified poultry listings and services.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
