import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bird, Eye, MapPin, Package, PackageX, Plus, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';

import ApiKeyManager from '@/components/api-keys/api-key-manager';
import PendingInvitationsCard from '@/components/farm/pending-invitations-card';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { formatCurrency } from '@/lib/formatCurrency';
import { prisma } from '@/lib/prisma';
import {
  OPEN_ORDER_STATUSES,
  formatStatusLabel,
  getOrderStatusClassName,
} from '@/lib/seller-products';

export const dynamic = 'force-dynamic';

export default async function SellerDashboard() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'SELLER') {
    redirect('/auth/login');
  }

  const sellerProductFilter = { items: { some: { product: { sellerId: user.id } } } };

  const [
    products,
    activeProducts,
    outOfStockProducts,
    orders,
    openOrders,
    totalRevenue,
    recentOrders,
    flocks,
  ] = await Promise.all([
    prisma.product.count({ where: { sellerId: user.id } }),
    prisma.product.count({ where: { sellerId: user.id, isActive: true } }),
    prisma.product.count({ where: { sellerId: user.id, stock: { lte: 0 } } }),
    prisma.order.count({ where: sellerProductFilter }),
    prisma.order.count({
      where: { ...sellerProductFilter, status: { in: [...OPEN_ORDER_STATUSES] } },
    }),
    prisma.order.aggregate({
      where: { ...sellerProductFilter, status: 'DELIVERED' },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      where: sellerProductFilter,
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
          where: {
            product: {
              sellerId: user.id,
            },
          },
        },
        delivery: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.livestockFlock.count({ where: { sellerId: user.id } }),
  ]);

  const userEmail = user.email?.toLowerCase();
  const pendingInvitations = userEmail
    ? await prisma.farmMember.findMany({
      where: {
        status: 'PENDING',
        invitedEmail: userEmail,
        invitationExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            name: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        invitedAt: 'desc',
      },
    })
    : [];

  const pendingInvitationCards = pendingInvitations.map((invitation) => ({
    id: invitation.id,
    farmName: invitation.farm.name,
    roleName: invitation.role.name,
    invitedByName: invitation.invitedBy?.name ?? null,
    invitedByEmail: invitation.invitedBy?.email ?? null,
    invitedAt: invitation.invitedAt.toISOString(),
    expiresAt: invitation.invitationExpiresAt?.toISOString() ?? null,
  }));

  const stats = [
    {
      title: 'Products',
      value: products.toLocaleString(),
      icon: Package,
      description: `${activeProducts.toLocaleString()} published`,
    },
    {
      title: 'Out of stock',
      value: outOfStockProducts.toLocaleString(),
      icon: PackageX,
      description: 'Listings with no stock left',
    },
    {
      title: 'Orders',
      value: orders.toLocaleString(),
      icon: ShoppingCart,
      description: `${openOrders.toLocaleString()} awaiting action`,
    },
    {
      title: 'Delivered revenue',
      value: formatCurrency(totalRevenue._sum.total || 0),
      icon: Wallet,
      description: 'From delivered orders',
    },
    {
      title: 'Flocks',
      value: flocks.toLocaleString(),
      icon: Bird,
      description: 'Internal livestock records',
    },
  ];

  const quickActions = [
    { href: '/seller/products/new', label: 'Add product', icon: Plus },
    { href: '/seller/products', label: 'Manage products', icon: Package },
    { href: '/seller/orders', label: 'View orders', icon: ShoppingCart },
    { href: '/seller/flocks', label: 'Manage flocks', icon: Bird },
    { href: '/seller/sponsorships', label: 'Sponsorships', icon: TrendingUp },
    { href: '/farm', label: 'Farm management', icon: MapPin },
  ];

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Welcome back, {user.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your products and track your sales performance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/seller/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Link>
            </Button>
            {user.dashboardSlug ? (
              <Button asChild variant="outline">
                <Link href={`/store/${user.dashboardSlug}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="mr-2 h-4 w-4" />
                  View store
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <PendingInvitationsCard invitations={pendingInvitationCards} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-border/70">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Quick actions</CardTitle>
            <CardDescription>Jump straight to the tools you use most.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => (
                <Button key={action.href} asChild variant="outline" className="justify-start">
                  <Link href={action.href}>
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Recent orders</CardTitle>
              <CardDescription>Latest orders that include your products.</CardDescription>
            </div>
            {recentOrders.length > 0 ? (
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link href="/seller/orders">View all orders</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-medium text-foreground">No orders yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Orders for your products will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Order #{order.id.slice(-8)}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.customer.name} • {order.items.length} item
                        {order.items.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {formatCurrency(order.total)}
                      </span>
                      <Badge variant="outline" className={getOrderStatusClassName(order.status)}>
                        {formatStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <ApiKeyManager
          title="API Keys"
          description="Use API keys to connect store data with external apps or automation scripts."
        />
      </div>
    </DashboardLayout>
  );
}
