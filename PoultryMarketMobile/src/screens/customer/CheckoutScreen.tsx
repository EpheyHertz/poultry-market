import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../stores/cartStore';
import { useOrderStore } from '../../stores/orderStore';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface CheckoutScreenProps {
  navigation: any;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const { items, total, clearCart } = useCartStore();
  const { createOrder, loading } = useOrderStore();
  
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentType, setPaymentType] = useState<'BEFORE_DELIVERY' | 'AFTER_DELIVERY'>('BEFORE_DELIVERY');
  const [paymentDetails, setPaymentDetails] = useState({
    phone: '',
    reference: '',
    details: '',
  });

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter a delivery address');
      return;
    }

    if (paymentType === 'BEFORE_DELIVERY') {
      if (!paymentDetails.phone.trim() || !paymentDetails.reference.trim()) {
        Alert.alert('Error', 'Please fill in all payment details');
        return;
      }
    }

    try {
      const orderData = {
        items: items.map(item => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        deliveryAddress,
        paymentType,
        paymentDetails: paymentType === 'BEFORE_DELIVERY' ? paymentDetails : null,
      };

      const order = await createOrder(orderData);
      clearCart();
      
      Alert.alert(
        'Order Placed Successfully!',
        `Your order #${order.id.slice(-8)} has been placed.`,
        [
          {
            text: 'View Orders',
            onPress: () => navigation.navigate('Orders'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to place order');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <StyledView className="bg-white px-4 py-3 border-b border-gray-200">
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
            Checkout
          </StyledText>
        </StyledView>
      </StyledView>

      <StyledScrollView className="flex-1 p-4">
        {/* Order Summary */}
        <Card className="mb-4">
          <CardHeader>
            <StyledText className="text-lg font-semibold">Order Summary</StyledText>
          </CardHeader>
          <CardContent>
            {items.map((item) => (
              <StyledView key={item.id} className="flex-row justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <StyledView className="flex-1">
                  <StyledText className="font-medium">{item.product.name}</StyledText>
                  <StyledText className="text-sm text-gray-600">
                    ${item.product.price.toFixed(2)} x {item.quantity}
                  </StyledText>
                </StyledView>
                <StyledText className="font-semibold">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </StyledText>
              </StyledView>
            ))}
            
            <StyledView className="flex-row justify-between items-center pt-4 border-t border-gray-200 mt-4">
              <StyledText className="text-lg font-bold">Total:</StyledText>
              <StyledText className="text-xl font-bold text-primary-600">
                ${total.toFixed(2)}
              </StyledText>
            </StyledView>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card className="mb-4">
          <CardHeader>
            <StyledText className="text-lg font-semibold">Delivery Address</StyledText>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter your full delivery address..."
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
              numberOfLines={3}
              leftIcon="location"
            />
          </CardContent>
        </Card>

        {/* Payment Options */}
        <Card className="mb-4">
          <CardHeader>
            <StyledText className="text-lg font-semibold">Payment Option</StyledText>
          </CardHeader>
          <CardContent>
            <StyledView className="space-y-3">
              <Button
                title="Pay Before Delivery (M-Pesa)"
                variant={paymentType === 'BEFORE_DELIVERY' ? 'primary' : 'outline'}
                onPress={() => setPaymentType('BEFORE_DELIVERY')}
                className="w-full"
              />
              <Button
                title="Pay After Delivery (Cash)"
                variant={paymentType === 'AFTER_DELIVERY' ? 'primary' : 'outline'}
                onPress={() => setPaymentType('AFTER_DELIVERY')}
                className="w-full"
              />
            </StyledView>

            {paymentType === 'BEFORE_DELIVERY' && (
              <StyledView className="mt-4 p-4 bg-blue-50 rounded-lg">
                <StyledText className="font-medium mb-3">M-Pesa Payment Details</StyledText>
                
                <Input
                  label="Phone Number"
                  placeholder="254712345678"
                  value={paymentDetails.phone}
                  onChangeText={(value) => setPaymentDetails({ ...paymentDetails, phone: value })}
                  keyboardType="phone-pad"
                  containerClassName="mb-3"
                />

                <Input
                  label="Transaction Reference"
                  placeholder="ABC123DEF4"
                  value={paymentDetails.reference}
                  onChangeText={(value) => setPaymentDetails({ ...paymentDetails, reference: value })}
                  containerClassName="mb-3"
                />

                <Input
                  label="M-Pesa Confirmation Message"
                  placeholder="Paste your M-Pesa confirmation message here..."
                  value={paymentDetails.details}
                  onChangeText={(value) => setPaymentDetails({ ...paymentDetails, details: value })}
                  multiline
                  numberOfLines={3}
                />
              </StyledView>
            )}
          </CardContent>
        </Card>
      </StyledScrollView>

      {/* Place Order Button */}
      <StyledView className="bg-white border-t border-gray-200 p-4">
        <Button
          title="Place Order"
          onPress={handlePlaceOrder}
          disabled={loading}
          className="w-full"
        />
      </StyledView>
    </StyledSafeAreaView>
  );
};