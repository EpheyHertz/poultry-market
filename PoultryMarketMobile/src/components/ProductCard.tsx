import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
}) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EGGS':
        return 'warning';
      case 'CHICKEN_MEAT':
        return 'error';
      case 'CHICKEN_FEED':
        return 'success';
      case 'CHICKS':
        return 'info';
      case 'HATCHING_EGGS':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatType = (type: string) => {
    return type.replace('_', ' ');
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <StyledTouchableOpacity onPress={onPress}>
        <StyledView className="aspect-square relative">
          {product.images.length > 0 ? (
            <Image
              source={{ uri: product.images[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <StyledView className="w-full h-full bg-gray-200 justify-center items-center">
              <Ionicons name="image" size={48} color="#9ca3af" />
            </StyledView>
          )}
          
          <StyledView className="absolute top-2 left-2">
            <Badge variant={getTypeColor(product.type)} size="sm">
              {formatType(product.type)}
            </Badge>
          </StyledView>
        </StyledView>
      </StyledTouchableOpacity>

      <CardContent className="p-4">
        <StyledView className="space-y-3">
          <StyledView>
            <StyledText className="text-lg font-semibold text-gray-900 mb-1">
              {product.name}
            </StyledText>
            <StyledText className="text-sm text-gray-600 line-clamp-2">
              {product.description}
            </StyledText>
          </StyledView>

          {/* Seller Info */}
          <StyledView>
            <StyledText className="text-sm text-gray-600">
              Sold by: <StyledText className="font-medium">{product.seller.name}</StyledText>
            </StyledText>
            {product.seller.tags.length > 0 && (
              <StyledView className="flex-row flex-wrap mt-1">
                {product.seller.tags.slice(0, 2).map((tagData, index) => (
                  <Badge key={index} variant="info" size="sm" className="mr-1 mb-1">
                    {tagData.tag}
                  </Badge>
                ))}
              </StyledView>
            )}
          </StyledView>

          {/* Price and Stock */}
          <StyledView className="flex-row justify-between items-center">
            <StyledText className="text-2xl font-bold text-primary-600">
              ${product.price.toFixed(2)}
            </StyledText>
            <StyledText className="text-sm text-gray-500">
              {product.stock} in stock
            </StyledText>
          </StyledView>

          {/* Add to Cart Button */}
          <Button
            title={product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            onPress={onAddToCart}
            disabled={product.stock === 0}
            className="w-full"
          />
        </StyledView>
      </CardContent>
    </Card>
  );
};