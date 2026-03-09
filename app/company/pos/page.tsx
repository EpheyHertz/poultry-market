import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

// Company users share the same POS interface
// This page redirects to a shared POS component
export default async function CompanyPOSPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'COMPANY') {
    redirect('/auth/login');
  }
  
  // Import and render the POS component directly
  const POSPage = (await import('@/app/seller/pos/page')).default;
  return <POSPage />;
}
