import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface CustomerDashboardProps {
  navigation: any;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ navigation }) => {
  const { user, logout } = useAuthStore();

  const quickActions = [
    {
      title: 'Browse Products',
      description: 'Find fresh farm products',
      icon: 'storefront',
      onPress: () => navigation.navigate('Products'),
    },
    {
      title: 'My Orders',
      description: 'Track your orders',
      icon: 'receipt',
      onPress: () => navigation.navigate('Orders'),
    },
    {
      title: 'Apply for Role',
      description: 'Become a seller or company',
      icon: 'document-text',
      onPress: () => navigation.navigate('Applications'),
    },
    {
      title: 'Profile',
      description: 'Update your information',
      icon: 'person',
      onPress: () => navigation.navigate('Profile'),
    },
  ];

  return (
    <StyledSafeAreaView className="flex-1 bg-gray-50">
      <StyledScrollView className="flex-1">
        {/* Header */}
        <StyledView className="bg-primary-600 px-4 py-6">
          <StyledView className="flex-row justify-between items-center">
            <StyledView>
              <StyledText className="text-white text-lg font-semibold">
                Welcome back,
              </StyledText>
              <StyledText className="text-white text-2xl font-bold">
                {user?.name}!
              </StyledText>
            </StyledView>
            <Button
              title="Logout"
              variant="outline"
              size="sm"
              onPress={logout}
              className="border-white"
            />
          </StyledView>
        </StyledView>

        {/* Quick Actions */}
        <StyledView className="px-4 py-6">
          <StyledText className="text-xl font-bold text-gray-900 mb-4">
            Quick Actions
          </StyledText>
          <StyledView className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <Card key={index} className="mb-4">
                <CardContent className="p-4">
                  <StyledView className="items-center">
                    <StyledView className="bg-primary-100 rounded-full p-3 mb-3">
                      <Ionicons
                        name={action.icon as any}
                        size={24}
                        color="#16a34a"
                      />
                    </StyledView>
                    <StyledText className="text-center font-semibold text-gray-900 mb-1">
                      {action.title}
                    </StyledText>
                    <StyledText className="text-center text-sm text-gray-600 mb-3">
                      {action.description}
                    </StyledText>
                    <Button
                      title="Open"
                      size="sm"
                      onPress={action.onPress}
                      className="w-full"
                    />
                  </StyledView>
                </CardContent>
              </Card>
            ))}
          </StyledView>
        </StyledView>

        {/* Recent Activity */}
        <StyledView className="px-4 pb-6">
          <StyledText className="text-xl font-bold text-gray-900 mb-4">
            Recent Activity
          </StyledText>
          <Card>
            <CardContent className="p-4">
              <StyledView className="items-center py-8">
                <Ionicons name="time" size={48} color="#9ca3af" />
                <StyledText className="text-gray-500 text-center mt-2">
                  No recent activity
                </StyledText>
                <StyledText className="text-gray-400 text-sm text-center mt-1">
                  Start shopping to see your activity here
                </StyledText>
              </StyledView>
            </CardContent>
          </Card>
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};