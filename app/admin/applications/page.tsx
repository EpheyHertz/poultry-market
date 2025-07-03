'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminApplications() {
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'ADMIN') {
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
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/applications');
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  };

  const handleReview = async (applicationId: string, status: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          reviewNotes
        }),
      });

      if (response.ok) {
        toast.success(`Application ${status.toLowerCase()} successfully!`);
        setSelectedApplication(null);
        setReviewNotes('');
        fetchApplications();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update application');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
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
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role Applications</h1>
          <p className="text-gray-600 mt-2">Review and manage user role change requests</p>
        </div>

        {/* Applications List */}
        <Card>
          <CardHeader>
            <CardTitle>All Applications</CardTitle>
            <CardDescription>Review applications from users wanting to change roles</CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No applications</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No role applications to review at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => {
                  const StatusIcon = getStatusIcon(application.status);
                  return (
                    <div key={application.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <StatusIcon className="h-8 w-8 text-gray-400" />
                          <div>
                            <h3 className="text-lg font-medium">
                              {application.user.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {application.user.email} • Wants to become: {application.requestedRole.toLowerCase()}
                            </p>
                            <p className="text-sm text-gray-500">
                              Business: {application.businessName} ({application.businessType})
                            </p>
                            <p className="text-xs text-gray-400">
                              Submitted {new Date(application.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(application.status)}>
                            {application.status}
                          </Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedApplication(application)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Application Review</DialogTitle>
                                <DialogDescription>
                                  Review {application.user.name}'s application to become a {application.requestedRole.toLowerCase()}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium">Applicant Information</h4>
                                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                                    <p><strong>Name:</strong> {application.user.name}</p>
                                    <p><strong>Email:</strong> {application.user.email}</p>
                                    <p><strong>Phone:</strong> {application.user.phone || 'Not provided'}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium">Business Information</h4>
                                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                                    <p><strong>Business Name:</strong> {application.businessName}</p>
                                    <p><strong>Business Type:</strong> {application.businessType}</p>
                                    <p><strong>Requested Role:</strong> {application.requestedRole}</p>
                                  </div>
                                </div>

                                {application.description && (
                                  <div>
                                    <h4 className="font-medium">Description</h4>
                                    <p className="mt-2 text-sm text-gray-600">{application.description}</p>
                                  </div>
                                )}

                                {application.documents.length > 0 && (
                                  <div>
                                    <h4 className="font-medium">Supporting Documents</h4>
                                    <div className="mt-2 space-y-2">
                                      {application.documents.map((doc: string, index: number) => (
                                        <div key={index} className="flex items-center space-x-2">
                                          <Download className="h-4 w-4 text-gray-400" />
                                          <a 
                                            href={doc} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 hover:underline"
                                          >
                                            Document {index + 1}
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {application.status === 'PENDING' && (
                                  <div>
                                    <Label htmlFor="reviewNotes">Review Notes</Label>
                                    <Textarea
                                      id="reviewNotes"
                                      value={reviewNotes}
                                      onChange={(e) => setReviewNotes(e.target.value)}
                                      placeholder="Add notes about your decision..."
                                      rows={3}
                                      className="mt-1"
                                    />
                                  </div>
                                )}

                                {application.reviewNotes && (
                                  <div>
                                    <h4 className="font-medium">Previous Review Notes</h4>
                                    <p className="mt-2 text-sm text-gray-600">{application.reviewNotes}</p>
                                  </div>
                                )}

                                {application.status === 'PENDING' && (
                                  <div className="flex space-x-2 pt-4">
                                    <Button
                                      onClick={() => handleReview(application.id, 'APPROVED')}
                                      disabled={isLoading}
                                      className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button
                                      onClick={() => handleReview(application.id, 'REJECTED')}
                                      disabled={isLoading}
                                      variant="destructive"
                                      className="flex-1"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}