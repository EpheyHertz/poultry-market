'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { BellRing, CalendarDays, Plus, Pencil, Trash2 } from 'lucide-react'

type Flock = {
  id: string
  name: string
}

type Reminder = {
  id: string
  title: string
  description?: string | null
  type: 'EMAIL' | 'IN_APP' | 'SMS'
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  customInterval?: number | null
  timeOfDay?: string | null
  dayOfWeek?: number | null
  nextTriggerAt?: string | null
  lastSentAt?: string | null
  isActive: boolean
  flockId?: string | null
  flock?: Flock | null
}

type ReminderForm = {
  title: string
  description: string
  type: Reminder['type']
  frequency: Reminder['frequency']
  customInterval: string
  timeOfDay: string
  dayOfWeek: string
  nextTriggerAt: string
  flockId: string
  isActive: boolean
}

const INITIAL_FORM: ReminderForm = {
  title: '',
  description: '',
  type: 'EMAIL',
  frequency: 'ONCE',
  customInterval: '',
  timeOfDay: '',
  dayOfWeek: '',
  nextTriggerAt: '',
  flockId: 'none',
  isActive: true,
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not scheduled'
  return new Date(value).toLocaleString()
}

export default function FarmRemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [flocks, setFlocks] = useState<Flock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null)
  const [form, setForm] = useState<ReminderForm>(INITIAL_FORM)

  const activeCount = useMemo(() => reminders.filter((reminder) => reminder.isActive).length, [reminders])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [remindersRes, flocksRes] = await Promise.all([
        fetch('/api/reminders', { cache: 'no-store' }),
        fetch('/api/farm/flocks', { cache: 'no-store' }),
      ])

      const [remindersData, flocksData] = await Promise.all([remindersRes.json(), flocksRes.json()])

      if (!remindersRes.ok) throw new Error(remindersData.error || 'Failed to load reminders')
      if (!flocksRes.ok) throw new Error(flocksData.error || 'Failed to load flocks')

      setReminders(remindersData.reminders || [])
      setFlocks(flocksData.flocks || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load reminders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  function resetForm() {
    setEditingReminder(null)
    setForm({ ...INITIAL_FORM, nextTriggerAt: toDatetimeLocal(new Date().toISOString()) })
  }

  function openCreateDialog() {
    resetForm()
    setDialogOpen(true)
  }

  function openEditDialog(reminder: Reminder) {
    setEditingReminder(reminder)
    setForm({
      title: reminder.title,
      description: reminder.description || '',
      type: reminder.type,
      frequency: reminder.frequency,
      customInterval: reminder.customInterval ? String(reminder.customInterval) : '',
      timeOfDay: reminder.timeOfDay || '',
      dayOfWeek: reminder.dayOfWeek === null || reminder.dayOfWeek === undefined ? '' : String(reminder.dayOfWeek),
      nextTriggerAt: toDatetimeLocal(reminder.nextTriggerAt),
      flockId: reminder.flockId || 'none',
      isActive: reminder.isActive,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error('Reminder title is required')
      return
    }

    if (form.frequency === 'CUSTOM' && (!form.customInterval || Number(form.customInterval) <= 0)) {
      toast.error('Custom interval must be greater than zero')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        frequency: form.frequency,
        customInterval: form.customInterval ? Number(form.customInterval) : null,
        timeOfDay: form.timeOfDay || null,
        dayOfWeek: form.dayOfWeek === '' ? null : Number(form.dayOfWeek),
        nextTriggerAt: form.nextTriggerAt ? new Date(form.nextTriggerAt).toISOString() : null,
        flockId: form.flockId === 'none' ? null : form.flockId,
        isActive: form.isActive,
      }

      const response = await fetch(editingReminder ? `/api/reminders/${editingReminder.id}` : '/api/reminders', {
        method: editingReminder ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save reminder')

      toast.success(editingReminder ? 'Reminder updated' : 'Reminder created')
      setDialogOpen(false)
      resetForm()
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save reminder')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setSaving(true)
    try {
      const response = await fetch(`/api/reminders/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete reminder')

      toast.success('Reminder deleted')
      setDeleteTarget(null)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete reminder')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
        <section className="rounded-3xl border border-border bg-gradient-to-br from-card via-background to-emerald-50/40 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Farm Reminders</h1>
              <p className="mt-2 text-muted-foreground">
                Schedule health checks, feed follow-ups, and email alerts that fire automatically through cron.
              </p>
            </div>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Add Reminder
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total reminders</p>
                <p className="mt-2 text-2xl font-semibold">{reminders.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Active reminders</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-600">{activeCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked flocks</p>
                <p className="mt-2 text-2xl font-semibold text-blue-600">{flocks.length}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-emerald-600" />
              Reminder List
            </CardTitle>
            <CardDescription>Manage scheduled reminders and their next trigger times.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading reminders...</p>
            ) : reminders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No reminders yet. Create one to start automated follow-ups.
              </p>
            ) : (
              <div className="grid gap-3">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{reminder.title}</p>
                          <Badge variant={reminder.isActive ? 'default' : 'secondary'}>
                            {reminder.isActive ? 'Active' : 'Paused'}
                          </Badge>
                          <Badge variant="outline">{reminder.frequency}</Badge>
                          <Badge variant="outline">{reminder.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{reminder.description || 'No description provided'}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Next: {formatDateTime(reminder.nextTriggerAt)}
                          </span>
                          <span>Flock: {reminder.flock?.name || 'Unassigned'}</span>
                          {reminder.timeOfDay && <span>Time: {reminder.timeOfDay}</span>}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => openEditDialog(reminder)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDeleteTarget(reminder)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add Reminder'}</DialogTitle>
            <DialogDescription>
              Set up automatic follow-ups for recurring farm tasks and email reminders.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" className="mt-1.5" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="mt-1.5"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div>
              <Label>Reminder Type</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as Reminder['type'] })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="IN_APP">In-app</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(value) => setForm({ ...form, frequency: value as Reminder['frequency'] })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONCE">Once</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nextTriggerAt">Next Trigger</Label>
              <Input id="nextTriggerAt" type="datetime-local" className="mt-1.5" value={form.nextTriggerAt} onChange={(event) => setForm({ ...form, nextTriggerAt: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="timeOfDay">Time of Day</Label>
              <Input id="timeOfDay" type="time" className="mt-1.5" value={form.timeOfDay} onChange={(event) => setForm({ ...form, timeOfDay: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="dayOfWeek">Day of Week</Label>
              <Select value={form.dayOfWeek || 'none'} onValueChange={(value) => setForm({ ...form, dayOfWeek: value === 'none' ? '' : value })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="customInterval">Custom Interval (days)</Label>
              <Input id="customInterval" type="number" min="1" className="mt-1.5" value={form.customInterval} onChange={(event) => setForm({ ...form, customInterval: event.target.value })} />
            </div>
            <div>
              <Label>Flock</Label>
              <Select value={form.flockId} onValueChange={(value) => setForm({ ...form, flockId: value })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select flock" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No flock selected</SelectItem>
                  {flocks.map((flock) => (
                    <SelectItem key={flock.id} value={flock.id}>
                      {flock.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isActive">Active reminder</Label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {editingReminder ? 'Save Changes' : 'Create Reminder'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.title || 'the selected reminder'}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  )
}
