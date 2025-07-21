'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSkeleton } from '@/components/loading';
import Loading from '@/components/loading';
import { 
  ArrowLeft,
  Clock, 
  CheckCircle, 
  XCircle,
  FileText,
  Download,
  User,
  Building2
} from 'lucide-react';
import Link from 'next/link';

function ApplicationDetailContent() {
  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.id as string;

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
    if (user && applicationId) {
      fetchApplication();
    }
  }, [user, applicationId]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/${applicationId}`);
      if (response.ok) {
        const applicationData = await response.json();
        setApplication(applicationData);
      } else {
        setError('Application not found');
      }
    } catch (error) {
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return Clock;
      case 'APPROVED': return CheckCircle;
      case 'REJECTED': return XCircle;
      default: return Clock;
    }
  };

  if (!user) {
    return <Loading fullScreen={true} text='Loading the page...' />;
  }

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading application...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !application) {
    return (
      <DashboardLayout user={user}>
        <div className="space-y-8">
          <div className="flex items-center space-x-4">
            <Link href="/customer/applications">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Application Not Found</h1>
            </div>
          </div>
          
          <Card>
            <CardContent className="text-center py-12">
              <XCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Application Not Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {error || 'The application you\'re looking for doesn\'t exist.'}
              </p>
              <div className="mt-6">
                <Link href="/customer/applications">
                  <Button>Back to Applications</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const StatusIcon = getStatusIcon(application.status);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/customer/applications">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Details</h1>
            <p className="text-gray-600 mt-2">View your role application status and details</p>
          </div>
        </div>

        {/* Application Overview */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <StatusIcon className="h-6 w-6" />
                  <span>{application.requestedRole.replace('_', ' ')} Application</span>
                </CardTitle>
                <CardDescription>
                  Submitted on {new Date(application.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(application.status)}>
                {application.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Business Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Business Name:</span>
                      <span className="ml-2 text-gray-600">{application.businessName}</span>
                    </div>
                    <div>
                      <span className="font-medium">Business Type:</span>
                      <span className="ml-2 text-gray-600">{application.businessType}</span>
                    </div>
                    <div>
                      <span className="font-medium">Requested Role:</span>
                      <span className="ml-2 text-gray-600">{application.requestedRole}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Applicant Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Applicant Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>
                      <span className="ml-2 text-gray-600">{application.user.name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>
                      <span className="ml-2 text-gray-600">{application.user.email}</span>
                    </div>
                    {application.user.phone && (
                      <div>
                        <span className="font-medium">Phone:</span>
                        <span className="ml-2 text-gray-600">{application.user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {application.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>Your application description</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{application.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Supporting Documents */}
        {application.documents && application.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Supporting Documents</span>
              </CardTitle>
              <CardDescription>Documents submitted with your application</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {application.documents.map((doc: string, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium">Document {index + 1}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={doc} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Information */}
        {application.reviewedAt && (
          <Card>
            <CardHeader>
              <CardTitle>Review Information</CardTitle>
              <CardDescription>
                Reviewed on {new Date(application.reviewedAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {application.reviewNotes ? (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Review Notes:</h4>
                  <p className="text-gray-700">{application.reviewNotes}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">No review notes provided.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Information */}
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Current status of your application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <StatusIcon className="h-8 w-8 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">
                  {application.status === 'PENDING' && 'Application Under Review'}
                  {application.status === 'APPROVED' && 'Application Approved'}
                  {application.status === 'REJECTED' && 'Application Rejected'}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {application.status === 'PENDING' && 
                    'Your application is being reviewed by our team. You\'ll receive a notification once a decision is made.'}
                  {application.status === 'APPROVED' && 
                    'Congratulations! Your application has been approved and your account role has been updated.'}
                  {application.status === 'REJECTED' && 
                    'Your application was not approved at this time. Please review the feedback and consider reapplying.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {application.status === 'REJECTED' && (
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>What you can do next</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Your application was not approved this time. You can submit a new application 
                  addressing the feedback provided.
                </p>
                <Link href="/customer/applications">
                  <Button>
                    Submit New Application
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ApplicationDetail() {
  return (
    <Suspense fallback={<Loading fullScreen={true} text='Loading application details...' />}>
      <ApplicationDetailContent />
    </Suspense>
  );
}