import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../stores/cartStore';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface CartIconProps {
  onPress: () => void;
  color?: string;
}

export const CartIcon: React.FC<CartIconProps> = ({ onPress, color = '#16a34a' }) => {
  const itemCount = useCartStore(state => state.getItemCount());

  return (
    <StyledTouchableOpacity onPress={onPress} className="relative p-2">
      <Ionicons name="cart" size={24} color={color} />
      {itemCount > 0 && (
        <StyledView className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-5 h-5 justify-center items-center">
          <StyledText className="text-white text-xs font-bold">
            {itemCount > 99 ? '99+' : itemCount}
          </StyledText>
        </StyledView>
      )}
    </StyledTouchableOpacity>
  );
};