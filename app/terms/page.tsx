'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft,
  FileText,
  Shield,
  Users,
  Scale,
  Mail,
  Calendar,
  CheckCircle
} from 'lucide-react';

export default function TermsPage() {
  const [activeTab, setActiveTab] = useState('terms');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const tabs = [
    {
      id: 'terms',
      label: 'Terms of Service',
      icon: FileText,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      icon: Shield,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'community',
      label: 'Community Guidelines',
      icon: Users,
      color: 'from-orange-500 to-yellow-500'
    }
  ];

  const termsContent = {
    terms: {
      title: "Terms of Service",
      lastUpdated: "July 1, 2025",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: "By accessing and using PoultryMarket, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service."
        },
        {
          title: "2. Use License",
          content: "Permission is granted to temporarily download one copy of the materials on PoultryMarket for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose or for any public display; attempt to reverse engineer any software contained on the website; remove any copyright or other proprietary notations from the materials."
        },
        {
          title: "3. User Accounts",
          content: "When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password and for all activities that occur under your account. You agree not to disclose your password to any third party."
        },
        {
          title: "4. Seller Obligations",
          content: "Sellers on our platform must provide accurate product descriptions, maintain quality standards, ensure timely delivery, and comply with all applicable laws and regulations. False advertising or misrepresentation of products is strictly prohibited."
        },
        {
          title: "5. Payment Terms",
          content: "All payments are processed securely through our approved payment gateways. Sellers will receive payments after successful delivery and customer confirmation, minus applicable platform fees. Refunds are processed according to our refund policy."
        },
        {
          title: "6. Prohibited Uses",
          content: "You may not use our service for any illegal or unauthorized purpose, violate any laws in your jurisdiction, transmit any worms or viruses, compromise the security of the service, or use the service to transmit spam or unsolicited communications."
        },
        {
          title: "7. Termination",
          content: "We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever including but not limited to a breach of the Terms."
        },
        {
          title: "8. Limitation of Liability",
          content: "In no event shall PoultryMarket, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service."
        }
      ]
    },
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "July 1, 2025",
      sections: [
        {
          title: "1. Information We Collect",
          content: "We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us. This includes your name, email address, phone number, delivery address, and payment information."
        },
        {
          title: "2. How We Use Your Information",
          content: "We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, communicate with you about products and services, and comply with legal obligations."
        },
        {
          title: "3. Information Sharing",
          content: "We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share information with service providers who assist us in operating our platform."
        },
        {
          title: "4. Data Security",
          content: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure."
        },
        {
          title: "5. Cookies and Tracking",
          content: "We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent."
        },
        {
          title: "6. Your Rights",
          content: "You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us. To exercise these rights, please contact us using the information provided below."
        },
        {
          title: "7. Data Retention",
          content: "We retain your personal information only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required or permitted by law."
        },
        {
          title: "8. Contact Information",
          content: "If you have any questions about this Privacy Policy, please contact us at support@comradehomes.me or epheynyaga@gmail.com or through our contact form."
        }
      ]
    },
    community: {
      title: "Community Guidelines",
      lastUpdated: "July 1, 2025",
      sections: [
        {
          title: "1. Respectful Communication",
          content: "Treat all community members with respect and courtesy. Harassment, hate speech, discrimination, or abusive behavior will not be tolerated. Constructive criticism is welcome, but personal attacks are not."
        },
        {
          title: "2. Accurate Information",
          content: "Provide truthful and accurate information in your listings, reviews, and communications. Misleading or false information undermines trust in our community and may result in account suspension."
        },
        {
          title: "3. Quality Standards",
          content: "Maintain high standards for product quality and service. Ensure your poultry products are fresh, properly handled, and meet all health and safety requirements. Poor quality or unsafe products will be removed."
        },
        {
          title: "4. Fair Trading Practices",
          content: "Engage in fair and honest trading practices. Honor your commitments, deliver orders on time, and resolve disputes amicably. Price manipulation or unfair competition is prohibited."
        },
        {
          title: "5. Intellectual Property",
          content: "Respect intellectual property rights. Only use images, text, and other content that you own or have permission to use. Copyright infringement will result in content removal and potential account termination."
        },
        {
          title: "6. Spam and Self-Promotion",
          content: "Avoid excessive self-promotion or spam. Focus on providing value to the community. Unsolicited promotional messages or irrelevant content may be removed."
        },
        {
          title: "7. Reporting Violations",
          content: "Report any violations of these guidelines to our moderation team. We investigate all reports promptly and take appropriate action. False reporting may also result in penalties."
        },
        {
          title: "8. Enforcement",
          content: "Violations of these guidelines may result in warnings, content removal, temporary suspension, or permanent account termination, depending on the severity and frequency of violations."
        }
      ]
    }
  };

  const currentContent = termsContent[activeTab as keyof typeof termsContent];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-10 animate-bounce"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-10 animate-bounce delay-300"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-10 animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-yellow-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">🐔</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                PoultryMarket
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-600 hover:text-green-600 font-medium transition-colors">
                Home
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-green-600 font-medium transition-colors">
                Contact
              </Link>
              <Link href="/terms" className="text-green-600 font-semibold">
                Terms
              </Link>
              <Link href="/auth/login" className="text-gray-600 hover:text-green-600 font-medium transition-colors">
                Sign In
              </Link>
              <Link href="/auth/register">
                <Button className="bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Register
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link href="/">
          <Button variant="ghost" className="text-gray-600 hover:text-green-600 hover:bg-white/50 transition-all duration-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Hero Section */}
      <section className="py-16 lg:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Legal
              <span className="bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent"> Information</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Important terms, policies, and guidelines that govern your use of our platform.
              Please read them carefully to understand your rights and responsibilities.
            </p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-6 py-4 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  activeTab === tab.id
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                    : 'bg-white/80 backdrop-blur-lg text-gray-700 hover:bg-white shadow-md hover:shadow-lg'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/80 backdrop-blur-lg shadow-2xl border-0 hover:shadow-3xl transition-all duration-500">
              <CardHeader className="space-y-4 pb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-r ${tabs.find(t => t.id === activeTab)?.color} rounded-xl flex items-center justify-center`}>
                      {(() => {
                        const activeTabData = tabs.find(t => t.id === activeTab);
                        const IconComponent = activeTabData?.icon;
                        return IconComponent ? <IconComponent className="h-6 w-6 text-white" /> : null;
                      })()}
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                        {currentContent.title}
                      </CardTitle>
                      <CardDescription className="text-gray-600 flex items-center space-x-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        <span>Last updated: {currentContent.lastUpdated}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-2xl flex items-center justify-center">
                      <Scale className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-8">
                  {currentContent.sections.map((section, index) => (
                    <div key={index} className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-3">{section.title}</h3>
                          <p className="text-gray-600 leading-relaxed">{section.content}</p>
                        </div>
                      </div>
                      {index < currentContent.sections.length - 1 && (
                        <hr className="border-gray-200" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card className="mt-8 bg-gradient-to-r from-green-500 to-yellow-500 border-0 text-white">
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Questions About Our Terms?</h3>
                <p className="mb-6 opacity-90 text-lg">
                  If you have any questions about these terms, privacy policy, or community guidelines, 
                  we&apos;re here to help clarify anything you need to know.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/contact">
                    <Button variant="secondary" className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3 font-semibold">
                      <Mail className="mr-2 h-5 w-5" />
                      Contact Support
                    </Button>
                  </Link>
                  <Link href="mailto:legal@poultrymarket.co.ke">
                    <Button variant="outline" className="border-white text-white hover:bg-white hover:text-green-600 px-8 py-3 font-semibold">
                      Email Legal Team
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">🐔</span>
                </div>
                <span className="text-2xl font-bold">PoultryMarket</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Connecting farmers, suppliers, and customers for the freshest poultry products delivered daily.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors block">Home</Link>
                <Link href="/products" className="text-gray-400 hover:text-white transition-colors block">Products</Link>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors block">Contact</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setActiveTab('terms')} 
                  className="text-gray-400 hover:text-white transition-colors block text-left"
                >
                  Terms of Service
                </button>
                <button 
                  onClick={() => setActiveTab('privacy')} 
                  className="text-gray-400 hover:text-white transition-colors block text-left"
                >
                  Privacy Policy
                </button>
                <button 
                  onClick={() => setActiveTab('community')} 
                  className="text-gray-400 hover:text-white transition-colors block text-left"
                >
                  Community Guidelines
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 PoultryMarket. All rights reserved. Made with ❤️ for farmers and food lovers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
