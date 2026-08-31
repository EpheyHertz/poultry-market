import { notFound, redirect } from 'next/navigation';

import DashboardLayout from '@/components/layout/dashboard-layout';
import ProductForm from '@/components/seller/product-form';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isValidProductId } from '@/lib/seller-products';

export default async function EditSellerProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== 'SELLER') {
    redirect('/auth/login');
  }

  if (!isValidProductId(id)) {
    notFound();
  }

  const product = await prisma.product.findFirst({
    where: { id, sellerId: user.id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      stock: true,
      type: true,
      customType: true,
      images: true,
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <DashboardLayout user={user}>
      <ProductForm
        mode="edit"
        basePath="/seller/products"
        role={user.role}
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          type: product.type,
          customType: product.customType,
          images: product.images,
        }}
      />
    </DashboardLayout>
  );
}
