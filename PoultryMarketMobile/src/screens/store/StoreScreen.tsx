import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Share } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useCartStore } from '../../stores/cartStore';
import { LiquidGlassCard, LiquidGlassContent, LiquidGlassHeader } from '../../components/ui/LiquidGlassCard';
import { LiquidButton } from '../../components/ui/LiquidButton';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ProductCard } from '../../components/ProductCard';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface StoreScreenProps {
  navigation: any;
}

export const StoreScreen: React.FC<StoreScreenProps> = ({ navigation }) => {
  const route = useRoute();
  const { slug } = route.params as { slug: string };
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    fetchStore();
  }, [slug]);

  const fetchStore = async () => {
    try {
      setLoading(true);
      const [storeData, productsData] = await Promise.all([
        apiService.getStoreBySlug(slug),
        apiService.getProducts({ sellerId: slug })
      ]);
      setStore(storeData);
      setProducts(productsData.products);
    } catch (error) {
      console.error('Failed to fetch store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${store.name} on PoultryMarket!`,
        url: `https://poultrymarket.com/store/${slug}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleAddToCart = (product: any) => {
    addItem(product);
  };

  const getTagIcon = (tag: string) => {
    const icons = {
      VERIFIED: 'shield-checkmark',
      TRUSTED: 'star',
      RECOMMENDED: 'thumbs-up',
      PREMIUM: 'diamond',
      FEATURED: 'flash',
      ORGANIC: 'leaf',
      LOCAL: 'location',
      BESTSELLER: 'trending-up',
    };
    return icons[tag as keyof typeof icons] || 'checkmark-circle';
  };

  const getTagColor = (tag: string) => {
    const colors = {
      VERIFIED: 'info',
      TRUSTED: 'success',
      RECOMMENDED: 'default',
      PREMIUM: 'warning',
      FEATURED: 'error',
      ORGANIC: 'success',
      LOCAL: 'info',
      BESTSELLER: 'warning',
    };
    return colors[tag as keyof typeof colors] || 'default';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!store) {
    return (
      <StyledSafeAreaView className="flex-1 bg-red-500">
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle" size={64} color="white" />
          <StyledText className="text-white text-xl font-bold mt-4">
            Store Not Found
          </StyledText>
          <StyledText className="text-white/80 text-center mt-2">
            The store you're looking for doesn't exist or has been removed.
          </StyledText>
          <LiquidButton
            title="Go Back"
            variant="glass"
            onPress={() => navigation.goBack()}
            className="mt-6"
          />
        </StyledView>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1">
      <LinearGradient
        colors={store.role === 'COMPANY' ? ['#1e40af', '#1d4ed8'] : ['#059669', '#047857']}
        className="flex-1"
      >
        {/* Header */}
        <StyledView className="flex-row items-center justify-between px-4 py-4">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <StyledText className="text-white text-lg font-semibold">
            Store
          </StyledText>
          <TouchableOpacity onPress={handleShare}>
            <Ionicons name="share" size={24} color="white" />
          </TouchableOpacity>
        </StyledView>

        <StyledScrollView className="flex-1">
          {/* Store Header */}
          <StyledView className="px-4 pb-6">
            <LiquidGlassCard>
              <LiquidGlassContent className="items-center py-6">
                {/* Store Avatar */}
                <StyledView className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
                  {store.avatar ? (
                    <Image
                      source={{ uri: store.avatar }}
                      className="w-full h-full rounded-full"
                    />
                  ) : (
                    <StyledText className="text-white text-2xl font-bold">
                      {store.name.charAt(0).toUpperCase()}
                    </StyledText>
                  )}
                </StyledView>

                {/* Store Name */}
                <StyledText className="text-white text-2xl font-bold text-center mb-2">
                  {store.name}
                </StyledText>

                {/* Store Type */}
                <Badge variant={store.role === 'COMPANY' ? 'info' : 'success'} className="mb-3">
                  {store.role === 'COMPANY' ? 'Company' : 'Farm Seller'}
                </Badge>

                {/* Store Tags */}
                {store.tags && store.tags.length > 0 && (
                  <StyledView className="flex-row flex-wrap justify-center mb-4">
                    {store.tags.map((tagData: any, index: number) => (
                      <Badge 
                        key={index} 
                        variant={getTagColor(tagData.tag)}
                        className="m-1"
                      >
                        <Ionicons 
                          name={getTagIcon(tagData.tag)} 
                          size={12} 
                          color="currentColor" 
                        />
                        <StyledText className="ml-1">
                          {tagData.tag}
                        </StyledText>
                      </Badge>
                    ))}
                  </StyledView>
                )}

                {/* Store Description */}
                {store.bio && (
                  <StyledText className="text-white/80 text-center mb-4">
                    {store.bio}
                  </StyledText>
                )}

                {/* Store Info */}
                <StyledView className="w-full">
                  {store.location && (
                    <StyledView className="flex-row items-center justify-center mb-2">
                      <Ionicons name="location" size={16} color="rgba(255,255,255,0.8)" />
                      <StyledText className="text-white/80 ml-2">
                        {store.location}
                      </StyledText>
                    </StyledView>
                  )}

                  {store.phone && (
                    <StyledView className="flex-row items-center justify-center mb-2">
                      <Ionicons name="call" size={16} color="rgba(255,255,255,0.8)" />
                      <StyledText className="text-white/80 ml-2">
                        {store.phone}
                      </StyledText>
                    </StyledView>
                  )}

                  {store.website && (
                    <StyledView className="flex-row items-center justify-center">
                      <Ionicons name="globe" size={16} color="rgba(255,255,255,0.8)" />
                      <StyledText className="text-white/80 ml-2">
                        {store.website}
                      </StyledText>
                    </StyledView>
                  )}
                </StyledView>
              </LiquidGlassContent>
            </LiquidGlassCard>
          </StyledView>

          {/* Products Section */}
          <StyledView className="px-4">
            <StyledView className="flex-row justify-between items-center mb-4">
              <StyledText className="text-white text-xl font-bold">
                Products ({products.length})
              </StyledText>
              {products.length > 0 && (
                <TouchableOpacity>
                  <StyledText className="text-white/80">
                    View All
                  </StyledText>
                </TouchableOpacity>
              )}
            </StyledView>

            {products.length === 0 ? (
              <LiquidGlassCard>
                <LiquidGlassContent className="items-center py-12">
                  <Ionicons name="cube" size={64} color="rgba(255,255,255,0.6)" />
                  <StyledText className="text-white text-lg text-center mt-4">
                    No Products Available
                  </StyledText>
                  <StyledText className="text-white/70 text-center mt-2">
                    This store hasn't added any products yet
                  </StyledText>
                </LiquidGlassContent>
              </LiquidGlassCard>
            ) : (
              <StyledView className="flex-row flex-wrap justify-between">
                {products.map((product) => (
                  <StyledView key={product.id} className="w-[48%] mb-4">
                    <ProductCard
                      product={product}
                      onPress={() => navigation.navigate('Product', { productId: product.id })}
                      onAddToCart={() => handleAddToCart(product)}
                    />
                  </StyledView>
                ))}
              </StyledView>
            )}
          </StyledView>

          {/* Contact Actions */}
          <StyledView className="px-4 py-6">
            <LiquidGlassCard>
              <LiquidGlassHeader>
                <StyledText className="text-white text-lg font-semibold text-center">
                  Contact Store
                </StyledText>
              </LiquidGlassHeader>
              <LiquidGlassContent>
                <StyledView className="flex-row space-x-4">
                  <LiquidButton
                    title="Message"
                    variant="glass"
                    onPress={() => {/* Navigate to chat */}}
                    className="flex-1"
                  />
                  {store.phone && (
                    <LiquidButton
                      title="Call"
                      variant="outline"
                      onPress={() => {/* Make phone call */}}
                      className="flex-1"
                    />
                  )}
                </StyledView>
              </LiquidGlassContent>
            </LiquidGlassCard>
          </StyledView>
        </StyledScrollView>
      </LinearGradient>
    </StyledSafeAreaView>
  );
};