'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Mail,
  CheckCircle,
  TrendingUp,
  BookOpen,
  Bell,
  Users,
  Star,
  Gift
} from 'lucide-react';

interface NewsletterSubscriptionProps {
  className?: string;
  variant?: 'default' | 'sidebar' | 'footer' | 'popup';
  showBenefits?: boolean;
}

export default function NewsletterSubscription({ 
  className = '',
  variant = 'default',
  showBenefits = true
}: NewsletterSubscriptionProps) {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubscribing(true);

    try {
      const response = await fetch('/api/blog/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscribed(true);
        setEmail('');
        toast.success('Successfully subscribed to our newsletter!');
      } else {
        toast.error(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const benefits = [
    {
      icon: TrendingUp,
      title: 'Market Insights',
      description: 'Weekly poultry market trends and price updates'
    },
    {
      icon: BookOpen,
      title: 'Expert Tips',
      description: 'Proven farming techniques from industry experts'
    },
    {
      icon: Bell,
      title: 'Latest Updates',
      description: 'Be first to know about new articles and guides'
    },
    {
      icon: Gift,
      title: 'Exclusive Content',
      description: 'Subscriber-only resources and special offers'
    }
  ];

  if (subscribed) {
    return (
      <Card className={`bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 ${className}`}>
        <CardContent className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          </motion.div>
          <h3 className="text-xl font-bold text-green-800 mb-2">
            Welcome to our community!
          </h3>
          <p className="text-green-700 mb-4">
            Thank you for subscribing. You&apos;ll receive our latest articles and insights directly in your inbox.
          </p>
          <Badge className="bg-green-100 text-green-800">
            <Users className="h-3 w-3 mr-1" />
            Join 5,000+ farmers
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'sidebar':
        return 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200';
      case 'footer':
        return 'bg-gray-900 text-white border-gray-700';
      case 'popup':
        return 'bg-white shadow-xl border-emerald-300';
      default:
        return 'bg-gradient-to-r from-emerald-600 to-green-700 text-white border-emerald-500';
    }
  };

  const textColorClass = variant === 'footer' || variant === 'default' ? 'text-white' : 'text-gray-700';
  const inputClass = variant === 'footer' || variant === 'default' 
    ? 'bg-white/10 border-white/20 text-white placeholder:text-white/70'
    : 'bg-white border-gray-200';

  return (
    <Card className={`${getVariantClasses()} ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-full ${variant === 'footer' || variant === 'default' ? 'bg-white/10' : 'bg-emerald-100'}`}>
            <Mail className={`h-6 w-6 ${variant === 'footer' || variant === 'default' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div>
            <CardTitle className={`text-xl ${textColorClass}`}>
              Stay Updated
            </CardTitle>
            <CardDescription className={variant === 'footer' || variant === 'default' ? 'text-white/80' : 'text-gray-600'}>
              Get the latest poultry farming insights
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubscribe} className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`flex-1 ${inputClass}`}
              required
            />
            <Button 
              type="submit" 
              disabled={subscribing}
              className={variant === 'footer' || variant === 'default' 
                ? 'bg-white text-emerald-700 hover:bg-gray-100' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }
            >
              {subscribing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                'Subscribe'
              )}
            </Button>
          </div>
          <p className={`text-xs ${variant === 'footer' || variant === 'default' ? 'text-white/70' : 'text-gray-500'}`}>
            We respect your privacy. Unsubscribe at any time.
          </p>
        </form>

        {showBenefits && (
          <div className="space-y-3">
            <h4 className={`font-semibold text-sm ${textColorClass}`}>
              What you&apos;ll get:
            </h4>
            <div className="grid gap-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <benefit.icon className={`h-4 w-4 mt-0.5 ${variant === 'footer' || variant === 'default' ? 'text-white/80' : 'text-emerald-600'}`} />
                  <div>
                    <div className={`text-sm font-medium ${textColorClass}`}>
                      {benefit.title}
                    </div>
                    <div className={`text-xs ${variant === 'footer' || variant === 'default' ? 'text-white/70' : 'text-gray-600'}`}>
                      {benefit.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Star className={`h-4 w-4 ${variant === 'footer' || variant === 'default' ? 'text-yellow-300' : 'text-yellow-500'}`} />
          <span className={`text-sm ${variant === 'footer' || variant === 'default' ? 'text-white/80' : 'text-gray-600'}`}>
            Trusted by 5,000+ poultry farmers
          </span>
        </div>
      </CardContent>
    </Card>
  );
}