import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Alert } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOrderStore } from '../../stores/orderStore';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Input } from '../../components/ui/Input';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface OrdersScreenProps {
  navigation: any;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation }) => {
  const { orders, loading, fetchOrders, submitPayment } = useOrderStore();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    phone: '',
    reference: '',
    mpesaMessage: '',
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'CONFIRMED': return 'info';
      case 'PACKED': return 'default';
      case 'OUT_FOR_DELIVERY': return 'warning';
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID': return 'error';
      case 'PENDING': return 'warning';
      case 'SUBMITTED': return 'info';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  const canSubmitPayment = (order: any) => {
    return (order.paymentType === 'BEFORE_DELIVERY' && order.paymentStatus === 'UNPAID') ||
           (order.paymentType === 'AFTER_DELIVERY' && order.status === 'DELIVERED' && order.paymentStatus !== 'APPROVED');
  };

  const handleSubmitPayment = async () => {
    if (!selectedOrder) return;

    if (!paymentForm.phone.trim() || !paymentForm.reference.trim() || !paymentForm.mpesaMessage.trim()) {
      Alert.alert('Error', 'Please fill in all payment details');
      return;
    }

    try {
      await submitPayment(selectedOrder.id, paymentForm);
      setShowPaymentForm(false);
      setSelectedOrder(null);
      setPaymentForm({ phone: '', reference: '', mpesaMessage: '' });
      Alert.alert('Success', 'Payment details submitted successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit payment');
    }
  };

  if (loading && orders.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <StyledView className="bg-white px-4 py-3 border-b border-gray-200">
        <StyledText className="text-xl font-bold text-gray-900">
          My Orders
        </StyledText>
      </StyledView>

      {orders.length === 0 ? (
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="receipt" size={64} color="#9ca3af" />
          <StyledText className="text-gray-500 text-lg text-center mt-4">
            No orders yet
          </StyledText>
          <StyledText className="text-gray-400 text-center mt-2 mb-6">
            Start shopping to see your orders here
          </StyledText>
          <Button
            title="Browse Products"
            onPress={() => navigation.navigate('Products')}
          />
        </StyledView>
      ) : (
        <StyledScrollView
          className="flex-1 p-4"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchOrders} />
          }
        >
          {orders.map((order) => (
            <Card key={order.id} className="mb-4">
              <CardHeader>
                <StyledView className="flex-row justify-between items-start">
                  <StyledView>
                    <StyledText className="text-lg font-semibold">
                      Order #{order.id.slice(-8)}
                    </StyledText>
                    <StyledText className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </StyledText>
                  </StyledView>
                  <StyledView className="items-end space-y-1">
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant={getPaymentStatusColor(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                  </StyledView>
                </StyledView>
              </CardHeader>
              
              <CardContent>
                {/* Order Items */}
                <StyledView className="mb-4">
                  <StyledText className="font-medium mb-2">Items:</StyledText>
                  {order.items.map((item: any) => (
                    <StyledView key={item.id} className="flex-row justify-between items-center py-1">
                      <StyledText className="flex-1">
                        {item.product.name} x{item.quantity}
                      </StyledText>
                      <StyledText className="font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </StyledText>
                    </StyledView>
                  ))}
                </StyledView>

                {/* Total */}
                <StyledView className="flex-row justify-between items-center border-t border-gray-200 pt-2 mb-4">
                  <StyledText className="font-semibold">Total:</StyledText>
                  <StyledText className="text-lg font-bold text-primary-600">
                    ${order.total.toFixed(2)}
                  </StyledText>
                </StyledView>

                {/* Delivery Info */}
                {order.delivery && (
                  <StyledView className="bg-blue-50 p-3 rounded-lg mb-4">
                    <StyledText className="font-medium mb-1">Delivery Information</StyledText>
                    <StyledText className="text-sm text-gray-600">
                      Tracking: {order.delivery.trackingId}
                    </StyledText>
                    <StyledText className="text-sm text-gray-600">
                      Status: {order.delivery.status}
                    </StyledText>
                  </StyledView>
                )}

                {/* Payment Actions */}
                {canSubmitPayment(order) && (
                  <Button
                    title="Submit Payment"
                    onPress={() => {
                      setSelectedOrder(order);
                      setShowPaymentForm(true);
                    }}
                    className="w-full"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </StyledScrollView>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedOrder && (
        <StyledView className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <StyledView className="flex-row justify-between items-center">
                <StyledText className="text-lg font-semibold">
                  Submit Payment
                </StyledText>
                <Button
                  title=""
                  variant="ghost"
                  size="sm"
                  onPress={() => setShowPaymentForm(false)}
                >
                  <Ionicons name="close" size={24} color="#374151" />
                </Button>
              </StyledView>
              <StyledText className="text-sm text-gray-600">
                Order #{selectedOrder.id.slice(-8)}
              </StyledText>
            </CardHeader>
            
            <CardContent>
              <StyledView className="space-y-4">
                <Input
                  label="Phone Number"
                  placeholder="254712345678"
                  value={paymentForm.phone}
                  onChangeText={(value) => setPaymentForm({ ...paymentForm, phone: value })}
                  keyboardType="phone-pad"
                />

                <Input
                  label="Transaction Reference"
                  placeholder="ABC123DEF4"
                  value={paymentForm.reference}
                  onChangeText={(value) => setPaymentForm({ ...paymentForm, reference: value })}
                />

                <Input
                  label="M-Pesa Confirmation Message"
                  placeholder="Paste your M-Pesa confirmation message here..."
                  value={paymentForm.mpesaMessage}
                  onChangeText={(value) => setPaymentForm({ ...paymentForm, mpesaMessage: value })}
                  multiline
                  numberOfLines={3}
                />

                <StyledView className="flex-row space-x-2">
                  <Button
                    title="Submit"
                    onPress={handleSubmitPayment}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setShowPaymentForm(false)}
                    className="flex-1"
                  />
                </StyledView>
              </StyledView>
            </CardContent>
          </Card>
        </StyledView>
      )}
    </StyledSafeAreaView>
  );
};