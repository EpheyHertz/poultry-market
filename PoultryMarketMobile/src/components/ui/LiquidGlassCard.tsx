import React, { ReactNode } from 'react';
import { View, ViewProps } from 'react-native';
import { styled } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

const StyledView = styled(View);

interface LiquidGlassCardProps extends ViewProps {
  children: ReactNode;
  intensity?: 'light' | 'medium' | 'strong';
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({ 
  children, 
  intensity = 'medium',
  className, 
  ...props 
}) => {
  const getGlassStyles = () => {
    switch (intensity) {
      case 'light':
        return 'bg-white/10';
      case 'strong':
        return 'bg-white/30';
      default:
        return 'bg-white/20';
    }
  };

  return (
    <StyledView
      className={`
        ${getGlassStyles()}
        backdrop-blur-xl
        rounded-2xl
        border
        border-white/20
        shadow-2xl
        ${className || ''}
      `}
      {...props}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        className="absolute inset-0 rounded-2xl"
      />
      {children}
    </StyledView>
  );
};

export const LiquidGlassHeader: React.FC<LiquidGlassCardProps> = ({ 
  children, 
  className, 
  ...props 
}) => {
  return (
    <StyledView 
      className={`p-4 border-b border-white/10 ${className || ''}`} 
      {...props}
    >
      {children}
    </StyledView>
  );
};

export const LiquidGlassContent: React.FC<LiquidGlassCardProps> = ({ 
  children, 
  className, 
  ...props 
}) => {
  return (
    <StyledView className={`p-4 ${className || ''}`} {...props}>
      {children}
    </StyledView>
  );
};