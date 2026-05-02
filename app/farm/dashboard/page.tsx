'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/contexts/farm-context';
import { FarmStatsCard } from '@/components/farm/farm-stats-card';
import { ProductionChart } from '@/components/farm/production-chart';
import { HealthAlertBadge } from '@/components/farm/health-alert-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/dashboard-layout';
import {
  Bird,
  AlertCircle,
  TrendingUp,
  Zap,
  Pill,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

export default function FarmDashboard() {
  const { stats, getHealthAlerts, flocks, recalculateStats } = useFarm();
  const alerts = getHealthAlerts();
  const [productionData, setProductionData] = useState<Array<{ date: string; eggs: number; damaged: number }>>([]);

  useEffect(() => {
    recalculateStats();
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const response = await fetch('/api/farm/dashboard', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load dashboard data');
        }

        if (!mounted) return;

        const series = (data.recentEggEntries || [])
          .slice()
          .reverse()
          .map((entry: { recordedOn: string; quantity: number; damagedCount: number }) => ({
            date: new Date(entry.recordedOn).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
            eggs: entry.quantity,
            damaged: entry.damagedCount,
          }));

        setProductionData(series);
      } catch (error) {
        console.error('Failed to load dashboard series', error);
        if (mounted) {
          setProductionData([]);
        }
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Farm Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your farm operations and performance metrics
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <FarmStatsCard
            title="Total Flocks"
            value={stats.totalFlocks}
            description="Active poultry groups"
            icon={Bird}
            trend={{ value: 2, isPositive: true }}
          />
          <FarmStatsCard
            title="Total Birds"
            value={stats.totalBirds.toLocaleString()}
            description="Across all flocks"
            icon={TrendingUp}
          />
          <FarmStatsCard
            title="Feed Stock (Days)"
            value={stats.feedStockDays}
            description="Days of feed supply"
            icon={Zap}
            trend={{ value: 8, isPositive: true }}
          />
          <FarmStatsCard
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            description="Current month sales"
            icon={DollarSign}
            trend={{ value: 15, isPositive: true }}
          />
        </div>

        <ProductionChart data={productionData} />

        {/* Health Alerts & Performance */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Health Alerts */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Health Alerts
              </CardTitle>
              <CardDescription>
                {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No health alerts. Farm is in good condition.</p>
              ) : (
                <>
                  {alerts.slice(0, 4).map((alert) => (
                    <HealthAlertBadge
                      key={alert.id}
                      severity={alert.severity}
                      message={alert.description}
                    />
                  ))}
                  {alerts.length > 4 && (
                    <Link href="/farm/health">
                      <Button variant="outline" className="w-full">
                        View All Alerts
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Current farm statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Average FCR</span>
                <span className="font-semibold">{stats.averageFCR.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">Mortality Rate</span>
                <span className="font-semibold">{stats.mortalityRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Active Flocks</span>
                <span className="font-semibold">{flocks.filter(f => f.status === 'ACTIVE').length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to farm management sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/farm/flocks">
                <Button className="w-full justify-between" variant="outline">
                  <span className="flex items-center gap-2">
                    <Bird className="h-4 w-4" />
                    Manage Flocks
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/farm/health">
                <Button className="w-full justify-between" variant="outline">
                  <span className="flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Health Records
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/farm/feed">
                <Button className="w-full justify-between" variant="outline">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Feed Inventory
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/farm/sales">
                <Button className="w-full justify-between" variant="outline">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Sales Records
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/farm/reports">
                <Button className="w-full justify-between" variant="outline">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Reports
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
