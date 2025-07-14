import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

const StyledView = styled(View);
const StyledSafeAreaView = styled(SafeAreaView);

export const LoadingScreen: React.FC = () => {
  return (
    <StyledSafeAreaView className="flex-1 bg-white">
      <StyledView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#16a34a" />
      </StyledView>
    </StyledSafeAreaView>
  );
};