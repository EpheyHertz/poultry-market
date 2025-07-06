
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Egg, Beef, Wheat, Bird, Star, Shield, Award, ArrowRight } from 'lucide-react';

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
    { name: 'Eggs', icon: Egg, count: '500+ products', type: 'EGGS' },
    { name: 'Chicken Meat', icon: Beef, count: '200+ products', type: 'CHICKEN_MEAT' },
    { name: 'Chicken Feed', icon: Wheat, count: '150+ products', type: 'CHICKEN_FEED' },
    { name: 'Chicks', icon: Bird, count: '100+ products', type: 'CHICKS' }
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
              <Link href="/products">
                <Button variant="ghost">Browse Products</Button>
              </Link>
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
            <Link href="/products">
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Browse All Products
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
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
            <Link href="/products">
              <Button variant="outline">
                View All Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link key={category.name} href={`/products?type=${category.type}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="text-center">
                    <category.icon className="h-12 w-12 mx-auto text-green-600 mb-4" />
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>{category.count}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
            <Link href="/products">
              <Button variant="outline">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
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
                    <Link href="/auth/login">
                      <Button size="sm">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add to Cart
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                <li><Link href="/products" className="hover:text-white">All Products</Link></li>
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
