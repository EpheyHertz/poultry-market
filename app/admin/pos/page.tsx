import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

// Admin POS access — shares same interface as seller POS
export default async function AdminPOSPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    redirect('/auth/login');
  }

  const POSPage = (await import('@/app/seller/pos/page')).default;
  return <POSPage />;
}
