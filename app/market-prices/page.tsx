'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatCurrency';
import { TrendingUp, TrendingDown, Minus, BarChart3, Search } from 'lucide-react';

const CATEGORIES = ['EGGS', 'CHICKEN_MEAT', 'CHICKEN_FEED', 'CHICKS', 'HATCHING_EGGS'];

export default function MarketPricesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (regionFilter) params.set('region', regionFilter);
    fetch(`/api/market-prices?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [categoryFilter, regionFilter]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-green-600" /> Poultry Market Price Index
        </h1>
        <p className="text-gray-500 mt-1">Real-time poultry market prices across Kenya</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Filter by region..."
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="pl-10 w-48"
          />
        </div>
      </div>

      {/* Platform Averages */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Platform Averages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.platformAverages?.map((avg: any) => (
            <Card key={avg.category}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{avg.category.replace(/_/g, ' ')}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(avg.averagePrice)}</p>
                  </div>
                  <Badge variant="outline">{avg.listingCount} listings</Badge>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>Min: {formatCurrency(avg.minPrice)}</span>
                  <span>Max: {formatCurrency(avg.maxPrice)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!data?.platformAverages || data.platformAverages.length === 0) && (
            <p className="text-gray-500 col-span-3">No platform data available yet</p>
          )}
        </div>
      </div>

      {/* Market Prices by Region */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Regional Prices</h2>
        {data?.marketPrices?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Avg Price</th>
                  <th className="px-4 py-3 font-medium">Range</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.marketPrices.map((price: any) => (
                  <tr key={price.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{price.category.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">{price.region}</td>
                    <td className="px-4 py-3 font-bold text-green-600">{formatCurrency(price.averagePrice)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatCurrency(price.minPrice)} - {formatCurrency(price.maxPrice)}</td>
                    <td className="px-4 py-3">{price.unit}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{price.source}</Badge></td>
                    <td className="px-4 py-3 text-gray-400">{new Date(price.recordedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No regional price data available yet</p>
        )}
      </div>
    </div>
  );
}
