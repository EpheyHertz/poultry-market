'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Bird, 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  CheckCircle
} from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Message sent successfully!",
          description: result.message || "We'll get back to you within 24 hours.",
          duration: 5000,
        });
        setFormData({ name: '', email: '', message: '' });
      } else {
        toast({
          title: "Failed to send message",
          description: result.error || "Please try again later.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Contact form error:', error);
      toast({
        title: "Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Bird className="h-8 w-8 text-green-600" />
              <span className="text-2xl font-bold text-gray-900">Poultry Market</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-600 hover:text-green-600 font-medium">
                Home
              </Link>
              <Link href="/contact" className="text-gray-900 hover:text-green-600 font-medium">
                Contact
              </Link>
              <Link href="/auth/login" className="text-gray-600 hover:text-green-600 font-medium">
                Sign In
              </Link>
              <Link href="/auth/register">
                <Button className="bg-green-600 hover:bg-green-700">Register</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions about our poultry marketplace? Want to partner with us? 
              We&apos;d love to hear from you!
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Contact Information
                  </h2>
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail className="h-6 w-6" />
                      </div>
                      {/* <div>
                        <h3 className="font-semibold text-gray-900">Email</h3>
                        <p className="text-gray-600">info@poultrymarket.co.ke</p>
                        <p className="text-gray-600">support@poultrymarket.co.ke</p>
                      </div> */}
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Phone className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Phone</h3>
                        <p className="text-gray-600">+254 705 423479</p>
                        {/* <p className="text-gray-600">+254 720 000 000</p> */}
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Address</h3>
                        <p className="text-gray-600">
                          <br />
                          University of Embu<br />
                          Embu, Kenya
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Business Hours</h3>
                        <p className="text-gray-600">
                          Monday - Friday: 8:00 AM - 6:00 PM<br />
                          Saturday: 9:00 AM - 4:00 PM<br />
                          Sunday: Closed
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Contact Cards */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Quick Contact
                  </h3>
                  <div className="space-y-3">
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">General Inquiries</p>
                          <p className="text-sm text-gray-600">epheynyaga@gmail.com</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">Technical Support</p>
                          <p className="text-sm text-gray-600">epheynyaga@gmail.com</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">Partnerships</p>
                          <p className="text-sm text-gray-600">epheynyaga@gmail.com</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="backdrop-blur-sm bg-white/90 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl">Send us a Message</CardTitle>
                  <CardDescription className="text-base">
                    Fill out the form below and we&apos;ll get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="h-12"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Tell us how we can help you..."
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        className="min-h-[150px] resize-none"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        "Sending..."
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Quick answers to common questions about our platform
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How do I start selling on the platform?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Simply register as a seller, verify your account, and start listing your poultry products. 
                  Our team will guide you through the process.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is delivery available nationwide?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes, we provide delivery services across Kenya through our network of verified delivery partners.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How are payments handled?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We use secure payment gateways including M-Pesa, bank transfers, and card payments to ensure safe transactions.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What if I have quality issues?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  We have a comprehensive quality assurance program and customer protection policy. Contact our support team for assistance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Bird className="h-8 w-8 text-green-400" />
              <span className="text-2xl font-bold">Poultry Market</span>
            </div>
            <p className="text-gray-400 mb-6">
              © {new Date().getFullYear()} Poultry Market. All rights reserved.
            </p>
            <div className="flex justify-center space-x-6">
              <Link href="/terms" className="text-gray-300 hover:text-green-400">
                Terms of Service
              </Link>
              <Link href="/terms" className="text-gray-300 hover:text-green-400">
                Privacy Policy
              </Link>
              <Link href="/" className="text-gray-300 hover:text-green-400">
                Home
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
