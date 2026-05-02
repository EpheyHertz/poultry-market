 'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeToggleLarge } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';

function MiniBar({ value }: { value: number }) {
  return (
    <div className="flex-1 h-32 flex items-end">
      <div className="w-full bg-gradient-to-t from-pfs-green to-pfs-accent rounded-t-lg" style={{ height: `${value}%` }} />
    </div>
  );
}

export default function PerformancePage() {
  const sample = [20, 40, 60, 80, 50, 70];

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Performance</h1>
        <ThemeToggleLarge />
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Farm Performance</CardTitle>
          <CardDescription>Quick charts and export options.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm text-muted-foreground">Placeholder performance charts. Charts will be interactive and exportable (CSV/PDF).</div>
          <div className="flex gap-3 mb-4">
            {sample.map((s, i) => (
              <MiniBar key={i} value={s} />
            ))}
          </div>
          <div className="flex gap-2">
            <Button>Export CSV</Button>
            <Button>Export PDF</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
