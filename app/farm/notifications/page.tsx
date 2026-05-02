 'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeToggleLarge } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <ThemeToggleLarge />
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage notification channels and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Placeholder notifications UI. Toggle email / SMS / in-app settings.</p>
          <div className="flex gap-2">
            <Button>Enable Email</Button>
            <Button>Enable SMS</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
