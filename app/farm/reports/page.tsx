'use client';

import DashboardLayout from '@/components/layout/dashboard-layout';
import { useFarm } from '@/contexts/farm-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, TrendingUp, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ReportsPage() {
  const { flocks, salesRecords, healthRecords, feedInventory, stats, getMonthlySales } = useFarm();

  const handleExportCSV = () => {
    const headers = ['Flock Name', 'Breed', 'Quantity', 'Status', 'Mortality %', 'FCR'];
    const data = flocks.map((f) => [
      f.name,
      f.breed,
      f.quantity,
      f.status,
      f.mortality.toFixed(2),
      f.FCR.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flock-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text('Farm Performance Report', 14, 22);

    // Report Date
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 32);

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Summary', 14, 45);

    const summaryData = [
      ['Total Flocks', stats.totalFlocks.toString()],
      ['Total Birds', stats.totalBirds.toLocaleString()],
      ['Average FCR', stats.averageFCR.toFixed(2)],
      ['Mortality Rate', `${stats.mortalityRate.toFixed(2)}%`],
      ['Monthly Revenue', `$${getMonthlySales(1).toFixed(2)}`],
    ];

    (doc as any).autoTable({
      startY: 50,
      head: [['Metric', 'Value']],
      body: summaryData,
    });

    // Flock Details
    const flockData = flocks.map((f) => [
      f.name,
      f.breed,
      f.quantity,
      f.status,
      f.mortality.toFixed(2),
      f.FCR.toFixed(2),
    ]);

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Flock', 'Breed', 'Quantity', 'Status', 'Mortality %', 'FCR']],
      body: flockData,
    });

    // Sales Summary
    const salesData = salesRecords.slice(0, 5).map((s) => [
      s.date.toLocaleDateString(),
      s.productType.replace('_', ' '),
      s.quantity,
      s.unit,
      `$${s.pricePerUnit.toFixed(2)}`,
      `$${s.totalRevenue.toFixed(2)}`,
    ]);

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Date', 'Product', 'Quantity', 'Unit', 'Price', 'Revenue']],
      body: salesData,
    });

    // Save PDF
    doc.save(`farm-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Farm Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate and export farm performance reports
          </p>
        </div>

        {/* Report Summary Cards */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Report Period</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">This Month</div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flocks Tracked</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flocks.length}</div>
              <p className="text-xs text-muted-foreground">Active flocks</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Transactions</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salesRecords.length}</div>
              <p className="text-xs text-muted-foreground">Recorded sales</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${salesRecords.reduce((sum, s) => sum + s.totalRevenue, 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Export Reports</CardTitle>
            <CardDescription>Download performance data in your preferred format</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Button
                onClick={handleExportCSV}
                className="gap-2 justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Export Flocks (CSV)
              </Button>
              <Button
                onClick={handleExportPDF}
                className="gap-2 justify-start"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Full Report (PDF)
              </Button>
              <Button className="gap-2 justify-start" variant="outline">
                <Download className="h-4 w-4" />
                Financial Summary
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Performance Indicators */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Key Performance Indicators</CardTitle>
            <CardDescription>Farm health and productivity metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Average Feed Conversion Ratio</span>
                <span className="text-2xl font-bold">{stats.averageFCR.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Overall Mortality Rate</span>
                <span className="text-2xl font-bold text-orange-600">
                  {stats.mortalityRate.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Total Bird Population</span>
                <span className="text-2xl font-bold">{stats.totalBirds.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground">Health Alerts Active</span>
                <span className="text-2xl font-bold text-red-600">{stats.healthAlerts}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Details */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
            <CardDescription>Overview of tracked data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Health Records</p>
                <p className="text-2xl font-bold text-foreground mt-2">{healthRecords.length}</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Feed Types</p>
                <p className="text-2xl font-bold text-foreground mt-2">{feedInventory.length}</p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Feed Stock Value</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  $
                  {feedInventory
                    .reduce((sum, f) => sum + f.quantity * f.costPerUnit, 0)
                    .toFixed(2)}
                </p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">
                  ${getMonthlySales(1).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
