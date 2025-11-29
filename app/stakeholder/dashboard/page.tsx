import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ApiKeyManager from '@/components/api-keys/api-key-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package, 
  HandHeart,
  Building2,
  Store
} from 'lucide-react';
import Link from 'next/link';

export default async function StakeholderDashboard() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'STAKEHOLDER') {
    redirect('/auth/login');
  }

  // Fetch stakeholder statistics
  const [
    totalSellers,
    totalCompanies,
    totalProducts,
    activeSponsorships,
    recentSponsorships
  ] = await Promise.all([
    prisma.user.count({
      where: { role: 'SELLER' }
    }),
    prisma.user.count({
      where: { role: 'COMPANY' }
    }),
    prisma.product.count(),
    prisma.sponsorship.count({
      where: { status: 'ACTIVE' }
    }),
    prisma.sponsorship.findMany({
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  const stats = [
    {
      title: 'Total Sellers',
      value: totalSellers,
      icon: Store,
      description: 'Active sellers',
      color: 'text-blue-600'
    },
    {
      title: 'Total Companies',
      value: totalCompanies,
      icon: Building2,
      description: 'Active companies',
      color: 'text-green-600'
    },
    {
      title: 'Total Products',
      value: totalProducts,
      icon: Package,
      description: 'Listed products',
      color: 'text-purple-600'
    },
    {
      title: 'Active Sponsorships',
      value: activeSponsorships,
      icon: HandHeart,
      description: 'Ongoing partnerships',
      color: 'text-orange-600'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'ACTIVE': return 'bg-blue-100 text-blue-800';
      case 'EXPIRED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-2">Monitor marketplace performance and partnership opportunities.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Marketplace Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Marketplace Overview</CardTitle>
            <CardDescription>Key insights into the poultry marketplace ecosystem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 border rounded-lg">
                <Users className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                <div className="text-2xl font-bold">{totalSellers + totalCompanies}</div>
                <div className="text-sm text-gray-600">Total Vendors</div>
              </div>
              
              <div className="text-center p-6 border rounded-lg">
                <Package className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <div className="text-2xl font-bold">{totalProducts}</div>
                <div className="text-sm text-gray-600">Products Available</div>
              </div>
              
              <div className="text-center p-6 border rounded-lg">
                <TrendingUp className="mx-auto h-8 w-8 text-purple-600 mb-2" />
                <div className="text-2xl font-bold">+15%</div>
                <div className="text-sm text-gray-600">Growth This Month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Sponsorships */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sponsorship Activity</CardTitle>
            <CardDescription>Latest partnerships in the marketplace</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSponsorships.length === 0 ? (
              <div className="text-center py-8">
                <HandHeart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sponsorships yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Sponsorship activities will appear here as they happen.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSponsorships.map((sponsorship) => (
                  <div key={sponsorship.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <HandHeart className="h-8 w-8 text-gray-400" />
                      <div>
  <p className="text-sm font-medium text-gray-900">
    {sponsorship.company.name} → {sponsorship.seller?.name ?? 'Unknown Seller'}
  </p>
  <p className="text-sm text-gray-500">
    Ksh{sponsorship.amount.toFixed(2)} sponsorship
  </p>
  <p className="text-xs text-gray-400">
    {new Date(sponsorship.createdAt).toLocaleDateString()}
  </p>
</div>

                    </div>
                    <Badge className={getStatusColor(sponsorship?.status)}>
                      {sponsorship.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Future Features Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Stakeholder Features</CardTitle>
            <CardDescription>Advanced features for stakeholder management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-2">Investment Tracking</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Monitor your investments across different sellers and companies.
                </p>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-2">Revenue Analytics</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Detailed analytics on revenue sharing and performance metrics.
                </p>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-2">Voting System</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Participate in marketplace governance and decision making.
                </p>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-2">Portfolio Management</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Manage your portfolio of marketplace investments.
                </p>
                <Button variant="outline" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ApiKeyManager
          title="API Keys"
          description="Distribute or rotate keys for stakeholder analytics and reporting integrations."
        />
      </div>
    </DashboardLayout>
  );
}