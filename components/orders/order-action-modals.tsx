'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, X, Star } from 'lucide-react';
import Image from 'next/image';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onSuccess?: () => void;
}

// Confirm Payment Modal (Admin)
export function ConfirmPaymentModal({ isOpen, onClose, orderId, onSuccess }: BaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to confirm payment');
      }

      toast({
        title: 'Payment Confirmed',
        description: 'The payment has been successfully confirmed.',
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogDescription>
            Manually confirm that the payment has been received for this order.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this payment confirmation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Approve Order Modal (Seller)
export function ApproveOrderModal({ isOpen, onClose, orderId, onSuccess }: BaseModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/seller/orders/${orderId}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve order');
      }

      toast({
        title: 'Order Approved',
        description: 'The order has been approved and customer has been notified.',
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Order</DialogTitle>
          <DialogDescription>
            Approve this order to proceed with packing and delivery.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            By approving this order, you confirm that:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Payment has been received and confirmed</li>
            <li>Products are available in stock</li>
            <li>You can fulfill this order</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Approve Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Update Status Modal (Seller)
export function UpdateStatusModal({ isOpen, onClose, orderId, currentStatus, onSuccess }: BaseModalProps & { currentStatus: string }) {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const { toast } = useToast();

  const statusOptions = [
    { value: 'PACKED', label: 'Packed', enabled: currentStatus === 'APPROVED' },
    { value: 'READY_FOR_DELIVERY', label: 'Ready for Delivery', enabled: currentStatus === 'PACKED' },
    { value: 'IN_TRANSIT', label: 'In Transit', enabled: currentStatus === 'READY_FOR_DELIVERY' },
    { value: 'REACHED_COLLECTION_POINT', label: 'Reached Collection Point', enabled: currentStatus === 'IN_TRANSIT' },
    { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup', enabled: currentStatus === 'REACHED_COLLECTION_POINT' },
    { value: 'DELIVERED', label: 'Delivered', enabled: currentStatus === 'IN_TRANSIT' || currentStatus === 'READY_FOR_PICKUP' },
  ].filter((option) => option.enabled);

  const handleUpdate = async () => {
    if (!newStatus) {
      toast({
        title: 'Error',
        description: 'Please select a status',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/seller/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }

      toast({
        title: 'Status Updated',
        description: 'Order status has been updated successfully.',
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
          <DialogDescription>
            Update the status of this order to track its progress.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Mark as Received Modal (Customer)
export function MarkReceivedModal({ isOpen, onClose, orderId, onSuccess }: BaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast({
        title: 'Too many images',
        description: 'You can upload a maximum of 5 images',
        variant: 'destructive',
      });
      return;
    }

    setImages([...images, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages(images.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Upload images first if any
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((image) => formData.append('files', image));

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload images');
        }

        const uploadData = await uploadResponse.json();
        imageUrls = uploadData.urls;
      }

      // Submit receipt confirmation
      const response = await fetch(`/api/customer/orders/${orderId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryProofImages: imageUrls,
          deliveryProofMessage: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark order as received');
      }

      toast({
        title: 'Order Received',
        description: 'Thank you for confirming receipt of your order!',
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mark Order as Received</DialogTitle>
          <DialogDescription>
            Confirm that you have received your order. You can optionally add photos and a message.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add any comments about your delivery..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Delivery Photos (optional)</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
                disabled={images.length >= 5}
              />
              <label
                htmlFor="image-upload"
                className={`flex flex-col items-center justify-center cursor-pointer ${
                  images.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {images.length >= 5 ? 'Maximum 5 images' : 'Click to upload images'}
                </p>
              </label>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Review Modal (Customer)
export function ReviewModal({ isOpen, onClose, orderId, productId, productName, onSuccess }: BaseModalProps & { productId: string; productName: string }) {
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a rating before submitting',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/customer/orders/${orderId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rating,
          comment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit review');
      }

      toast({
        title: 'Review Submitted',
        description: 'Thank you for your feedback!',
      });
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>
            Share your experience with {productName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Your Review (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell us about your experience with this product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
