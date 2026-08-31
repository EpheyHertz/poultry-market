import { redirect } from 'next/navigation';

import DashboardLayout from '@/components/layout/dashboard-layout';
import ProductForm from '@/components/seller/product-form';
import { getCurrentUser } from '@/lib/auth';

export default async function NewCompanyProduct() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'COMPANY') {
    redirect('/auth/login');
  }

  return (
    <DashboardLayout user={user}>
      <ProductForm mode="create" basePath="/company/products" role={user.role} />
    </DashboardLayout>
  );
}
