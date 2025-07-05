
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Truck, Clock } from 'lucide-react'

interface DeliveryStatusUpdaterProps {
  delivery: {
    id: string
    status: string
    trackingId: string
  }
}

export default function DeliveryStatusUpdater({ delivery }: DeliveryStatusUpdaterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const statusOptions = [
    { value: 'PICKED_UP', label: 'Picked Up' },
    { value: 'IN_TRANSIT', label: 'In Transit' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'FAILED', label: 'Failed' }
  ]

  const handleStatusUpdate = async () => {
    if (!newStatus) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/delivery/${delivery.id}/update-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: notes.trim()
        }),
      })

      if (response.ok) {
        setIsOpen(false)
        setNewStatus('')
        setNotes('')
        window.location.reload() // Refresh to show updated status
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Status update error:', error)
      alert('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Clock className="h-4 w-4 mr-2" />
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Delivery Status</DialogTitle>
          <DialogDescription>
            Update the status for delivery #{delivery.trackingId}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about the delivery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusUpdate} 
              disabled={!newStatus || isUpdating}
            >
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
