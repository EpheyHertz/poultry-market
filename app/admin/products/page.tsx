'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  Shield,
  Star,
  Award,
  Crown,
  Zap,
  Leaf,
  MapPin,
  TrendingUp,
  Percent
} from 'lucide-react';

const tagIcons = {
  VERIFIED: Shield,
  TRUSTED: Star,
  RECOMMENDED: Award,
  PREMIUM: Crown,
  FEATURED: Zap,
  ORGANIC: Leaf,
  LOCAL: MapPin,
  BESTSELLER: TrendingUp,
  DISCOUNTED: Percent,
  NEW_ARRIVAL: Star,
  LIMITED_STOCK: Package,
};

const tagColors = {
  VERIFIED: 'bg-blue-100 text-blue-800',
  TRUSTED: 'bg-green-100 text-green-800',
  RECOMMENDED: 'bg-purple-100 text-purple-800',
  PREMIUM: 'bg-yellow-100 text-yellow-800',
  FEATURED: 'bg-orange-100 text-orange-800',
  ORGANIC: 'bg-emerald-100 text-emerald-800',
  LOCAL: 'bg-cyan-100 text-cyan-800',
  BESTSELLER: 'bg-pink-100 text-pink-800',
  DISCOUNTED: 'bg-red-100 text-red-800',
  NEW_ARRIVAL: 'bg-indigo-100 text-indigo-800',
  LIMITED_STOCK: 'bg-amber-100 text-amber-800',
};

export default function AdminProducts() {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'ADMIN') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user, typeFilter, sellerFilter]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (sellerFilter) params.append('sellerId', sellerFilter);
      
      const response = await fetch(`/api/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EGGS': return 'bg-yellow-100 text-yellow-800';
      case 'CHICKEN_MEAT': return 'bg-red-100 text-red-800';
      case 'CHICKEN_FEED': return 'bg-green-100 text-green-800';
      case 'CHICKS': return 'bg-orange-100 text-orange-800';
      case 'HATCHING_EGGS': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'bg-red-100 text-red-800', text: 'Out of Stock' };
    if (stock < 10) return { color: 'bg-yellow-100 text-yellow-800', text: 'Low Stock' };
    return { color: 'bg-green-100 text-green-800', text: 'In Stock' };
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.seller.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-2">View and manage all products in the marketplace</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="">All Types</SelectItem> */}
                  <SelectItem value="EGGS">Eggs</SelectItem>
                  <SelectItem value="CHICKEN_MEAT">Chicken Meat</SelectItem>
                  <SelectItem value="CHICKEN_FEED">Chicken Feed</SelectItem>
                  <SelectItem value="CHICKS">Chicks</SelectItem>
                  <SelectItem value="HATCHING_EGGS">Hatching Eggs</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by seller type" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="">All Sellers</SelectItem> */}
                  <SelectItem value="SELLER">Individual Sellers</SelectItem>
                  <SelectItem value="COMPANY">Companies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({filteredProducts.length})</CardTitle>
            <CardDescription>All products in the marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock);
                  return (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        {product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <Package className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Discount Badge */}
                        {product.hasDiscount && (
                          <div className="absolute top-2 left-2">
                            <Badge className="bg-red-500 text-white">
                              {product.discountType === 'PERCENTAGE' 
                                ? `${product.discountAmount}% OFF` 
                                : `$${product.discountAmount} OFF`}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <Badge className={getTypeColor(product.type)}>
                            {product.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {product.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          {/* Seller Info */}
                          <div>
                            <p className="text-sm text-gray-600">
                              Sold by: <span className="font-medium">{product.seller.name}</span>
                            </p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {product.seller.role}
                            </Badge>
                          </div>

                          {/* Tags */}
                          {product.tags && product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {product.tags.map((tagData: any) => {
                                const TagIcon = tagIcons[tagData.tag as keyof typeof tagIcons];
                                return (
                                  <Badge 
                                    key={tagData.tag} 
                                    variant="outline"
                                    className={`text-xs ${tagColors[tagData.tag as keyof typeof tagColors]}`}
                                  >
                                    <TagIcon className="w-3 h-3 mr-1" />
                                    {tagData.tag.replace('_', ' ')}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Price and Stock */}
                          <div className="flex justify-between items-center">
                            <span className="text-2xl font-bold text-green-600">
                              ${product.price.toFixed(2)}
                            </span>
                            <Badge className={stockStatus.color}>
                              {stockStatus.text}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            Stock: {product.stock} units
                          </div>
                          
                          {/* Actions */}
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}