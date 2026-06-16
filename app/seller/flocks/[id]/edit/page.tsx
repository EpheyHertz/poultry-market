import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { FlockForm } from '@/components/flocks';
import { toFlockViewModel } from '@/lib/flocks';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFlockPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
    redirect('/auth/login');
  }

  const { id } = await params;
  const flock = await prisma.livestockFlock.findUnique({
    where: { id },
    include: {
      vaccinationsGiven: true,
      medicationsGiven: true,
    },
  });

  if (!flock || (user.role !== 'ADMIN' && flock.sellerId !== user.id)) {
    redirect('/seller/flocks');
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-6xl mx-auto py-2 sm:py-4">
        <FlockForm mode="edit" basePath="/seller/flocks" initialData={toFlockViewModel(flock)} />
      </div>
    </DashboardLayout>
  );
}