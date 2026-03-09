'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import {
  MapPin, Phone, Star, Package, ShoppingCart, Search,
  Shield, CheckCircle, Award, ChevronLeft, ChevronRight, Store as StoreIcon,
} from 'lucide-react';

interface StoreData {
  store: any;
  products: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const VERIFICATION_BADGES: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  IDENTITY_VERIFIED: { icon: <CheckCircle className="h-4 w-4" />, label: 'Identity Verified', color: 'bg-blue-100 text-blue-800' },
  FARM_VERIFIED: { icon: <Shield className="h-4 w-4" />, label: 'Farm Verified', color: 'bg-green-100 text-green-800' },
  CERTIFIED_SUPPLIER: { icon: <Award className="h-4 w-4" />, label: 'Certified Supplier', color: 'bg-amber-100 text-amber-800' },
};

export default function StorefrontPage() {
  const params = useParams<{ storeSlug: string }>();
  const router = useRouter();
  const [data, setData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const slug = typeof params?.storeSlug === 'string' ? params.storeSlug : '';

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/store/${slug}?page=${page}&search=${encodeURIComponent(search)}`)
      .then((r) => r.ok ? r.json() : Promise.reject('Store not found'))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug, page, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="w-full h-48" />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data?.store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <StoreIcon className="h-16 w-16 text-gray-300 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Store Not Found</h2>
          <p className="text-gray-500">This store doesn&apos;t exist or is not active.</p>
          <Button onClick={() => router.push('/products')}>Browse Products</Button>
        </div>
      </div>
    );
  }

  const { store, products, pagination } = data;
  const themeColor = store.themeColor || '#16a34a';
  const verif = VERIFICATION_BADGES[store.verificationLevel];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative h-48 md:h-64" style={{ backgroundColor: themeColor }}>
        {store.bannerImage && (
          <Image src={store.bannerImage} alt={store.storeName} fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Store Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="h-24 w-24 rounded-xl bg-white shadow-lg border-4 border-white overflow-hidden flex-shrink-0">
            {store.logo ? (
              <Image src={store.logo} alt={store.storeName} width={96} height={96} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ color: themeColor }}>
                {store.storeName?.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{store.storeName}</h1>
              {verif && (
                <Badge className={verif.color}>
                  {verif.icon}
                  <span className="ml-1">{verif.label}</span>
                </Badge>
              )}
              <Badge variant="outline">{store.storeType}</Badge>
            </div>
            {store.storeDescription && (
              <p className="text-gray-600 mt-2 line-clamp-2">{store.storeDescription}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
              {store.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {store.location}
                </span>
              )}
              {store.contactPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" /> {store.contactPhone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4" /> {store.totalProducts || store._count?.products || 0} products
              </span>
              {store.averageRating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  {store.averageRating.toFixed(1)} ({store.totalReviews} reviews)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search + Products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <span className="text-sm text-gray-500">{pagination.total} products</span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: any) => {
              const avgRating =
                product.reviews?.length > 0
                  ? product.reviews.reduce((s: number, r: any) => s + r.rating, 0) / product.reviews.length
                  : 0;

              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="relative aspect-square bg-gray-100">
                    {product.images?.[0] ? (
                      <Image src={product.images[0]} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <Package className="h-12 w-12" />
                      </div>
                    )}
                    {product.stock <= 5 && product.stock > 0 && (
                      <Badge variant="destructive" className="absolute top-2 right-2">Low Stock</Badge>
                    )}
                    {product.stock === 0 && (
                      <Badge variant="secondary" className="absolute top-2 right-2">Out of Stock</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold" style={{ color: themeColor }}>
                        {formatCurrency(product.price)}
                      </span>
                      {product.unitType && (
                        <span className="text-xs text-gray-500">/ {product.unitType}</span>
                      )}
                    </div>
                    {avgRating > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        {avgRating.toFixed(1)}
                      </div>
                    )}
                    <Button
                      className="w-full mt-3"
                      size="sm"
                      style={{ backgroundColor: themeColor }}
                      onClick={() => router.push(`/product/${product.id}`)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" /> View Product
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
