import type { Metadata } from 'next';
import { seoConfig } from '@/lib/seo';

export const metadata: Metadata = {
  title: `Forgot Password | ${seoConfig.siteName}`,
  description: 'Reset your PoultryMarket password securely and regain access to your account.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
