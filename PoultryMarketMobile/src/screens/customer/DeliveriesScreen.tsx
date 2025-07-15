import React, { useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { LiquidGlassCard, LiquidGlassContent, LiquidGlassHeader } from '../../components/ui/LiquidGlassCard';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface DeliveriesScreenProps {
  navigation: any;
}

export const DeliveriesScreen: React.FC<DeliveriesScreenProps> = ({ navigation }) => {
  const { deliveries, loading, fetchDeliveries } = useDeliveryStore();

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'warning';
      case 'picked_up': return 'info';
      case 'in_transit': return 'warning';
      case 'out_for_delivery': return 'info';
      case 'delivered': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return 'time';
      case 'picked_up': return 'checkmark-circle';
      case 'in_transit': return 'car';
      case 'out_for_delivery': return 'bicycle';
      case 'delivered': return 'checkmark-done-circle';
      case 'failed': return 'close-circle';
      default: return 'ellipse';
    }
  };

  if (loading && deliveries.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <StyledSafeAreaView className="flex-1">
      <LinearGradient
        colors={['#16a34a', '#15803d', '#166534']}
        className="flex-1"
      >
        {/* Header */}
        <StyledView className="px-4 py-6">
          <StyledText className="text-white text-2xl font-bold">
            My Deliveries
          </StyledText>
          <StyledText className="text-white/80 mt-1">
            Track your orders in real-time
          </StyledText>
        </StyledView>

        <StyledScrollView
          className="flex-1 px-4"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchDeliveries} />
          }
        >
          {deliveries.length === 0 ? (
            <LiquidGlassCard className="mt-8">
              <LiquidGlassContent className="items-center py-12">
                <Ionicons name="car" size={64} color="rgba(255,255,255,0.6)" />
                <StyledText className="text-white text-lg text-center mt-4">
                  No deliveries yet
                </StyledText>
                <StyledText className="text-white/70 text-center mt-2">
                  Your delivery tracking will appear here
                </StyledText>
              </LiquidGlassContent>
            </LiquidGlassCard>
          ) : (
            deliveries.map((delivery) => (
              <LiquidGlassCard key={delivery.id} className="mb-4">
                <LiquidGlassHeader>
                  <StyledView className="flex-row justify-between items-start">
                    <StyledView>
                      <StyledText className="text-white font-semibold text-lg">
                        Order #{delivery.orderId.slice(-8)}
                      </StyledText>
                      <StyledText className="text-white/70 text-sm">
                        Tracking: {delivery.trackingId}
                      </StyledText>
                    </StyledView>
                    <StyledView className="items-end">
                      <Badge variant={getStatusColor(delivery.status)}>
                        <Ionicons 
                          name={getStatusIcon(delivery.status)} 
                          size={12} 
                          color="currentColor" 
                        />
                        <StyledText className="ml-1 capitalize">
                          {delivery.status.replace('_', ' ')}
                        </StyledText>
                      </Badge>
                    </StyledView>
                  </StyledView>
                </LiquidGlassHeader>

                <LiquidGlassContent>
                  {/* Delivery Address */}
                  <StyledView className="mb-4">
                    <StyledView className="flex-row items-center mb-2">
                      <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
                      <StyledText className="text-white/80 font-medium ml-2">
                        Delivery Address
                      </StyledText>
                    </StyledView>
                    <StyledText className="text-white text-sm">
                      {delivery.address}
                    </StyledText>
                  </StyledView>

                  {/* Order Items */}
                  <StyledView className="mb-4">
                    <StyledText className="text-white/80 font-medium mb-2">
                      Items ({delivery.order.items.length})
                    </StyledText>
                    {delivery.order.items.slice(0, 2).map((item, index) => (
                      <StyledText key={index} className="text-white text-sm">
                        • {item.product.name} x{item.quantity}
                      </StyledText>
                    ))}
                    {delivery.order.items.length > 2 && (
                      <StyledText className="text-white/70 text-sm">
                        +{delivery.order.items.length - 2} more items
                      </StyledText>
                    )}
                  </StyledView>

                  {/* Courier Info */}
                  {delivery.courierName && (
                    <StyledView className="mb-4 p-3 bg-white/10 rounded-xl">
                      <StyledView className="flex-row items-center mb-1">
                        <Ionicons name="person" size={16} color="rgba(255,255,255,0.8)" />
                        <StyledText className="text-white/80 font-medium ml-2">
                          Delivery Agent
                        </StyledText>
                      </StyledView>
                      <StyledText className="text-white">
                        {delivery.courierName}
                      </StyledText>
                      {delivery.courierPhone && (
                        <StyledText className="text-white/70 text-sm">
                          {delivery.courierPhone}
                        </StyledText>
                      )}
                    </StyledView>
                  )}

                  {/* Delivery Times */}
                  <StyledView className="flex-row justify-between">
                    <StyledView>
                      <StyledText className="text-white/80 text-sm">
                        Total Amount
                      </StyledText>
                      <StyledText className="text-white font-bold">
                        ${delivery.order.total.toFixed(2)}
                      </StyledText>
                    </StyledView>
                    {delivery.estimatedDelivery && (
                      <StyledView className="items-end">
                        <StyledText className="text-white/80 text-sm">
                          Estimated Delivery
                        </StyledText>
                        <StyledText className="text-white text-sm">
                          {new Date(delivery.estimatedDelivery).toLocaleDateString()}
                        </StyledText>
                      </StyledView>
                    )}
                  </StyledView>
                </LiquidGlassContent>
              </LiquidGlassCard>
            ))
          )}
        </StyledScrollView>
      </LinearGradient>
    </StyledSafeAreaView>
  );
};