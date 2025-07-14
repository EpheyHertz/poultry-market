import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { CustomerDashboard } from '../screens/customer/CustomerDashboard';
import { ProductsScreen } from '../screens/customer/ProductsScreen';
import { ProductDetailScreen } from '../screens/customer/ProductDetailScreen';
import { CartScreen } from '../screens/customer/CartScreen';
import { CheckoutScreen } from '../screens/customer/CheckoutScreen';
import { OrdersScreen } from '../screens/customer/OrdersScreen';
import { ApplicationsScreen } from '../screens/customer/ApplicationsScreen';
import { ProfileScreen } from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ProductsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProductsList" component={ProductsScreen} />
    <Stack.Screen name="Product" component={ProductDetailScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
  </Stack.Navigator>
);

const OrdersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OrdersList" component={OrdersScreen} />
  </Stack.Navigator>
);

const ApplicationsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ApplicationsList" component={ApplicationsScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
  </Stack.Navigator>
);

export const CustomerNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Products') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Applications') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={CustomerDashboard} />
      <Tab.Screen name="Products" component={ProductsStack} />
      <Tab.Screen name="Orders" component={OrdersStack} />
      <Tab.Screen name="Applications" component={ApplicationsStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};