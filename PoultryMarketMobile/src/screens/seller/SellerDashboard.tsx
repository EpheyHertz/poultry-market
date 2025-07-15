import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import { apiService } from '../../services/api';
import { LiquidGlassCard, LiquidGlassContent, LiquidGlassHeader } from '../../components/ui/LiquidGlassCard';
import { LiquidButton } from '../../components/ui/LiquidButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface SellerDashboardProps {
  navigation: any;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Products',
      description: 'Manage eggs & meat',
      icon: 'cube',
      color: '#10b981',
      onPress: () => navigation.navigate('Products'),
    },
    {
      title: 'Orders',
      description: 'Process orders',
      icon: 'receipt',
      color: '#3b82f6',
      onPress: () => navigation.navigate('Orders'),
    },
    {
      title: 'Analytics',
      description: 'Sales insights',
      icon: 'analytics',
      color: '#8b5cf6',
      onPress: () => navigation.navigate('Analytics'),
    },
    {
      title: 'Vouchers',
      description: 'Create discounts',
      icon: 'ticket',
      color: '#f59e0b',
      onPress: () => navigation.navigate('Vouchers'),
    },
    {
      title: 'Sponsorships',
      description: 'Find sponsors',
      icon: 'heart',
      color: '#ef4444',
      onPress: () => navigation.navigate('Sponsorships'),
    },
    {
      title: 'QR Code',
      description: 'Share your farm',
      icon: 'qr-code',
      color: '#06b6d4',
      onPress: () => navigation.navigate('QRCode'),
    },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <StyledSafeAreaView className="flex-1">
      <LinearGradient
        colors={['#059669', '#047857', '#065f46']}
        className="flex-1"
      >
        {/* Header */}
        <StyledView className="px-4 py-6">
          <StyledText className="text-white text-2xl font-bold">
            Seller Dashboard
          </StyledText>
          <StyledText className="text-white/80 mt-1">
            Welcome back, {user?.name}
          </StyledText>
        </StyledView>

        <StyledScrollView
          className="flex-1 px-4"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchAnalytics} />
          }
        >
          {/* Analytics Cards */}
          {analytics && (
            <StyledView className="mb-6">
              <StyledView className="flex-row space-x-4 mb-4">
                <LiquidGlassCard className="flex-1">
                  <LiquidGlassContent className="items-center py-4">
                    <Ionicons name="trending-up" size={32} color="rgba(255,255,255,0.8)" />
                    <StyledText className="text-white text-2xl font-bold mt-2">
                      ${analytics.totalSales?.toFixed(2) || '0.00'}
                    </StyledText>
                    <StyledText className="text-white/70 text-sm">
                      Total Sales
                    </StyledText>
                  </LiquidGlassContent>
                </LiquidGlassCard>

                <LiquidGlassCard className="flex-1">
                  <LiquidGlassContent className="items-center py-4">
                    <Ionicons name="receipt" size={32} color="rgba(255,255,255,0.8)" />
                    <StyledText className="text-white text-2xl font-bold mt-2">
                      {analytics.orderCount || 0}
                    </StyledText>
                    <StyledText className="text-white/70 text-sm">
                      Orders
                    </StyledText>
                  </LiquidGlassContent>
                </LiquidGlassCard>
              </StyledView>

              <StyledView className="flex-row space-x-4">
                <LiquidGlassCard className="flex-1">
                  <LiquidGlassContent className="items-center py-4">
                    <Ionicons name="cube" size={32} color="rgba(255,255,255,0.8)" />
                    <StyledText className="text-white text-2xl font-bold mt-2">
                      {analytics.productCount || 0}
                    </StyledText>
                    <StyledText className="text-white/70 text-sm">
                      Products
                    </StyledText>
                  </LiquidGlassContent>
                </LiquidGlassCard>

                <LiquidGlassCard className="flex-1">
                  <LiquidGlassContent className="items-center py-4">
                    <Ionicons name="star" size={32} color="rgba(255,255,255,0.8)" />
                    <StyledText className="text-white text-2xl font-bold mt-2">
                      4.8
                    </StyledText>
                    <StyledText className="text-white/70 text-sm">
                      Rating
                    </StyledText>
                  </LiquidGlassContent>
                </LiquidGlassCard>
              </StyledView>
            </StyledView>
          )}

          {/* Quick Actions */}
          <StyledView className="mb-6">
            <StyledText className="text-white text-xl font-bold mb-4">
              Quick Actions
            </StyledText>
            <StyledView className="flex-row flex-wrap justify-between">
              {quickActions.map((action, index) => (
                <StyledView key={index} className="w-[48%] mb-4">
                  <LiquidGlassCard>
                    <LiquidGlassContent className="items-center py-6">
                      <StyledView 
                        className="w-12 h-12 rounded-full items-center justify-center mb-3"
                        style={{ backgroundColor: action.color + '40' }}
                      >
                        <Ionicons
                          name={action.icon as any}
                          size={24}
                          color={action.color}
                        />
                      </StyledView>
                      <StyledText className="text-white font-semibold text-center mb-1">
                        {action.title}
                      </StyledText>
                      <StyledText className="text-white/70 text-xs text-center mb-3">
                        {action.description}
                      </StyledText>
                      <LiquidButton
                        title="Open"
                        variant="glass"
                        size="sm"
                        onPress={action.onPress}
                      />
                    </LiquidGlassContent>
                  </LiquidGlassCard>
                </StyledView>
              ))}
            </StyledView>
          </StyledView>

          {/* Farm Stats */}
          <LiquidGlassCard className="mb-6">
            <LiquidGlassHeader>
              <StyledText className="text-white text-lg font-semibold">
                Farm Performance
              </StyledText>
            </LiquidGlassHeader>
            <LiquidGlassContent>
              <StyledView className="flex-row justify-between items-center mb-4">
                <StyledView>
                  <StyledText className="text-white/80 text-sm">
                    Fulfillment Rate
                  </StyledText>
                  <StyledText className="text-white text-lg font-bold">
                    {analytics?.fulfillmentRate || 95}%
                  </StyledText>
                </StyledView>
                <StyledView className="items-end">
                  <StyledText className="text-white/80 text-sm">
                    Average Order Value
                  </StyledText>
                  <StyledText className="text-white text-lg font-bold">
                    ${analytics?.averageOrderValue?.toFixed(2) || '0.00'}
                  </StyledText>
                </StyledView>
              </StyledView>
              
              <StyledView className="bg-white/10 rounded-xl p-3">
                <StyledText className="text-white/80 text-sm mb-2">
                  Top Products This Month
                </StyledText>
                {analytics?.topProducts?.slice(0, 3).map((product: any, index: number) => (
                  <StyledView key={index} className="flex-row justify-between items-center py-1">
                    <StyledText className="text-white text-sm">
                      {product.name}
                    </StyledText>
                    <StyledText className="text-white/70 text-sm">
                      {product.totalSold} sold
                    </StyledText>
                  </StyledView>
                )) || (
                  <StyledText className="text-white/70 text-sm">
                    No sales data available
                  </StyledText>
                )}
              </StyledView>
            </LiquidGlassContent>
          </LiquidGlassCard>
        </StyledScrollView>
      </LinearGradient>
    </StyledSafeAreaView>
  );
};