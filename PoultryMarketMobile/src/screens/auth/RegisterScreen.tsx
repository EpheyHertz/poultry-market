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
import { Picker } from '@react-native-picker/picker';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { register } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'CUSTOMER',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        role: formData.role,
      });

      Alert.alert(
        'Registration Successful',
        'Please check your email to verify your account before logging in.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.message || 'Please try again.',
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

  const roleOptions = [
    { label: 'Customer - Buy products', value: 'CUSTOMER' },
    { label: 'Seller - Sell eggs & meat', value: 'SELLER' },
    { label: 'Company - Sell feeds & chicks', value: 'COMPANY' },
  ];

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
                <Ionicons name="person-add" size={40} color="white" />
              </StyledView>
              <StyledText className="text-3xl font-bold text-gray-900 mb-2">
                Create Account
              </StyledText>
              <StyledText className="text-gray-600 text-center">
                Join PoultryMarket today
              </StyledText>
            </StyledView>

            {/* Registration Form */}
            <Card className="mx-4">
              <CardHeader>
                <StyledText className="text-xl font-semibold text-center">
                  Sign Up
                </StyledText>
              </CardHeader>
              <CardContent>
                <StyledView className="space-y-4">
                  <Input
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                    error={errors.name}
                    leftIcon="person"
                    autoComplete="name"
                  />

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
                    label="Phone (Optional)"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChangeText={(value) => handleInputChange('phone', value)}
                    leftIcon="call"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />

                  <StyledView>
                    <StyledText className="text-gray-700 text-sm font-medium mb-2">
                      Account Type
                    </StyledText>
                    <StyledView className="border border-gray-300 rounded-lg">
                      <Picker
                        selectedValue={formData.role}
                        onValueChange={(value) => handleInputChange('role', value)}
                        style={{ height: 50 }}
                      >
                        {roleOptions.map((option) => (
                          <Picker.Item
                            key={option.value}
                            label={option.label}
                            value={option.value}
                          />
                        ))}
                      </Picker>
                    </StyledView>
                  </StyledView>

                  <Input
                    label="Password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    error={errors.password}
                    leftIcon="lock-closed"
                    secureTextEntry
                    autoComplete="password-new"
                  />

                  <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange('confirmPassword', value)}
                    error={errors.confirmPassword}
                    leftIcon="lock-closed"
                    secureTextEntry
                    autoComplete="password-new"
                  />

                  <Button
                    title="Create Account"
                    onPress={handleRegister}
                    loading={isLoading}
                    className="mt-6"
                  />
                </StyledView>
              </CardContent>
            </Card>

            {/* Sign In Link */}
            <StyledView className="flex-row justify-center mt-6">
              <StyledText className="text-gray-600">
                Already have an account?{' '}
              </StyledText>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <StyledText className="text-primary-600 font-semibold">
                  Sign In
                </StyledText>
              </TouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
};