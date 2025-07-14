import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, Dimensions } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useCartStore } from '../../stores/cartStore';
import { Product } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

const { width } = Dimensions.get('window');

interface ProductDetailScreenProps {
  navigation: any;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { productId } = route.params as { productId: string };
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const productData = await apiService.getProduct(productId);
      setProduct(productData);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
      navigation.goBack();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EGGS': return 'warning';
      case 'CHICKEN_MEAT': return 'error';
      case 'CHICKEN_FEED': return 'success';
      case 'CHICKS': return 'info';
      case 'HATCHING_EGGS': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !product) {
    return (
      <StyledSafeAreaView className="flex-1 bg-white">
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <StyledText className="text-red-600 text-center mt-4 text-lg">
            {error || 'Product not found'}
          </StyledText>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            className="mt-4"
          />
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <StyledView className="flex-row items-center p-4 border-b border-gray-200">
        <Button
          title=""
          variant="ghost"
          onPress={() => navigation.goBack()}
          className="mr-2"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </Button>
        <StyledText className="text-lg font-semibold flex-1">
          Product Details
        </StyledText>
      </StyledView>

      <StyledScrollView className="flex-1">
        {/* Product Images */}
        <StyledView className="bg-gray-100">
          {product.images.length > 0 ? (
            <Image
              source={{ uri: product.images[0] }}
              style={{ width, height: width }}
              resizeMode="cover"
            />
          ) : (
            <StyledView 
              style={{ width, height: width }}
              className="justify-center items-center bg-gray-200"
            >
              <Ionicons name="image" size={64} color="#9ca3af" />
            </StyledView>
          )}
          
          <StyledView className="absolute top-4 left-4">
            <Badge variant={getTypeColor(product.type)}>
              {product.type.replace('_', ' ')}
            </Badge>
          </StyledView>
        </StyledView>

        {/* Product Info */}
        <StyledView className="p-4">
          <Card>
            <CardHeader>
              <StyledText className="text-2xl font-bold text-gray-900 mb-2">
                {product.name}
              </StyledText>
              <StyledText className="text-3xl font-bold text-primary-600">
                ${product.price.toFixed(2)}
              </StyledText>
            </CardHeader>
            <CardContent>
              <StyledText className="text-gray-600 mb-4 leading-6">
                {product.description}
              </StyledText>

              {/* Stock Info */}
              <StyledView className="flex-row justify-between items-center mb-4">
                <StyledText className="text-gray-700 font-medium">
                  Stock Available:
                </StyledText>
                <StyledText className={`font-semibold ${
                  product.stock > 10 ? 'text-green-600' : 
                  product.stock > 0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {product.stock} units
                </StyledText>
              </StyledView>

              {/* Seller Info */}
              <StyledView className="border-t border-gray-200 pt-4 mb-4">
                <StyledText className="text-lg font-semibold text-gray-900 mb-2">
                  Seller Information
                </StyledText>
                <StyledText className="text-gray-700 mb-2">
                  <StyledText className="font-medium">{product.seller.name}</StyledText>
                </StyledText>
                <StyledText className="text-sm text-gray-600 mb-2">
                  Role: {product.seller.role}
                </StyledText>
                
                {product.seller.tags.length > 0 && (
                  <StyledView className="flex-row flex-wrap">
                    {product.seller.tags.map((tagData, index) => (
                      <Badge key={index} variant="info" size="sm" className="mr-2 mb-2">
                        {tagData.tag}
                      </Badge>
                    ))}
                  </StyledView>
                )}
              </StyledView>

              {/* Quantity Selector */}
              {product.stock > 0 && (
                <StyledView className="border-t border-gray-200 pt-4 mb-4">
                  <StyledText className="text-lg font-semibold text-gray-900 mb-3">
                    Quantity
                  </StyledText>
                  <StyledView className="flex-row items-center justify-center space-x-4">
                    <Button
                      title="-"
                      variant="outline"
                      size="sm"
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    />
                    <StyledText className="text-xl font-semibold min-w-12 text-center">
                      {quantity}
                    </StyledText>
                    <Button
                      title="+"
                      variant="outline"
                      size="sm"
                      onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                    />
                  </StyledView>
                </StyledView>
              )}
            </CardContent>
          </Card>
        </StyledView>
      </StyledScrollView>

      {/* Add to Cart Button */}
      <StyledView className="p-4 border-t border-gray-200 bg-white">
        <Button
          title={product.stock === 0 ? 'Out of Stock' : `Add ${quantity} to Cart - $${(product.price * quantity).toFixed(2)}`}
          onPress={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full"
        />
      </StyledView>
    </StyledSafeAreaView>
  );
};