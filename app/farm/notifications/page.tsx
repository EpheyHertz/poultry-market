'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeToggleLarge } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

type EmailPreference = {
  dailyReminder: boolean;
  weeklySummary: boolean;
  inactivityAlerts: boolean;
  vaccinationAlerts: boolean;
};

const DEFAULT_PREFERENCES: EmailPreference = {
  dailyReminder: true,
  weeklySummary: true,
  inactivityAlerts: true,
  vaccinationAlerts: true,
};

const preferenceRows: Array<{ key: keyof EmailPreference; title: string; description: string }> = [
  {
    key: 'dailyReminder',
    title: 'Daily egg reminders',
    description: 'Send a reminder when no egg records are logged today.',
  },
  {
    key: 'weeklySummary',
    title: 'Weekly performance summary',
    description: 'Send a weekly snapshot of egg production and trends.',
  },
  {
    key: 'inactivityAlerts',
    title: 'Inactivity alerts',
    description: 'Notify when there is no production activity for several days.',
  },
  {
    key: 'vaccinationAlerts',
    title: 'Vaccination alerts',
    description: 'Send alerts for upcoming or overdue vaccinations.',
  },
];

export default function NotificationsPage() {
  const [preferences, setPreferences] = useState<EmailPreference>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPreferences = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/farm/email-preferences', { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load preferences');
        }

        if (active) {
          setPreferences({
            dailyReminder: payload.preference?.dailyReminder ?? true,
            weeklySummary: payload.preference?.weeklySummary ?? true,
            inactivityAlerts: payload.preference?.inactivityAlerts ?? true,
            vaccinationAlerts: payload.preference?.vaccinationAlerts ?? true,
          });
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load preferences');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  const handleToggle = (key: keyof EmailPreference, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/farm/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update preferences');
      }

      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <ThemeToggleLarge />
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage notification channels and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Email preferences apply to your account and all farms you manage.
            </p>

            <div className="space-y-3">
              {preferenceRows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{row.title}</p>
                    <p className="text-sm text-muted-foreground">{row.description}</p>
                  </div>
                  <Switch
                    checked={preferences[row.key]}
                    onCheckedChange={(value) => handleToggle(row.key, value)}
                    disabled={loading || saving}
                    aria-label={row.title}
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleSave} disabled={loading || saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {loading ? 'Loading preferences...' : 'Changes apply to future emails.'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
