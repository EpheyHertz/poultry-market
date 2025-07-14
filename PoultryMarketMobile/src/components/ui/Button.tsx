import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { styled } from 'nativewind';

const StyledTouchableOpacity = styled(TouchableOpacity);
const StyledText = styled(Text);

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-600 active:bg-primary-700';
      case 'secondary':
        return 'bg-gray-600 active:bg-gray-700';
      case 'outline':
        return 'border-2 border-primary-600 bg-transparent active:bg-primary-50';
      case 'ghost':
        return 'bg-transparent active:bg-gray-100';
      default:
        return 'bg-primary-600 active:bg-primary-700';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2';
      case 'md':
        return 'px-4 py-3';
      case 'lg':
        return 'px-6 py-4';
      default:
        return 'px-4 py-3';
    }
  };

  const getTextVariantStyles = () => {
    switch (variant) {
      case 'primary':
      case 'secondary':
        return 'text-white';
      case 'outline':
        return 'text-primary-600';
      case 'ghost':
        return 'text-gray-700';
      default:
        return 'text-white';
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'md':
        return 'text-base';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const isDisabled = disabled || loading;

  return (
    <StyledTouchableOpacity
      className={`
        ${getVariantStyles()}
        ${getSizeStyles()}
        rounded-lg
        flex-row
        items-center
        justify-center
        ${isDisabled ? 'opacity-50' : ''}
        ${className || ''}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#16a34a' : 'white'}
          className="mr-2"
        />
      )}
      <StyledText
        className={`
          ${getTextVariantStyles()}
          ${getTextSizeStyles()}
          font-semibold
          text-center
        `}
      >
        {title}
      </StyledText>
    </StyledTouchableOpacity>
  );
};