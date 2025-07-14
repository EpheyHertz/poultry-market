import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#16a34a',
  className,
}) => {
  return (
    <StyledView className={`flex-1 justify-center items-center ${className || ''}`}>
      <ActivityIndicator size={size} color={color} />
    </StyledView>
  );
};