'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PublicNavbar from '@/components/layout/public-navbar';
import BlogSubmissionForm from '@/components/blog/blog-submission-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  FileText, 
  Sparkles, 
  Send,
  ArrowLeft,
  Lightbulb,
  Target,
  Users,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
};

export default function BlogSubmissionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const loginPath = '/auth/login?next=/blog/submit';

  const fetchCurrentUser = useCallback(async () => {
    setIsUserLoading(true);
    setUserError(null);

    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data: CurrentUser = await response.json();
        setCurrentUser(data);
        return;
      }

      if (response.status === 401) {
        setCurrentUser(null);
        return;
      }

      const errorData = await response.json().catch(() => null);
      setCurrentUser(null);
      setUserError(errorData?.error || 'We could not load your account details.');
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      setCurrentUser(null);
      setUserError('We could not load your account. Please try again.');
    } finally {
      setIsUserLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const handleSubmit = async (formData: {
    title: string;
    content: string;
    excerpt?: string;
    featuredImage?: string;
    images: string[];
    category: string;
    tags: string[];
    submissionNotes?: string;
  }) => {
    if (!currentUser || !currentUser.email) {
      toast.error('Please sign in before submitting a blog post.');
      router.push(loginPath);
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      ...formData,
      featuredImage: formData.featuredImage || undefined,
      excerpt: formData.excerpt || undefined,
      submissionNotes: formData.submissionNotes || undefined,
    };

    try {
      const response = await fetch('/api/blog/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitted(true);
        toast.success('Blog post submitted successfully! We\'ll review it within 24-48 hours.');
        return;
      }

      if (response.status === 401) {
        toast.error('Your session expired. Please sign in again.');
        router.push(loginPath);
        return;
      }

      const errorData = await response.json().catch(() => null);
      toast.error(errorData?.error || 'Failed to submit blog post');
    } catch (error) {
      console.error('Error submitting blog post:', error);
      toast.error('Failed to submit blog post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
        <PublicNavbar />
        
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Submission Successful! 🎉
            </h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Thank you for contributing to our poultry knowledge hub! Your blog post has been submitted 
              and is now under review by our editorial team.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
              We&apos;ve emailed you a confirmation and alerted the PoultryMarket editorial team so you&apos;ll stay updated at each review step.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-0 shadow-lg dark:bg-slate-800/50 dark:border dark:border-slate-700/50">
                <CardContent className="p-6 text-center">
                  <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2 dark:text-white">Review Process</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">24-48 hours review time</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg dark:bg-slate-800/50 dark:border dark:border-slate-700/50">
                <CardContent className="p-6 text-center">
                  <Send className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2 dark:text-white">Email Updates</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">You&apos;ll receive notifications</p>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg dark:bg-slate-800/50 dark:border dark:border-slate-700/50">
                <CardContent className="p-6 text-center">
                  <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2 dark:text-white">Publication</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Live on our blog once approved</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => router.push('/blog')}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                View Blog
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setSubmitted(false);
                  window.location.reload();
                }}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Submit Another Post
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <PublicNavbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="gap-2 hover:bg-white/50 dark:hover:bg-slate-800/50 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-0 shadow-lg dark:bg-slate-800/50 dark:border dark:border-slate-700/50">
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Submit Your Blog Post
                  </CardTitle>
                  <CardDescription className="text-emerald-100">
                    Share your poultry expertise with our community
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {isUserLoading ? (
                    <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      Checking your account details...
                    </div>
                  ) : currentUser ? (
                    <BlogSubmissionForm
                      onSubmit={handleSubmit}
                      loading={isSubmitting}
                      currentUser={currentUser}
                    />
                  ) : (
                    <div className="space-y-6 text-center">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {userError ? 'We hit a snag loading your account' : 'Sign in to share your story'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {userError
                            ? 'Please refresh and try again. If the issue persists, sign in again to continue.'
                            : 'Please sign in to connect your submission to your PoultryMarket profile and receive status updates.'}
                        </p>
                      </div>
                      {userError && (
                        <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300">
                          {userError}
                        </div>
                      )}
                      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Button
                          onClick={() => router.push(loginPath)}
                          className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
                        >
                          Sign in to continue
                        </Button>
                        <Button
                          variant="outline"
                          onClick={fetchCurrentUser}
                          disabled={isUserLoading}
                          className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Refresh status
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-6">
              {/* Guidelines */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="border-0 shadow-lg dark:bg-slate-800/50 dark:border dark:border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                      <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      Writing Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm dark:text-gray-300">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Use clear, engaging titles that describe your content</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Include practical tips and actionable advice</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Support your points with personal experience or data</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>Use markdown formatting for better readability</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Benefits */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="border-0 shadow-lg dark:bg-slate-800/50 dark:border dark:border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                      <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Why Contribute?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                        <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <div className="font-medium text-sm dark:text-white">Share Knowledge</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Help fellow farmers succeed</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <Star className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-medium text-sm dark:text-white">Build Authority</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Establish yourself as an expert</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                        <Sparkles className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <div>
                          <div className="font-medium text-sm dark:text-white">Community Impact</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">Make a difference in agriculture</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Process */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Card className="border-0 shadow-lg bg-white dark:bg-slate-800/50 dark:border dark:border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 dark:text-white">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      Review Process
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8, duration: 0.3 }}
                      className="flex items-center space-x-3"
                    >
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                        Step 1
                      </Badge>
                      <span className="text-sm dark:text-gray-300">Submit your post for review</span>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0, duration: 0.3 }}
                      className="flex items-center space-x-3"
                    >
                      <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700">
                        Step 2
                      </Badge>
                      <span className="text-sm dark:text-gray-300">Our team reviews within 24-48 hours</span>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2, duration: 0.3 }}
                      className="flex items-center space-x-3"
                    >
                      <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700">
                        Step 3
                      </Badge>
                      <span className="text-sm dark:text-gray-300">You&apos;ll receive an email notification</span>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.4, duration: 0.3 }}
                      className="flex items-center space-x-3"
                    >
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700">
                        Step 4
                      </Badge>
                      <span className="text-sm dark:text-gray-300">If approved, your post goes live</span>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}