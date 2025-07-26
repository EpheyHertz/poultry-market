'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bird, 
  Shield, 
  FileText, 
  Clock,
  Mail,
  Phone
} from 'lucide-react';

export default function TermsPage() {
  const [activeTab, setActiveTab] = useState('terms');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-green-50">
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
              <Link href="/contact" className="text-gray-600 hover:text-green-600 font-medium">
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
              Legal Information
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your trust is important to us. Please review our terms of service and privacy policy 
              to understand how we operate and protect your information.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="terms" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Terms of Service</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Privacy Policy</span>
              </TabsTrigger>
            </TabsList>

            {/* Terms of Service */}
            <TabsContent value="terms">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center space-x-2">
                    <FileText className="h-6 w-6 text-green-600" />
                    <span>Terms of Service</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Effective Date: June 1, 2025</span>
                  </div>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Overview of Services</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Poultry Market operates an online marketplace platform that connects poultry farmers, 
                        suppliers, and buyers across Kenya. Our services include product listing, order management, 
                        payment processing, delivery coordination, and customer support for all stakeholders 
                        in the poultry value chain.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">2. User Responsibilities</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        <li>Provide accurate and up-to-date information during registration</li>
                        <li>Maintain the confidentiality of your account credentials</li>
                        <li>Use the platform in compliance with all applicable laws and regulations</li>
                        <li>Respect the intellectual property rights of Poultry Market and other users</li>
                        <li>Report any suspicious activities or violations to our support team</li>
                        <li>Ensure all product descriptions and images are accurate and truthful</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Seller Obligations</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        <li>Maintain appropriate licenses and permits for poultry-related business activities</li>
                        <li>Ensure product quality meets industry standards and customer expectations</li>
                        <li>Fulfill orders within the specified timeframes</li>
                        <li>Provide accurate product information including freshness dates and specifications</li>
                        <li>Comply with food safety regulations and animal welfare standards</li>
                        <li>Respond promptly to customer inquiries and resolve disputes professionally</li>
                        <li>Maintain appropriate insurance coverage for your business operations</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Prohibited Conduct</h3>
                      <p className="text-gray-700 mb-3">Users are strictly prohibited from:</p>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        <li>Listing counterfeit, expired, or unsafe poultry products</li>
                        <li>Engaging in fraudulent activities or misrepresenting products</li>
                        <li>Violating any local, national, or international laws</li>
                        <li>Harassment, discrimination, or abusive behavior toward other users</li>
                        <li>Attempting to circumvent platform fees or payment systems</li>
                        <li>Using automated systems to manipulate platform features</li>
                        <li>Sharing or selling personal information of other users</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Account Termination Policy</h3>
                      <p className="text-gray-700 leading-relaxed">
                        We reserve the right to suspend or terminate user accounts for violations of these terms, 
                        fraudulent activities, or behavior that harms the platform community. Users will receive 
                        notice of termination except in cases of severe violations. Upon termination, users lose 
                        access to their account and any associated data, though we may retain certain information 
                        as required by law or for business purposes.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Limitation of Liability</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Poultry Market serves as a marketplace platform and is not responsible for the quality, 
                        safety, or legality of products listed by sellers. We do not guarantee the accuracy of 
                        product descriptions or the performance of transactions between users. Our liability is 
                        limited to the extent permitted by Kenyan law.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Changes to Terms</h3>
                      <p className="text-gray-700 leading-relaxed">
                        We may update these terms periodically to reflect changes in our services or legal requirements. 
                        Users will be notified of significant changes via email or platform notifications. Continued use 
                        of the platform after changes constitutes acceptance of the updated terms.
                      </p>
                    </section>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Policy */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center space-x-2">
                    <Shield className="h-6 w-6 text-green-600" />
                    <span>Privacy Policy</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Effective Date: June 1, 2025</span>
                  </div>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Data We Collect</h3>
                      <p className="text-gray-700 mb-3">We collect the following types of information:</p>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        <li><strong>Personal Information:</strong> Name, email address, phone number, business address</li>
                        <li><strong>Business Information:</strong> Company details, license numbers, tax information</li>
                        <li><strong>Product Data:</strong> Product listings, images, descriptions, pricing</li>
                        <li><strong>Transaction Data:</strong> Order history, payment information, delivery details</li>
                        <li><strong>Usage Data:</strong> Login activity, feature usage, search queries</li>
                        <li><strong>Communication Data:</strong> Messages, support tickets, feedback</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Cookie Usage</h3>
                      <p className="text-gray-700 leading-relaxed">
                        We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
                        and provide personalized content. Essential cookies are necessary for platform functionality, 
                        while optional cookies help us improve our services. You can manage cookie preferences through 
                        your browser settings, though disabling certain cookies may limit platform functionality.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Data Storage and Protection</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Your data is stored on secure servers with encryption both in transit and at rest. We implement 
                        industry-standard security measures including firewalls, access controls, and regular security 
                        audits. Data is primarily stored in Kenya with backup systems in secure international locations. 
                        We regularly update our security protocols to protect against emerging threats.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Third-Party Services</h3>
                      <p className="text-gray-700 mb-3">We work with trusted third-party services for:</p>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        <li><strong>Payment Processing:</strong> M-Pesa, banks, and payment gateways</li>
                        <li><strong>Delivery Services:</strong> Logistics partners for order fulfillment</li>
                        <li><strong>Analytics:</strong> Google Analytics for usage insights</li>
                        <li><strong>Communication:</strong> Email and SMS service providers</li>
                        <li><strong>Cloud Services:</strong> AWS for hosting and data storage</li>
                      </ul>
                      <p className="text-gray-700 mt-3">
                        These partners are contractually bound to protect your data and use it only for specified purposes.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Data Retention and Deletion</h3>
                      <p className="text-gray-700 leading-relaxed">
                        We retain your data for as long as necessary to provide our services and comply with legal 
                        obligations. Personal data is typically retained for 7 years after account closure for tax 
                        and regulatory purposes. Transaction records may be kept longer as required by financial 
                        regulations. You can request data deletion, though we may retain certain information for 
                        legal compliance.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Your Rights</h3>
                      <p className="text-gray-700 mb-3">You have the right to:</p>
                      <ul className="list-disc list-inside space-y-2 text-gray-700">
                        <li><strong>Access:</strong> Request copies of your personal data</li>
                        <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                        <li><strong>Deletion:</strong> Request removal of your data (subject to legal requirements)</li>
                        <li><strong>Portability:</strong> Export your data in a readable format</li>
                        <li><strong>Restriction:</strong> Limit how we process your data</li>
                        <li><strong>Objection:</strong> Opt-out of certain data processing activities</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Minors and Do-Not-Track</h3>
                      <p className="text-gray-700 leading-relaxed">
                        Our platform is not intended for users under 18 years of age. We do not knowingly collect 
                        personal information from minors. If we become aware of such data collection, we will promptly 
                        delete the information. Regarding Do-Not-Track signals, our platform does not currently respond 
                        to these browser settings, but you can control tracking through cookie preferences.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">8. Contact Information</h3>
                      <p className="text-gray-700 leading-relaxed">
                        For privacy-related questions or to exercise your rights, contact our Data Protection Officer:
                      </p>
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Mail className="h-4 w-4 text-green-600" />
                          <span className="text-gray-700">epheynyaga@gmail.com</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-green-600" />
                          <span className="text-gray-700">+254 705 423 479</span>
                        </div>
                      </div>
                    </section>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Contact Banner */}
      <section className="py-16 bg-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Have Questions About Our Policies?
          </h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Our legal team is here to help clarify any concerns about our terms or privacy practices.
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary" className="bg-white text-green-600 hover:bg-gray-100">
              Contact Legal Team
            </Button>
          </Link>
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
              <Link href="/" className="text-gray-300 hover:text-green-400">
                Home
              </Link>
              <Link href="/contact" className="text-gray-300 hover:text-green-400">
                Contact
              </Link>
              <Link href="/terms" className="text-gray-300 hover:text-green-400">
                Legal
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
