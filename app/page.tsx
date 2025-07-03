import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Egg, Beef, Wheat, Bird, Star, Shield, Award } from 'lucide-react';

export default function Home() {
  const featuredProducts = [
    {
      id: 1,
      name: 'Fresh Farm Eggs',
      price: 4.99,
      image: 'https://images.pexels.com/photos/1556707/pexels-photo-1556707.jpeg?auto=compress&cs=tinysrgb&w=400',
      seller: 'Farm Fresh Seller',
      tags: ['Verified', 'Recommended']
    },
    {
      id: 2,
      name: 'Premium Chicken Feed',
      price: 25.99,
      image: 'https://images.pexels.com/photos/162240/chicken-feed-food-eat-162240.jpeg?auto=compress&cs=tinysrgb&w=400',
      seller: 'Premium Poultry Co.',
      tags: ['Verified', 'Trusted']
    },
    {
      id: 3,
      name: 'Organic Chicken Meat',
      price: 8.99,
      image: 'https://images.pexels.com/photos/616401/pexels-photo-616401.jpeg?auto=compress&cs=tinysrgb&w=400',
      seller: 'Farm Fresh Seller',
      tags: ['Verified']
    },
    {
      id: 4,
      name: 'Rhode Island Red Chicks',
      price: 5.99,
      image: 'https://images.pexels.com/photos/3596906/pexels-photo-3596906.jpeg?auto=compress&cs=tinysrgb&w=400',
      seller: 'Premium Poultry Co.',
      tags: ['Trusted', 'Premium']
    }
  ];

  const categories = [
    { name: 'Eggs', icon: Egg, count: '500+ products' },
    { name: 'Chicken Meat', icon: Beef, count: '200+ products' },
    { name: 'Chicken Feed', icon: Wheat, count: '150+ products' },
    { name: 'Chicks', icon: Bird, count: '100+ products' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Bird className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">PoultryMarket</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Fresh Farm Products
            <span className="block text-green-600">Delivered to Your Door</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Connect with trusted farmers and suppliers. Buy fresh eggs, premium chicken meat, 
            quality feeds, and healthy chicks from verified sellers across the country.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Start Shopping
              </Button>
            </Link>
            <Link href="/auth/register?role=seller">
              <Button size="lg" variant="outline">
                Become a Seller
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Shop by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Card key={category.name} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <category.icon className="h-12 w-12 mx-auto text-green-600 mb-4" />
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>{category.count}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {product.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag === 'Verified' && <Shield className="w-3 h-3 mr-1" />}
                        {tag === 'Trusted' && <Star className="w-3 h-3 mr-1" />}
                        {tag === 'Recommended' && <Award className="w-3 h-3 mr-1" />}
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>{product.seller}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-green-600">${product.price}</span>
                    <Button size="sm">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Verified Sellers</h3>
              <p className="text-gray-600">All our sellers are verified and trusted by our community</p>
            </div>
            <div className="text-center">
              <Star className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Quality Products</h3>
              <p className="text-gray-600">Fresh, high-quality products delivered to your doorstep</p>
            </div>
            <div className="text-center">
              <Award className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Best Prices</h3>
              <p className="text-gray-600">Competitive prices with regular discounts and offers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Bird className="h-8 w-8 text-green-400" />
                <span className="text-2xl font-bold">PoultryMarket</span>
              </div>
              <p className="text-gray-400">Your trusted marketplace for fresh farm products</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/products" className="hover:text-white">Products</Link></li>
                <li><Link href="/sellers" className="hover:text-white">Sellers</Link></li>
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">For Sellers</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/auth/register?role=seller" className="hover:text-white">Become a Seller</Link></li>
                <li><Link href="/seller/dashboard" className="hover:text-white">Seller Dashboard</Link></li>
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Email: support@poultrymarket.com</li>
                <li>Phone: +1 (555) 123-4567</li>
                <li>Hours: 9AM - 6PM EST</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PoultryMarket. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}