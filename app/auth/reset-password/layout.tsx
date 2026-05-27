import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seo';

export const metadata: Metadata = {
  title: `Reset Password | ${seoConfig.siteName}`,
  description: 'Set a new password for your PoultryMarket account securely.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
