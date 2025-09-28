"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  Users, 
  ShoppingCart, 
  Truck, 
  Star, 
  Play,
  CheckCircle,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  Globe,
  Award,
  Heart
} from 'lucide-react';

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Restaurant Owner",
      image: "/images/testimonial1.jpg",
      content: "This platform transformed my business! Fresh poultry delivered daily at unbeatable prices.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Poultry Farmer",
      image: "/images/testimonial2.jpg", 
      content: "Finally, a platform that connects me directly with customers. My income increased by 40%!",
      rating: 5
    },
    {
      name: "Emma Davis",
      role: "Home Chef",
      image: "/images/testimonial3.jpg",
      content: "The quality is exceptional and delivery is always on time. Highly recommended!",
      rating: 5
    }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const features = [
    {
      icon: ShoppingCart,
      title: "Smart Marketplace",
      description: "Connect with verified poultry suppliers and buyers in your area",
      color: "from-emerald-500 to-green-600"
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Same-day delivery with real-time tracking for fresh products",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Shield,
      title: "Quality Assured",
      description: "All products are verified and quality-tested before delivery",
      color: "from-purple-500 to-indigo-600"
    },
    {
      icon: TrendingUp,
      title: "Best Prices",
      description: "Competitive pricing with direct farmer-to-customer connections",
      color: "from-orange-500 to-red-600"
    }
  ];

  const stats = [
    { label: "Active Users", value: "50K+", icon: Users },
    { label: "Daily Orders", value: "2K+", icon: ShoppingCart },
    { label: "Partner Farms", value: "500+", icon: Globe },
    { label: "Satisfaction Rate", value: "99%", icon: Heart }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-lg border-b border-green-100 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-yellow-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg sm:text-xl">🐔</span>
              </div>
              <span className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                PoultryMarket
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <Link href="#features" className="text-gray-700 hover:text-green-600 transition-colors text-sm lg:text-base">
                Features
              </Link>
              <Link href="/blog" className="text-gray-700 hover:text-green-600 transition-colors text-sm lg:text-base">
                Blog
              </Link>
              <Link href="#testimonials" className="text-gray-700 hover:text-green-600 transition-colors text-sm lg:text-base">
                Reviews
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-green-600 transition-colors text-sm lg:text-base">
                Contact
              </Link>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/auth/login" className="hidden sm:block">
                <Button variant="ghost" className="text-green-600 hover:text-green-700 text-sm lg:text-base px-3 lg:px-4">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-sm lg:text-base px-3 lg:px-6 py-2">
                  <span className="hidden sm:inline">Get Started</span>
                  <span className="sm:hidden">Start</span>
                  <ChevronRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-yellow-600/10"></div>
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className={`space-y-6 sm:space-y-8 transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
              <div className="space-y-4 sm:space-y-6">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-xs sm:text-sm">
                  🎉 Now serving 50+ cities nationwide
                </Badge>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-green-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    Fresh Poultry
                  </span>
                  <br />
                  <span className="text-gray-800">Delivered Daily</span>
                </h1>
                
                <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-lg">
                  Connect with trusted farmers and suppliers. Get premium quality poultry products delivered fresh to your doorstep with just a few clicks.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/auth/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 group">
                    Start Shopping Now
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-green-500 text-green-600 hover:bg-green-50 group">
                  <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6 sm:pt-8">
                {stats.map((stat, index) => (
                  <div key={stat.label} className={`text-center transition-all duration-700 delay-${index * 100} ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <div className="flex items-center justify-center mb-2">
                      <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-gray-800">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`relative mt-8 lg:mt-0 transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
              <div className="relative">
                {/* Floating cards animation */}
                <div className="absolute inset-0 animate-pulse">
                  <div className="absolute top-10 right-10 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-20 animate-bounce"></div>
                  <div className="absolute bottom-20 left-10 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-20 animate-bounce delay-300"></div>
                </div>
                
                <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="aspect-square bg-gradient-to-br from-green-100 to-yellow-100 rounded-2xl flex items-center justify-center text-6xl sm:text-8xl">
                    🐔
                  </div>
                  <div className="mt-4 sm:mt-6 space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-gray-600 text-sm sm:text-base">4.9/5</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">Premium Quality</h3>
                    <p className="text-gray-600 text-sm sm:text-base">Guaranteed fresh delivery</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <Badge className="bg-green-100 text-green-700 mb-4 text-xs sm:text-sm">
              Why Choose Us
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-800 mb-4 sm:mb-6">
              Everything You Need in One
              <span className="bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent"> Platform</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              From farm to table, we&apos;ve got you covered with cutting-edge technology and unmatched service quality.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <Card key={feature.title} className={`group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer border-0 bg-gradient-to-br ${feature.color} p-1`}>
                <CardContent className="bg-white m-1 rounded-lg p-4 sm:p-6 h-full">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300 mx-auto sm:mx-0`}>
                    <feature.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3 group-hover:text-green-600 transition-colors text-center sm:text-left">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20 bg-gradient-to-r from-green-50 to-yellow-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Perfect for
              <span className="bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent"> Everyone</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "🥘 Restaurants & Hotels",
                description: "Bulk orders with guaranteed quality and timely delivery for your business needs.",
                features: ["Bulk pricing", "Daily delivery", "Quality guarantee"],
                cta: "Start Ordering",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                title: "🏠 Home Chefs",
                description: "Fresh, premium poultry products delivered to your doorstep for family meals.",
                features: ["Small quantities", "Flexible delivery", "Premium quality"],
                cta: "Shop Now",
                gradient: "from-green-500 to-emerald-500"
              },
              {
                title: "🚜 Farmers & Suppliers",
                description: "Sell directly to customers and increase your profits with our platform.",
                features: ["Direct sales", "Higher profits", "Market reach"],
                cta: "Become Seller",
                gradient: "from-orange-500 to-yellow-500"
              }
            ].map((userType, index) => (
              <Card key={userType.title} className="group hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 cursor-pointer overflow-hidden">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">{userType.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{userType.description}</p>
                  </div>
                  
                  <div className="space-y-3 mb-8">
                    {userType.features.map((feature, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button className={`w-full bg-gradient-to-r ${userType.gradient} hover:scale-105 transition-all duration-300 text-white shadow-lg`}>
                    {userType.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="bg-yellow-100 text-yellow-700 mb-4">
              Customer Stories
            </Badge>
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              What Our
              <span className="bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent"> Customers Say</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl">
              {testimonials.map((testimonial, index) => (
                <Card 
                  key={index}
                  className={`absolute inset-0 transition-all duration-500 ${
                    index === activeTestimonial 
                      ? 'opacity-100 translate-x-0' 
                      : index < activeTestimonial 
                        ? 'opacity-0 -translate-x-full' 
                        : 'opacity-0 translate-x-full'
                  }`}
                >
                  <CardContent className="p-12 text-center">
                    <div className="flex justify-center mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <blockquote className="text-2xl text-gray-700 mb-8 leading-relaxed">
                      &ldquo;{testimonial.content}&rdquo;
                    </blockquote>
                    <div className="flex items-center justify-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-gray-800">{testimonial.name}</div>
                        <div className="text-gray-600">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Testimonial indicators */}
            <div className="flex justify-center space-x-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === activeTestimonial 
                      ? 'bg-green-500 scale-125' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 via-yellow-500 to-orange-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 relative text-center text-white">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <Zap className="h-16 w-16 mx-auto mb-6 animate-bounce" />
              <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl lg:text-2xl opacity-90 leading-relaxed">
                Join thousands of satisfied customers and experience the future of poultry commerce today!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-2xl group">
                  <Award className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                  Create Free Account
                </Button>
              </Link>
              
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-green-600 transition-all duration-300">
                  Contact Sales Team
                </Button>
              </Link>
            </div>

            <div className="mt-12 text-center">
              <p className="text-lg opacity-75">
                🎉 Special launch offer: Get 20% off your delivery on first order!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-2 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg sm:text-xl">🐔</span>
                </div>
                <span className="text-xl sm:text-2xl font-bold">PoultryMarket</span>
              </div>
              <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                Connecting farmers, suppliers, and customers for the freshest poultry products delivered daily.
              </p>
            </div>
            
            <div className="text-center sm:text-left">
              <h3 className="font-bold mb-4 text-sm sm:text-base">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/products" className="text-gray-400 hover:text-white transition-colors block text-sm">Products</Link>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors block text-sm">Blog</Link>
                <Link href="/chatbot" className="text-gray-400 hover:text-white transition-colors block text-sm">Chat with AI</Link>
                
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors block text-sm">Contact</Link>
              </div>
            </div>
            
            <div className="text-center sm:text-left">
              <h3 className="font-bold mb-4 text-sm sm:text-base">For Business</h3>
              <div className="space-y-2">
                <Link href="/auth/register" className="text-gray-400 hover:text-white transition-colors block text-sm">Become Seller</Link>
                <Link href="/auth/register" className="text-gray-400 hover:text-white transition-colors block text-sm">Delivery Partner</Link>
                <Link href="/auth/register" className="text-gray-400 hover:text-white transition-colors block text-sm">Company Solutions</Link>
              </div>
            </div>
            
            <div className="text-center sm:text-left">
              <h3 className="font-bold mb-4 text-sm sm:text-base">Support</h3>
              <div className="space-y-2">
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors block text-sm">Terms of Service</Link>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors block text-sm">Privacy Policy</Link>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors block text-sm">Help Center</Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">
              © 2025 PoultryMarket. All rights reserved. Made with ❤️ for farmers and food lovers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
