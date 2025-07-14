import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, FlatList, RefreshControl } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProductStore } from '../../stores/productStore';
import { useCartStore } from '../../stores/cartStore';
import { ProductCard } from '../../components/ProductCard';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { CartIcon } from '../../components/CartIcon';
import { Card, CardContent } from '../../components/ui/Card';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface ProductsScreenProps {
  navigation: any;
}

export const ProductsScreen: React.FC<ProductsScreenProps> = ({ navigation }) => {
  const {
    products,
    loading,
    error,
    filters,
    fetchProducts,
    setFilters,
    clearFilters,
  } = useProductStore();
  
  const addItem = useCartStore(state => state.addItem);
  const [searchText, setSearchText] = useState(filters.search);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = () => {
    setFilters({ search: searchText });
  };

  const handleAddToCart = (product: any) => {
    addItem(product);
    // You could show a toast notification here
  };

  const filterButtons = [
    { label: 'All', value: '' },
    { label: 'Eggs', value: 'EGGS' },
    { label: 'Meat', value: 'CHICKEN_MEAT' },
    { label: 'Feed', value: 'CHICKEN_FEED' },
    { label: 'Chicks', value: 'CHICKS' },
    { label: 'Hatching', value: 'HATCHING_EGGS' },
  ];

  const sortButtons = [
    { label: 'Default', value: '' },
    { label: 'Price: Low to High', value: 'price_low' },
    { label: 'Price: High to Low', value: 'price_high' },
    { label: 'Name A-Z', value: 'name' },
  ];

  if (loading && products.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <StyledView className="bg-white px-4 py-3 border-b border-gray-200">
        <StyledView className="flex-row justify-between items-center">
          <StyledText className="text-xl font-bold text-gray-900">
            Browse Products
          </StyledText>
          <CartIcon onPress={() => navigation.navigate('Cart')} />
        </StyledView>
      </StyledView>

      <StyledScrollView className="flex-1">
        {/* Search and Filters */}
        <StyledView className="bg-white p-4 border-b border-gray-200">
          <StyledView className="flex-row space-x-2 mb-4">
            <StyledView className="flex-1">
              <Input
                placeholder="Search products..."
                value={searchText}
                onChangeText={setSearchText}
                leftIcon="search"
                onSubmitEditing={handleSearch}
              />
            </StyledView>
            <Button title="Search" onPress={handleSearch} size="sm" />
          </StyledView>

          {/* Type Filters */}
          <StyledView className="mb-4">
            <StyledText className="text-sm font-medium text-gray-700 mb-2">
              Category
            </StyledText>
            <StyledScrollView horizontal showsHorizontalScrollIndicator={false}>
              <StyledView className="flex-row space-x-2">
                {filterButtons.map((filter) => (
                  <Button
                    key={filter.value}
                    title={filter.label}
                    variant={filters.type === filter.value ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => setFilters({ type: filter.value })}
                  />
                ))}
              </StyledView>
            </StyledScrollView>
          </StyledView>

          {/* Sort Options */}
          <StyledView className="mb-4">
            <StyledText className="text-sm font-medium text-gray-700 mb-2">
              Sort By
            </StyledText>
            <StyledScrollView horizontal showsHorizontalScrollIndicator={false}>
              <StyledView className="flex-row space-x-2">
                {sortButtons.map((sort) => (
                  <Button
                    key={sort.value}
                    title={sort.label}
                    variant={filters.sortBy === sort.value ? 'primary' : 'outline'}
                    size="sm"
                    onPress={() => setFilters({ sortBy: sort.value })}
                  />
                ))}
              </StyledView>
            </StyledScrollView>
          </StyledView>

          {/* Clear Filters */}
          {(filters.type || filters.search || filters.sortBy) && (
            <Button
              title="Clear Filters"
              variant="ghost"
              size="sm"
              onPress={clearFilters}
            />
          )}
        </StyledView>

        {/* Products Grid */}
        <StyledView className="p-4">
          {error ? (
            <Card>
              <CardContent className="p-4">
                <StyledView className="items-center py-8">
                  <Ionicons name="alert-circle" size={48} color="#ef4444" />
                  <StyledText className="text-red-600 text-center mt-2">
                    {error}
                  </StyledText>
                  <Button
                    title="Retry"
                    onPress={fetchProducts}
                    className="mt-4"
                  />
                </StyledView>
              </CardContent>
            </Card>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <StyledView className="items-center py-8">
                  <Ionicons name="search" size={48} color="#9ca3af" />
                  <StyledText className="text-gray-500 text-center mt-2">
                    No products found
                  </StyledText>
                  <StyledText className="text-gray-400 text-sm text-center mt-1">
                    Try adjusting your search or filters
                  </StyledText>
                </StyledView>
              </CardContent>
            </Card>
          ) : (
            <FlatList
              data={products}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onPress={() => navigation.navigate('Product', { productId: item.id })}
                  onAddToCart={() => handleAddToCart(item)}
                />
              )}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={fetchProducts} />
              }
              scrollEnabled={false}
            />
          )}
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};