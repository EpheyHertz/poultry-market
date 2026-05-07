'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { ThemeToggleLarge } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { FarmSwitcher } from '@/components/farm/farm-switcher'
import { useFarm } from '@/contexts/farm-context'
import { BellRing, Camera, CheckCircle2, Globe2, Mail, Shield } from 'lucide-react'

type EmailPreference = {
  dailyReminder: boolean
  weeklySummary: boolean
  inactivityAlerts: boolean
  vaccinationAlerts: boolean
}

type FarmSettings = {
  contactEmail?: string | null
  location?: string | null
  notes?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
}

const DEFAULT_PREFERENCES: EmailPreference = {
  dailyReminder: true,
  weeklySummary: true,
  inactivityAlerts: true,
  vaccinationAlerts: true,
}

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
]

export default function FarmSettingsPage() {
  const { activeFarmId, setActiveFarmId } = useFarm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [farmName, setFarmName] = useState('')
  const [settings, setSettings] = useState<FarmSettings>({})
  const [rawSettings, setRawSettings] = useState<Record<string, unknown>>({})
  const [preferences, setPreferences] = useState<EmailPreference>(DEFAULT_PREFERENCES)

  const canEdit = Boolean(activeFarmId) && !loading && !saving

  useEffect(() => {
    let active = true

    const loadSettings = async () => {
      if (!activeFarmId) {
        setFarmName('')
        setSettings({})
        setRawSettings({})
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const [farmRes, prefRes] = await Promise.all([
          fetch(`/api/farms/${activeFarmId}`, { cache: 'no-store' }),
          fetch('/api/farm/email-preferences', { cache: 'no-store' }),
        ])

        const [farmBody, prefBody] = await Promise.all([farmRes.json(), prefRes.json()])

        if (!farmRes.ok) {
          throw new Error(farmBody.error || 'Failed to load farm settings')
        }
        if (!prefRes.ok) {
          throw new Error(prefBody.error || 'Failed to load email preferences')
        }

        if (active) {
          const farm = farmBody.farm
          const farmSettings = (farm?.settings || {}) as Record<string, unknown>
          setFarmName(farm?.name || '')
          setRawSettings(farmSettings)
          setSettings({
            contactEmail: typeof farmSettings.contactEmail === 'string' ? farmSettings.contactEmail : '',
            location: typeof farmSettings.location === 'string' ? farmSettings.location : '',
            notes: typeof farmSettings.notes === 'string' ? farmSettings.notes : '',
            logoUrl: typeof farmSettings.logoUrl === 'string' ? farmSettings.logoUrl : '',
            bannerUrl: typeof farmSettings.bannerUrl === 'string' ? farmSettings.bannerUrl : '',
          })
          setPreferences({
            dailyReminder: prefBody.preference?.dailyReminder ?? true,
            weeklySummary: prefBody.preference?.weeklySummary ?? true,
            inactivityAlerts: prefBody.preference?.inactivityAlerts ?? true,
            vaccinationAlerts: prefBody.preference?.vaccinationAlerts ?? true,
          })
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load settings')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadSettings()

    return () => {
      active = false
    }
  }, [activeFarmId])

  const handlePreferenceToggle = (key: keyof EmailPreference, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!activeFarmId) return
    setSaving(true)
    try {
      const mergedSettings = {
        ...rawSettings,
        contactEmail: settings.contactEmail?.trim() || null,
        location: settings.location?.trim() || null,
        notes: settings.notes?.trim() || null,
        logoUrl: settings.logoUrl?.trim() || null,
        bannerUrl: settings.bannerUrl?.trim() || null,
      }

      const [farmRes, prefRes] = await Promise.all([
        fetch(`/api/farms/${activeFarmId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: farmName.trim() || undefined,
            settings: mergedSettings,
          }),
        }),
        fetch('/api/farm/email-preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        }),
      ])

      const [farmBody, prefBody] = await Promise.all([farmRes.json(), prefRes.json()])

      if (!farmRes.ok) {
        throw new Error(farmBody.error || 'Failed to update farm settings')
      }
      if (!prefRes.ok) {
        throw new Error(prefBody.error || 'Failed to update notification settings')
      }

      toast.success('Settings saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const statusLabel = useMemo(() => {
    if (!activeFarmId) return 'Select a farm to edit settings.'
    if (loading) return 'Loading farm settings...'
    if (saving) return 'Saving changes...'
    return 'Settings are ready to edit.'
  }, [activeFarmId, loading, saving])

  return (
    <DashboardLayout>
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.78))]" />

        <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="overflow-hidden rounded-[2rem] border border-border bg-card/90 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
              <div className="space-y-5">
                <div className="space-y-3">
                  <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Farm settings
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Update farm identity, notification preferences, and workspace defaults.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge className="gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {statusLabel}
                  </Badge>
                  <Badge className="gap-1 rounded-full bg-blue-100 px-3 py-1 text-blue-700 hover:bg-blue-100">
                    <Shield className="h-3.5 w-3.5" />
                    Access controlled
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 rounded-[1.5rem] border border-border bg-background/80 p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-50 to-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">Appearance</p>
                      <p className="text-sm text-muted-foreground">Switch light or dark quickly.</p>
                    </div>
                    <ThemeToggleLarge />
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-gradient-to-br from-blue-50 to-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-3 space-y-1">
                    <p className="font-semibold text-foreground">Configuration loaded</p>
                    <p className="text-sm text-muted-foreground">Review and save updates when ready.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50 p-4 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Farm</p>
                  <div className="mt-3">
                    <FarmSwitcher value={activeFarmId} onChange={setActiveFarmId} redirectTo="/farm/settings" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {!activeFarmId && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Select a farm to edit its settings.
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-emerald-600" />
                  Notifications
                </CardTitle>
                <CardDescription>Email preferences for operational alerts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {preferenceRows.map((row) => (
                  <div key={row.key} className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{row.title}</p>
                      <p className="text-sm text-muted-foreground">{row.description}</p>
                    </div>
                    <Switch
                      checked={preferences[row.key]}
                      onCheckedChange={(value) => handlePreferenceToggle(row.key, value)}
                      disabled={!canEdit}
                      aria-label={row.title}
                    />
                  </div>
                ))}

                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <BellRing className="h-4 w-4" />
                    Reminder delivery
                  </div>
                  <p className="mt-2 leading-6 text-emerald-800">
                    Reminder emails are queued daily. Update preferences to control delivery.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-blue-600" />
                  Farm Identity
                </CardTitle>
                <CardDescription>Core details used across reports and exports.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="farmName">Farm name</Label>
                  <Input
                    id="farmName"
                    className="mt-1.5"
                    placeholder="Green Acres Poultry Farm"
                    value={farmName}
                    onChange={(event) => setFarmName(event.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact email</Label>
                  <Input
                    id="contactEmail"
                    className="mt-1.5"
                    placeholder="hello@yourfarm.co.ke"
                    value={settings.contactEmail || ''}
                    onChange={(event) => setSettings((prev) => ({ ...prev, contactEmail: event.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Primary location</Label>
                  <Input
                    id="location"
                    className="mt-1.5"
                    placeholder="Kiambu, Kenya"
                    value={settings.location || ''}
                    onChange={(event) => setSettings((prev) => ({ ...prev, location: event.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Farm notes</Label>
                  <Textarea
                    id="notes"
                    className="mt-1.5 min-h-28"
                    placeholder="Add operating hours, delivery notes, or special management instructions."
                    value={settings.notes || ''}
                    onChange={(event) => setSettings((prev) => ({ ...prev, notes: event.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border bg-card shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-purple-600" />
                  Appearance & Media
                </CardTitle>
                <CardDescription>Reference hosted assets for reports and exports.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    className="mt-1.5"
                    placeholder="https://..."
                    value={settings.logoUrl || ''}
                    onChange={(event) => setSettings((prev) => ({ ...prev, logoUrl: event.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <Label htmlFor="bannerUrl">Banner URL</Label>
                  <Input
                    id="bannerUrl"
                    className="mt-1.5"
                    placeholder="https://..."
                    value={settings.bannerUrl || ''}
                    onChange={(event) => setSettings((prev) => ({ ...prev, bannerUrl: event.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/20">
              <CardHeader>
                <CardTitle className="text-white">Save changes</CardTitle>
                <CardDescription className="text-emerald-50/80">
                  Store farm identity and notification updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-emerald-50">
                <div className="rounded-2xl bg-white/10 p-3">Review changes before saving.</div>
                <div className="rounded-2xl bg-white/10 p-3">Settings apply to the selected farm.</div>
                <Button
                  className="mt-2 w-full bg-white text-emerald-700 hover:bg-emerald-50"
                  onClick={handleSave}
                  disabled={!canEdit}
                >
                  {saving ? 'Saving...' : 'Save settings'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
