'use client'

import DashboardLayout from '@/components/layout/dashboard-layout'
import { ThemeToggleLarge } from '@/components/theme/theme-toggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { BellRing, Camera, CheckCircle2, Globe2, Mail, Shield, Sparkles, Smartphone, Upload } from 'lucide-react'

const toggleRows = [
  {
    title: 'Email reminders',
    description: 'Send vaccination, feed, and health follow-up reminders to your inbox.',
  },
  {
    title: 'Low stock alerts',
    description: 'Receive notifications when feed inventory drops below the reorder threshold.',
  },
  {
    title: 'Critical health notices',
    description: 'Highlight urgent mortality and disease events with stronger emphasis.',
  },
]

export default function FarmSettingsPage() {
  return (
    <DashboardLayout>
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.78))]" />

        <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="overflow-hidden rounded-[2rem] border border-border bg-card/90 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  Farm Control Center
                </div>

                <div className="space-y-3">
                  <h1 className="max-w-2xl text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                    Settings that feel as polished as the dashboard.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                    Tune notifications, brand details, and farm defaults from one responsive workspace built for quick decisions on mobile and desktop.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge className="gap-1 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 hover:bg-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Live alerts
                  </Badge>
                  <Badge className="gap-1 rounded-full bg-blue-100 px-3 py-1 text-blue-700 hover:bg-blue-100">
                    <Shield className="h-3.5 w-3.5" />
                    Secure defaults
                  </Badge>
                  <Badge className="gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100">
                    <Smartphone className="h-3.5 w-3.5" />
                    Mobile first
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
                    <p className="font-semibold text-foreground">Healthy configuration</p>
                    <p className="text-sm text-muted-foreground">Last synced a few moments ago.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-emerald-600" />
                  Notifications
                </CardTitle>
                <CardDescription>Choose how the farm keeps you informed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {toggleRows.map((row) => (
                  <div key={row.title} className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{row.title}</p>
                      <p className="text-sm text-muted-foreground">{row.description}</p>
                    </div>
                    <div className="mt-1 h-6 w-12 rounded-full bg-emerald-500/20 p-1">
                      <div className="h-4 w-4 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <BellRing className="h-4 w-4" />
                    Reminder delivery
                  </div>
                  <p className="mt-2 leading-6 text-emerald-800">
                    Reminder emails are powered by Gmail + Nodemailer and can be triggered by Vercel Cron.
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
                <CardDescription>Brand your farm workspace with practical details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="farmName">Farm name</Label>
                  <Input id="farmName" className="mt-1.5" placeholder="Green Acres Poultry Farm" />
                </div>
                <div>
                  <Label htmlFor="contactEmail">Contact email</Label>
                  <Input id="contactEmail" className="mt-1.5" placeholder="hello@yourfarm.co.ke" />
                </div>
                <div>
                  <Label htmlFor="location">Primary location</Label>
                  <Input id="location" className="mt-1.5" placeholder="Kiambu, Kenya" />
                </div>
                <div>
                  <Label htmlFor="notes">Farm notes</Label>
                  <Textarea
                    id="notes"
                    className="mt-1.5 min-h-28"
                    placeholder="Add operating hours, delivery notes, or special management instructions."
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
                <CardDescription>Upload visuals that make the farm workspace stand out.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center">
                  <Upload className="mx-auto h-7 w-7 text-muted-foreground" />
                  <p className="mt-3 font-semibold text-foreground">Logo upload</p>
                  <p className="mt-1 text-sm text-muted-foreground">Square image recommended</p>
                  <Button className="mt-4 w-full" variant="outline">Choose file</Button>
                </div>
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center">
                  <Camera className="mx-auto h-7 w-7 text-muted-foreground" />
                  <p className="mt-3 font-semibold text-foreground">Banner image</p>
                  <p className="mt-1 text-sm text-muted-foreground">Use a wide hero image</p>
                  <Button className="mt-4 w-full" variant="outline">Upload banner</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/20">
              <CardHeader>
                <CardTitle className="text-white">Ready-to-save checklist</CardTitle>
                <CardDescription className="text-emerald-50/80">
                  A compact summary for mobile operators.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-emerald-50">
                <div className="rounded-2xl bg-white/10 p-3">Notifications are enabled for live farm alerts.</div>
                <div className="rounded-2xl bg-white/10 p-3">Theme toggle is available at the top of the page.</div>
                <div className="rounded-2xl bg-white/10 p-3">Reminder delivery is linked to email automation.</div>
                <Button className="mt-2 w-full bg-white text-emerald-700 hover:bg-emerald-50">Save settings</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
