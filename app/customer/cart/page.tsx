
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    stock: number;
    type: string;
    seller: {
      id: string;
      name: string;
      role: string;
    };
  };
}

export default function CustomerCart() {
  const [user, setUser] = useState<any>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'CUSTOMER') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchCartItems();
    }
  }, [user]);

  const fetchCartItems = async () => {
    try {
      const response = await fetch('/api/cart');
      if (response.ok) {
        const items = await response.json();
        setCartItems(items);
      } else {
        toast.error('Failed to fetch cart items');
      }
    } catch (error) {
      toast.error('An error occurred while fetching cart');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeItem(cartItemId);
      return;
    }

    setUpdatingItems(prev => new Set(prev).add(cartItemId));
    
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItemId,
          quantity: newQuantity,
        }),
      });

      if (response.ok) {
        setCartItems(items =>
          items.map(item =>
            item.id === cartItemId
              ? { ...item, quantity: newQuantity }
              : item
          )
        );
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update quantity');
      }
    } catch (error) {
      toast.error('An error occurred while updating quantity');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(cartItemId);
        return newSet;
      });
    }
  };

  const removeItem = async (cartItemId: string) => {
    setUpdatingItems(prev => new Set(prev).add(cartItemId));
    
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cartItemId }),
      });

      if (response.ok) {
        setCartItems(items => items.filter(item => item.id !== cartItemId));
        toast.success('Item removed from cart');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove item');
      }
    } catch (error) {
      toast.error('An error occurred while removing item');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(cartItemId);
        return newSet;
      });
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const proceedToCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // For now, we'll handle single item checkout (first item in cart)
    // TODO: Implement multi-item cart checkout sessions
    const firstItem = cartItems[0];
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: firstItem.product.id,
          quantity: firstItem.quantity,
          paymentType: 'BEFORE_DELIVERY'
        })
      });

      if (response.ok) {
        const { sessionId } = await response.json();
        router.push(`/customer/checkout?session=${sessionId}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create checkout session');
      }
    } catch (error) {
      toast.error('Failed to proceed to checkout');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EGGS': return 'bg-yellow-100 text-yellow-800';
      case 'CHICKEN_MEAT': return 'bg-red-100 text-red-800';
      case 'CHICKEN_FEED': return 'bg-green-100 text-green-800';
      case 'CHICKS': return 'bg-orange-100 text-orange-800';
      case 'HATCHING_EGGS': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="mr-3 h-8 w-8" />
            My Cart
          </h1>
          <p className="text-gray-600 mt-2">Review and manage your cart items</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : cartItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-500 mb-6">Start shopping to add items to your cart</p>
              <Button onClick={() => router.push('/customer/products')}>
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cart Items ({cartItems.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                          {item.product.images.length > 0 ? (
                            <Image
                              src={item.product.images[0]}
                              alt={item.product.name}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          by {item.product.seller.name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getTypeColor(item.product.type)}>
                            {item.product.type}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Stock: {item.product.stock}
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-green-600 mt-1">
                          Ksh {item.product.price.toFixed(2)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updatingItems.has(item.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            if (newQuantity <= item.product.stock) {
                              updateQuantity(item.id, newQuantity);
                            }
                          }}
                          className="w-16 text-center"
                          min="1"
                          max={item.product.stock}
                          disabled={updatingItems.has(item.id)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updatingItems.has(item.id) || item.quantity >= item.product.stock}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="font-semibold">
                          Ksh {(item.product.price * item.quantity).toFixed(2)}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                          disabled={updatingItems.has(item.id)}
                          className="text-red-600 hover:text-red-700 mt-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal ({cartItems.length} items)</span>
                      <span>Ksh {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Delivery fee</span>
                      <span>Calculated at checkout</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">Ksh {calculateSubtotal().toFixed(2)}</span>
                  </div>
                  
                  <Button onClick={proceedToCheckout} className="w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/customer/products')}
                    className="w-full"
                  >
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
