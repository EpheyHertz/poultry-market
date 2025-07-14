import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      // Navigation will be handled by the auth state change
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'Please check your credentials and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-gradient-to-br from-green-50 to-blue-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <StyledScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          className="px-4"
        >
          <StyledView className="flex-1 justify-center py-8">
            {/* Header */}
            <StyledView className="items-center mb-8">
              <StyledView className="bg-primary-600 rounded-full p-4 mb-4">
                <Ionicons name="storefront" size={40} color="white" />
              </StyledView>
              <StyledText className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back
              </StyledText>
              <StyledText className="text-gray-600 text-center">
                Sign in to your PoultryMarket account
              </StyledText>
            </StyledView>

            {/* Login Form */}
            <Card className="mx-4">
              <CardHeader>
                <StyledText className="text-xl font-semibold text-center">
                  Sign In
                </StyledText>
              </CardHeader>
              <CardContent>
                <StyledView className="space-y-4">
                  <Input
                    label="Email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    error={errors.email}
                    leftIcon="mail"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />

                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    error={errors.password}
                    leftIcon="lock-closed"
                    secureTextEntry
                    autoComplete="password"
                  />

                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    className="self-end"
                  >
                    <StyledText className="text-primary-600 text-sm">
                      Forgot Password?
                    </StyledText>
                  </TouchableOpacity>

                  <Button
                    title="Sign In"
                    onPress={handleLogin}
                    loading={isLoading}
                    className="mt-6"
                  />
                </StyledView>
              </CardContent>
            </Card>

            {/* Demo Accounts */}
            <Card className="mx-4 mt-4">
              <CardHeader>
                <StyledText className="text-sm font-medium text-center text-gray-700">
                  Demo Accounts
                </StyledText>
              </CardHeader>
              <CardContent>
                <StyledView className="space-y-2">
                  <StyledText className="text-xs text-gray-600">
                    <StyledText className="font-semibold">Admin:</StyledText> admin@poultry.com / password123
                  </StyledText>
                  <StyledText className="text-xs text-gray-600">
                    <StyledText className="font-semibold">Company:</StyledText> company@poultry.com / password123
                  </StyledText>
                  <StyledText className="text-xs text-gray-600">
                    <StyledText className="font-semibold">Seller:</StyledText> seller@poultry.com / password123
                  </StyledText>
                  <StyledText className="text-xs text-gray-600">
                    <StyledText className="font-semibold">Customer:</StyledText> customer@poultry.com / password123
                  </StyledText>
                </StyledView>
              </CardContent>
            </Card>

            {/* Sign Up Link */}
            <StyledView className="flex-row justify-center mt-6">
              <StyledText className="text-gray-600">
                Don't have an account?{' '}
              </StyledText>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <StyledText className="text-primary-600 font-semibold">
                  Sign Up
                </StyledText>
              </TouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
};