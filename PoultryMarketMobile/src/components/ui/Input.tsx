import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, TextInputProps } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledTextInput = styled(TextInput);
const StyledText = styled(Text);

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerClassName,
  className,
  secureTextEntry,
  ...props
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const toggleSecureEntry = () => {
    setIsSecure(!isSecure);
  };

  const handleRightIconPress = () => {
    if (secureTextEntry) {
      toggleSecureEntry();
    } else if (onRightIconPress) {
      onRightIconPress();
    }
  };

  const getRightIcon = () => {
    if (secureTextEntry) {
      return isSecure ? 'eye-off' : 'eye';
    }
    return rightIcon;
  };

  return (
    <StyledView className={`${containerClassName || ''}`}>
      {label && (
        <StyledText className="text-gray-700 text-sm font-medium mb-2">
          {label}
        </StyledText>
      )}
      
      <StyledView className="relative">
        <StyledTextInput
          className={`
            border border-gray-300 rounded-lg px-4 py-3 text-gray-900
            ${leftIcon ? 'pl-12' : ''}
            ${rightIcon || secureTextEntry ? 'pr-12' : ''}
            ${error ? 'border-red-500' : 'focus:border-primary-500'}
            ${className || ''}
          `}
          secureTextEntry={isSecure}
          {...props}
        />
        
        {leftIcon && (
          <StyledView className="absolute left-3 top-3">
            <Ionicons name={leftIcon} size={20} color="#6b7280" />
          </StyledView>
        )}
        
        {(rightIcon || secureTextEntry) && (
          <TouchableOpacity
            className="absolute right-3 top-3"
            onPress={handleRightIconPress}
          >
            <Ionicons name={getRightIcon()} size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </StyledView>
      
      {error && (
        <StyledText className="text-red-500 text-sm mt-1">
          {error}
        </StyledText>
      )}
    </StyledView>
  );
};