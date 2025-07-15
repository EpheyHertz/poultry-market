import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

interface LiquidButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'glass' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const LiquidButton: React.FC<LiquidButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2';
      case 'lg':
        return 'px-8 py-4';
      default:
        return 'px-6 py-3';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const isDisabled = disabled || loading;

  if (variant === 'glass') {
    return (
      <StyledTouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        className={`
          ${getSizeStyles()}
          rounded-2xl
          overflow-hidden
          ${isDisabled ? 'opacity-50' : ''}
          ${className || ''}
        `}
      >
        <BlurView intensity={60} className="flex-row items-center justify-center">
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            className="absolute inset-0"
          />
          {loading && (
            <ActivityIndicator size="small" color="white" className="mr-2" />
          )}
          <StyledText className={`${getTextSize()} font-semibold text-white text-center`}>
            {title}
          </StyledText>
        </BlurView>
      </StyledTouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <StyledTouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        className={`
          ${getSizeStyles()}
          rounded-2xl
          border-2
          border-white/30
          bg-transparent
          flex-row
          items-center
          justify-center
          ${isDisabled ? 'opacity-50' : ''}
          ${className || ''}
        `}
      >
        {loading && (
          <ActivityIndicator size="small" color="white" className="mr-2" />
        )}
        <StyledText className={`${getTextSize()} font-semibold text-white text-center`}>
          {title}
        </StyledText>
      </StyledTouchableOpacity>
    );
  }

  const gradientColors = variant === 'secondary' 
    ? ['#6b7280', '#4b5563'] 
    : ['#16a34a', '#15803d'];

  return (
    <StyledTouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`
        ${getSizeStyles()}
        rounded-2xl
        overflow-hidden
        shadow-lg
        ${isDisabled ? 'opacity-50' : ''}
        ${className || ''}
      `}
    >
      <LinearGradient
        colors={gradientColors}
        className="flex-row items-center justify-center"
      >
        {loading && (
          <ActivityIndicator size="small" color="white" className="mr-2" />
        )}
        <StyledText className={`${getTextSize()} font-semibold text-white text-center`}>
          {title}
        </StyledText>
      </LinearGradient>
    </StyledTouchableOpacity>
  );
};