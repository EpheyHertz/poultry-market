import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seo';

export const metadata: Metadata = {
  title: `Login | ${seoConfig.siteName}`,
  description: 'Sign in to your PoultryMarket account to manage orders and listings.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
