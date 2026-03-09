'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import { Package, Search, Plus, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

export default function StoreProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/store/products?page=${page}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setPagination(data.pagination);
      }
    } catch {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" /> Store Products
          </h1>
          <Button onClick={() => window.location.href = '/seller/products'}>
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product: any) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="h-16 w-16 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                        {product.images?.[0] ? (
                          <Image src={product.images[0]} alt={product.name} width={64} height={64} className="object-cover w-full h-full" />
                        ) : (
                          <div className="flex items-center justify-center h-full"><Package className="h-6 w-6 text-gray-300" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{product.name}</h3>
                        <p className="text-sm font-bold text-green-600">{formatCurrency(product.price)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-xs">
                            {product.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                          {product.sku && <span className="text-xs text-gray-400">SKU: {product.sku}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <span>{product._count?.reviews || 0} reviews</span>
                      <span>·</span>
                      <span>{product._count?.orderItems || 0} orders</span>
                      {product.categories?.map((c: any) => (
                        <Badge key={c.category?.id} variant="outline" className="text-xs">{c.category?.name}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-gray-600">Page {page} of {pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
