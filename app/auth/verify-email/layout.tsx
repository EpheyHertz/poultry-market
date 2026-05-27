import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seo';

export const metadata: Metadata = {
  title: `Verify Email | ${seoConfig.siteName}`,
  description: 'Verify your PoultryMarket email address to activate full access.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
