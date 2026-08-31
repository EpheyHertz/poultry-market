import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';

import DashboardLayout from '@/components/layout/dashboard-layout';
import ProductManager from '@/components/seller/product-manager';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth';

export default async function SellerProducts() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'SELLER') {
    redirect('/auth/login');
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Products
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your listings, pricing and stock levels.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/seller/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Add product
            </Link>
          </Button>
        </div>

        <ProductManager basePath="/seller/products" role={user.role} />
      </div>
    </DashboardLayout>
  );
}
