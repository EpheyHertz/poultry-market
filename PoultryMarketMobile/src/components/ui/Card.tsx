import React, { ReactNode } from 'react';
import { View, ViewProps } from 'react-native';
import { styled } from 'nativewind';

const StyledView = styled(View);

interface CardProps extends ViewProps {
  children: ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <StyledView
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className || ''}`}
      {...props}
    >
      {children}
    </StyledView>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <StyledView className={`p-4 border-b border-gray-200 ${className || ''}`} {...props}>
      {children}
    </StyledView>
  );
};

export const CardContent: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <StyledView className={`p-4 ${className || ''}`} {...props}>
      {children}
    </StyledView>
  );
};

export const CardFooter: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <StyledView className={`p-4 border-t border-gray-200 ${className || ''}`} {...props}>
      {children}
    </StyledView>
  );
};