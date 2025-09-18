'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicNavbar from '@/components/layout/public-navbar';
import BlogSubmissionForm from '@/components/blog/blog-submission-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Users, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Heart,
  Share2,
  Lightbulb,
  Sparkles,
  Award,
  Target,
  Zap
} from 'lucide-react';

interface BlogSubmissionData {
  title: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  images: string[];
  category: string;
  tags: string[];
  submissionNotes: string;
  authorName: string;
  authorEmail: string;
  authorPhone?: string;
}

export default function BlogSubmissionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (data: BlogSubmissionData) => {
    try {
      setLoading(true);

      // Clean up the data before sending - remove empty image URLs
      const cleanedData = {
        ...data,
        featuredImage: data.featuredImage && data.featuredImage.trim() !== '' ? data.featuredImage : undefined,
        images: data.images?.filter(img => img && img.trim() !== '') || []
      };

      console.log('Sending cleaned blog data:', cleanedData); // Debug log

      const response = await fetch('/api/blog/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit blog post');
      }

      const result = await response.json();
      
      toast.success('Blog post submitted successfully! It will be reviewed by our team.');
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting blog post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit blog post');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <PublicNavbar />
        
        <div className="max-w-4xl mx-auto px-4 py-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
            className="text-center space-y-8"
          >
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mx-auto w-20 h-20 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <CheckCircle className="h-10 w-10 text-white" />
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent mb-4">
                Blog Post Submitted Successfully!
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Thank you for contributing to our community! Your blog post has been submitted 
                and is now under review by our editorial team.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 max-w-2xl mx-auto shadow-lg"
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-blue-900 mb-3 text-lg">What happens next?</h3>
                  <ul className="text-blue-800 space-y-2">
                    <motion.li 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8, duration: 0.3 }}
                      className="flex items-center space-x-2"
                    >
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span>Our team will review your submission within 2-3 business days</span>
                    </motion.li>
                    <motion.li 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0, duration: 0.3 }}
                      className="flex items-center space-x-2"
                    >
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span>You&apos;ll receive an email notification about the review status</span>
                    </motion.li>
                    <motion.li 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2, duration: 0.3 }}
                      className="flex items-center space-x-2"
                    >
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span>If approved, your post will be published on our blog</span>
                    </motion.li>
                    <motion.li 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.4, duration: 0.3 }}
                      className="flex items-center space-x-2"
                    >
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span>If changes are needed, we&apos;ll provide feedback</span>
                    </motion.li>
                  </ul>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/blog')}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg"
              >
                Browse Blog Posts
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(107, 114, 128, 0.2)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSubmitted(false);
                  window.scrollTo(0, 0);
                }}
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold"
              >
                Submit Another Post
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <PublicNavbar />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
        
        <div className="max-w-6xl mx-auto px-4 py-16">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl mb-6 shadow-lg"
            >
              <Sparkles className="h-8 w-8 text-white" />
            </motion.div>
            
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Share Your Poultry
              </span>
              <br />
              <span className="text-gray-900">Knowledge</span>
            </h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            >
              Have valuable insights about poultry farming? Join our community of experts and help 
              <span className="font-semibold text-emerald-600"> thousands of farmers succeed</span> with your knowledge!
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-8 flex items-center justify-center space-x-4 text-sm text-gray-500"
            >
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-emerald-500" />
                <span>Expert Community</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span>Quality Content</span>
              </div>
              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span>Fast Review</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Benefits Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="grid md:grid-cols-3 gap-8 mb-16"
          >
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="text-center border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-100 hover:shadow-2xl transition-all duration-500">
                <CardContent className="pt-8 pb-8">
                  <motion.div 
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  >
                    <Users className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">Share Knowledge</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Help thousands of farmers with your expertise and experience. Make a real impact in the community.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="text-center border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-green-100 hover:shadow-2xl transition-all duration-500">
                <CardContent className="pt-8 pb-8">
                  <motion.div 
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  >
                    <Heart className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">Build Community</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Connect with like-minded farmers and build lasting relationships in our thriving community.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="text-center border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-100 hover:shadow-2xl transition-all duration-500">
                <CardContent className="pt-8 pb-8">
                  <motion.div 
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  >
                    <Share2 className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">Get Recognition</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Build your reputation as a knowledgeable poultry expert and industry thought leader.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Guidelines */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
          >
            <Card className="mb-12 border-0 shadow-2xl bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500"></div>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center"
                  >
                    <Lightbulb className="h-6 w-6 text-white" />
                  </motion.div>
                  <span className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    Submission Guidelines
                  </span>
                </CardTitle>
                <CardDescription className="text-lg">
                  Please follow these guidelines to ensure your blog post is approved quickly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                  >
                    <h4 className="font-bold text-gray-900 mb-4 text-lg">Content Guidelines</h4>
                    <ul className="space-y-3 text-gray-700">
                      <motion.li 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.3, duration: 0.3 }}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Original content only - no plagiarism</span>
                      </motion.li>
                      <motion.li 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.4, duration: 0.3 }}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Minimum 300 words for quality content</span>
                      </motion.li>
                      <motion.li 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.5, duration: 0.3 }}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Include practical tips and actionable advice</span>
                      </motion.li>
                      <motion.li 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.6, duration: 0.3 }}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Use clear headings and structure</span>
                      </motion.li>
                    </ul>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                  >
                    <h4 className="font-bold text-gray-900 mb-4 text-lg">What We Look For</h4>
                    <ul className="space-y-3 text-gray-700">
                      <motion.li 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.3, duration: 0.3 }}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Personal experiences and case studies</span>
                      </motion.li>
                      <motion.li 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.4, duration: 0.3 }}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Technical knowledge and best practices</span>
                      </motion.li>
                      <motion.li 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.5, duration: 0.3 }}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Problem-solving and troubleshooting guides</span>
                      </motion.li>
                      <motion.li 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.6, duration: 0.3 }}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Industry insights and market trends</span>
                      </motion.li>
                    </ul>
                  </motion.div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.7, duration: 0.6 }}
                  className="mt-8 p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl shadow-inner"
                >
                  <div className="flex items-start space-x-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-10 h-10 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0"
                    >
                      <AlertCircle className="h-5 w-5 text-white" />
                    </motion.div>
                    <div>
                      <h4 className="font-bold text-amber-900 mb-2 text-lg">Review Process</h4>
                      <p className="text-amber-800 leading-relaxed">
                        All submissions go through a review process to ensure quality and relevance. 
                        This typically takes 2-3 business days. You&apos;ll receive an email notification 
                        once your post is reviewed.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submission Form */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <BlogSubmissionForm 
              onSubmit={handleSubmit}
              loading={loading}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}