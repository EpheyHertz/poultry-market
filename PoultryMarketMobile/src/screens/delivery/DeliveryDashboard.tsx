import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { useAuthStore } from '../../stores/authStore';
import { LiquidGlassCard, LiquidGlassContent, LiquidGlassHeader } from '../../components/ui/LiquidGlassCard';
import { LiquidButton } from '../../components/ui/LiquidButton';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface DeliveryDashboardProps {
  navigation: any;
}

export const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { deliveries, loading, fetchDeliveries, updateDeliveryStatus } = useDeliveryStore();

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleStatusUpdate = (deliveryId: string, newStatus: string) => {
    Alert.alert(
      'Update Status',
      `Change delivery status to ${newStatus.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              await updateDeliveryStatus(deliveryId, newStatus);
              Alert.alert('Success', 'Delivery status updated successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      'processing': 'picked_up',
      'picked_up': 'in_transit',
      'in_transit': 'out_for_delivery',
      'out_for_delivery': 'delivered',
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

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

  const activeDeliveries = deliveries.filter(d => 
    !['delivered', 'failed'].includes(d.status)
  );

  const completedDeliveries = deliveries.filter(d => 
    ['delivered', 'failed'].includes(d.status)
  );

  if (loading && deliveries.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <StyledSafeAreaView className="flex-1">
      <LinearGradient
        colors={['#3b82f6', '#2563eb', '#1d4ed8']}
        className="flex-1"
      >
        {/* Header */}
        <StyledView className="px-4 py-6">
          <StyledText className="text-white text-2xl font-bold">
            Delivery Dashboard
          </StyledText>
          <StyledText className="text-white/80 mt-1">
            Welcome back, {user?.name}
          </StyledText>
        </StyledView>

        {/* Stats Cards */}
        <StyledView className="px-4 mb-6">
          <StyledView className="flex-row space-x-4">
            <LiquidGlassCard className="flex-1">
              <LiquidGlassContent className="items-center py-4">
                <Ionicons name="car" size={32} color="rgba(255,255,255,0.8)" />
                <StyledText className="text-white text-2xl font-bold mt-2">
                  {activeDeliveries.length}
                </StyledText>
                <StyledText className="text-white/70 text-sm">
                  Active Deliveries
                </StyledText>
              </LiquidGlassContent>
            </LiquidGlassCard>

            <LiquidGlassCard className="flex-1">
              <LiquidGlassContent className="items-center py-4">
                <Ionicons name="checkmark-done" size={32} color="rgba(255,255,255,0.8)" />
                <StyledText className="text-white text-2xl font-bold mt-2">
                  {completedDeliveries.length}
                </StyledText>
                <StyledText className="text-white/70 text-sm">
                  Completed Today
                </StyledText>
              </LiquidGlassContent>
            </LiquidGlassCard>
          </StyledView>
        </StyledView>

        <StyledScrollView className="flex-1 px-4">
          {/* Active Deliveries */}
          {activeDeliveries.length > 0 && (
            <StyledView className="mb-6">
              <StyledText className="text-white text-xl font-bold mb-4">
                Active Deliveries
              </StyledText>
              {activeDeliveries.map((delivery) => (
                <LiquidGlassCard key={delivery.id} className="mb-4">
                  <LiquidGlassHeader>
                    <StyledView className="flex-row justify-between items-start">
                      <StyledView>
                        <StyledText className="text-white font-semibold">
                          Order #{delivery.orderId.slice(-8)}
                        </StyledText>
                        <StyledText className="text-white/70 text-sm">
                          {delivery.order.customer.name}
                        </StyledText>
                      </StyledView>
                      <Badge variant={getStatusColor(delivery.status)}>
                        {delivery.status.replace('_', ' ')}
                      </Badge>
                    </StyledView>
                  </LiquidGlassHeader>

                  <LiquidGlassContent>
                    <StyledView className="mb-4">
                      <StyledView className="flex-row items-center mb-2">
                        <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
                        <StyledText className="text-white/80 ml-2">
                          Delivery Address
                        </StyledText>
                      </StyledView>
                      <StyledText className="text-white text-sm">
                        {delivery.address}
                      </StyledText>
                    </StyledView>

                    <StyledView className="flex-row justify-between items-center">
                      <StyledView>
                        <StyledText className="text-white/80 text-sm">
                          Total Amount
                        </StyledText>
                        <StyledText className="text-white font-bold">
                          ${delivery.order.total.toFixed(2)}
                        </StyledText>
                      </StyledView>

                      {getNextStatus(delivery.status) && (
                        <LiquidButton
                          title={`Mark as ${getNextStatus(delivery.status)?.replace('_', ' ')}`}
                          variant="glass"
                          size="sm"
                          onPress={() => handleStatusUpdate(delivery.id, getNextStatus(delivery.status)!)}
                        />
                      )}
                    </StyledView>
                  </LiquidGlassContent>
                </LiquidGlassCard>
              ))}
            </StyledView>
          )}

          {/* Recent Completed */}
          {completedDeliveries.length > 0 && (
            <StyledView className="mb-6">
              <StyledText className="text-white text-xl font-bold mb-4">
                Recent Completed
              </StyledText>
              {completedDeliveries.slice(0, 5).map((delivery) => (
                <LiquidGlassCard key={delivery.id} className="mb-4">
                  <LiquidGlassContent>
                    <StyledView className="flex-row justify-between items-center">
                      <StyledView>
                        <StyledText className="text-white font-semibold">
                          Order #{delivery.orderId.slice(-8)}
                        </StyledText>
                        <StyledText className="text-white/70 text-sm">
                          {delivery.order.customer.name}
                        </StyledText>
                      </StyledView>
                      <StyledView className="items-end">
                        <Badge variant={getStatusColor(delivery.status)}>
                          {delivery.status}
                        </Badge>
                        <StyledText className="text-white/70 text-xs mt-1">
                          ${delivery.order.total.toFixed(2)}
                        </StyledText>
                      </StyledView>
                    </StyledView>
                  </LiquidGlassContent>
                </LiquidGlassCard>
              ))}
            </StyledView>
          )}

          {deliveries.length === 0 && (
            <LiquidGlassCard>
              <LiquidGlassContent className="items-center py-12">
                <Ionicons name="car" size={64} color="rgba(255,255,255,0.6)" />
                <StyledText className="text-white text-lg text-center mt-4">
                  No deliveries assigned
                </StyledText>
                <StyledText className="text-white/70 text-center mt-2">
                  New delivery assignments will appear here
                </StyledText>
              </LiquidGlassContent>
            </LiquidGlassCard>
          )}
        </StyledScrollView>
      </LinearGradient>
    </StyledSafeAreaView>
  );
};