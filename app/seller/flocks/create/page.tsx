import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { FlockForm } from '@/components/flocks';

export default async function CreateFlockPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
    redirect('/auth/login');
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-6xl mx-auto py-2 sm:py-4">
        <FlockForm mode="create" basePath="/seller/flocks" />
      </div>
    </DashboardLayout>
  );
}