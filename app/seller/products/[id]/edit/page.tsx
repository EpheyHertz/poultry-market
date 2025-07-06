
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageUpload from '@/components/ui/image-upload';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EditProductProps {
  params: {
    id: string;
  };
}

export default async function EditProduct({ params }: EditProductProps) {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'SELLER') {
    redirect('/auth/login');
  }

  const product = await prisma.product.findUnique({
    where: {
      id: params.id,
      sellerId: user.id
    }
  });

  if (!product) {
    notFound();
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/seller/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-600 mt-2">Update your product information</p>
          </div>
        </div>

        {/* Product Form */}
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>
              Update your product details below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" action={`/api/products/${product.id}`} method="PUT">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={product.name}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Product Type *</Label>
                  <Select name="type" defaultValue={product.type} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGGS">Eggs</SelectItem>
                      <SelectItem value="CHICKEN_MEAT">Chicken Meat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={product.price}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    defaultValue={product.stock}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={product.description}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Product Images</Label>
                <ImageUpload
                  name="images"
                  multiple={true}
                  maxFiles={5}
                  accept="image/*"
                  defaultImages={product.images}
                />
                <p className="text-sm text-gray-500">
                  Upload up to 5 high-quality images of your product.
                </p>
              </div>

              <div className="flex justify-end space-x-4">
                <Link href="/seller/products">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit">
                  Update Product
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
