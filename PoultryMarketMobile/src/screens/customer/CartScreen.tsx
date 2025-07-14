import React from 'react';
import { View, Text, ScrollView, Image, Alert } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../stores/cartStore';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface CartScreenProps {
  navigation: any;
}

export const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const { items, total, updateQuantity, removeItem, clearCart } = useCartStore();

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }
    navigation.navigate('Checkout');
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearCart },
      ]
    );
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <StyledView className="bg-white px-4 py-3 border-b border-gray-200">
        <StyledView className="flex-row justify-between items-center">
          <StyledView className="flex-row items-center">
            <Button
              title=""
              variant="ghost"
              onPress={() => navigation.goBack()}
              className="mr-2"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </Button>
            <StyledText className="text-xl font-bold text-gray-900">
              Shopping Cart ({items.length})
            </StyledText>
          </StyledView>
          {items.length > 0 && (
            <Button
              title="Clear"
              variant="ghost"
              size="sm"
              onPress={handleClearCart}
            />
          )}
        </StyledView>
      </StyledView>

      {items.length === 0 ? (
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="cart" size={64} color="#9ca3af" />
          <StyledText className="text-gray-500 text-lg text-center mt-4">
            Your cart is empty
          </StyledText>
          <StyledText className="text-gray-400 text-center mt-2 mb-6">
            Add some products to get started
          </StyledText>
          <Button
            title="Browse Products"
            onPress={() => navigation.navigate('Products')}
          />
        </StyledView>
      ) : (
        <>
          <StyledScrollView className="flex-1 p-4">
            {items.map((item) => (
              <Card key={item.id} className="mb-4">
                <CardContent className="p-4">
                  <StyledView className="flex-row space-x-4">
                    {/* Product Image */}
                    <StyledView className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200">
                      {item.product.images.length > 0 ? (
                        <Image
                          source={{ uri: item.product.images[0] }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <StyledView className="w-full h-full justify-center items-center">
                          <Ionicons name="image" size={24} color="#9ca3af" />
                        </StyledView>
                      )}
                    </StyledView>

                    {/* Product Info */}
                    <StyledView className="flex-1">
                      <StyledText className="text-lg font-semibold text-gray-900 mb-1">
                        {item.product.name}
                      </StyledText>
                      <StyledText className="text-sm text-gray-600 mb-2">
                        by {item.product.seller.name}
                      </StyledText>
                      <StyledText className="text-lg font-bold text-primary-600">
                        ${item.product.price.toFixed(2)}
                      </StyledText>
                    </StyledView>

                    {/* Remove Button */}
                    <Button
                      title=""
                      variant="ghost"
                      size="sm"
                      onPress={() => removeItem(item.id)}
                    >
                      <Ionicons name="trash" size={20} color="#ef4444" />
                    </Button>
                  </StyledView>

                  {/* Quantity Controls */}
                  <StyledView className="flex-row justify-between items-center mt-4">
                    <StyledView className="flex-row items-center space-x-3">
                      <Button
                        title="-"
                        variant="outline"
                        size="sm"
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      />
                      <StyledText className="text-lg font-semibold min-w-8 text-center">
                        {item.quantity}
                      </StyledText>
                      <Button
                        title="+"
                        variant="outline"
                        size="sm"
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      />
                    </StyledView>

                    <StyledText className="text-lg font-bold text-gray-900">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </StyledText>
                  </StyledView>
                </CardContent>
              </Card>
            ))}
          </StyledScrollView>

          {/* Cart Summary */}
          <StyledView className="bg-white border-t border-gray-200 p-4">
            <Card>
              <CardHeader>
                <StyledView className="flex-row justify-between items-center">
                  <StyledText className="text-lg font-semibold">Total</StyledText>
                  <StyledText className="text-2xl font-bold text-primary-600">
                    ${total.toFixed(2)}
                  </StyledText>
                </StyledView>
              </CardHeader>
              <CardContent>
                <Button
                  title="Proceed to Checkout"
                  onPress={handleCheckout}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </StyledView>
        </>
      )}
    </StyledSafeAreaView>
  );
};