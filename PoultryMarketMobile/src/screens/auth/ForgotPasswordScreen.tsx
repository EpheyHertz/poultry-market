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
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface ForgotPasswordScreenProps {
  navigation: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to send reset email');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <StyledSafeAreaView className="flex-1 bg-gradient-to-br from-green-50 to-blue-50">
        <StyledView className="flex-1 justify-center px-4">
          <Card className="mx-4">
            <CardContent className="items-center py-8">
              <StyledView className="bg-green-100 rounded-full p-4 mb-4">
                <Ionicons name="mail" size={40} color="#16a34a" />
              </StyledView>
              <StyledText className="text-2xl font-bold text-gray-900 mb-4 text-center">
                Check Your Email
              </StyledText>
              <StyledText className="text-gray-600 text-center mb-6">
                We've sent a password reset link to{' '}
                <StyledText className="font-semibold">{email}</StyledText>
              </StyledText>
              <StyledText className="text-sm text-gray-500 text-center mb-6">
                The link will expire in 1 hour for security reasons.
              </StyledText>
              <Button
                title="Back to Login"
                onPress={() => navigation.navigate('Login')}
                className="w-full"
              />
              <TouchableOpacity
                onPress={() => setIsSubmitted(false)}
                className="mt-4"
              >
                <StyledText className="text-primary-600 text-center">
                  Send Another Email
                </StyledText>
              </TouchableOpacity>
            </CardContent>
          </Card>
        </StyledView>
      </StyledSafeAreaView>
    );
  }

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
              <StyledView className="bg-red-600 rounded-full p-4 mb-4">
                <Ionicons name="lock-closed" size={40} color="white" />
              </StyledView>
              <StyledText className="text-3xl font-bold text-gray-900 mb-2">
                Forgot Password?
              </StyledText>
              <StyledText className="text-gray-600 text-center">
                Enter your email to receive a reset link
              </StyledText>
            </StyledView>

            {/* Form */}
            <Card className="mx-4">
              <CardHeader>
                <StyledText className="text-xl font-semibold text-center">
                  Reset Password
                </StyledText>
              </CardHeader>
              <CardContent>
                <StyledView className="space-y-4">
                  <Input
                    label="Email Address"
                    placeholder="Enter your email address"
                    value={email}
                    onChangeText={setEmail}
                    leftIcon="mail"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />

                  <Button
                    title="Send Reset Link"
                    onPress={handleSubmit}
                    loading={isLoading}
                    className="mt-6"
                  />
                </StyledView>
              </CardContent>
            </Card>

            {/* Back to Login */}
            <StyledView className="flex-row justify-center mt-6">
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                className="flex-row items-center"
              >
                <Ionicons name="arrow-back" size={16} color="#16a34a" />
                <StyledText className="text-primary-600 font-semibold ml-2">
                  Back to Login
                </StyledText>
              </TouchableOpacity>
            </StyledView>
          </StyledView>
        </StyledScrollView>
      </KeyboardAvoidingView>
    </StyledSafeAreaView>
  );
};