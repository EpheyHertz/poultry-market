import { prisma } from './prisma'
import { NotificationType } from '@prisma/client'

interface NotificationData {
  receiverId: string
  senderId?: string
  orderId?: string
  type: NotificationType
  title: string
  message: string
}

export async function createNotification(data: NotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        ...data,
        sentAt: new Date()
      }
    })

    // Here you would integrate with actual email/SMS services
    if (data.type === 'EMAIL') {
      await sendEmail(data)
    } else if (data.type === 'SMS') {
      await sendSMS(data)
    }

    return notification
  } catch (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

async function sendEmail(data: NotificationData) {
  // Integration with email service (e.g., SendGrid, Resend, etc.)
  console.log('Sending email:', data.title, 'to user:', data.receiverId)

  // Example implementation:
  // const emailService = new EmailService()
  // await emailService.send({
  //   to: user.email,
  //   subject: data.title,
  //   html: data.message
  // })
}

async function sendSMS(data: NotificationData) {
  // Integration with SMS service (e.g., Twilio, Africa's Talking, etc.)
  console.log('Sending SMS:', data.title, 'to user:', data.receiverId)

  // Example implementation:
  // const smsService = new SMSService()
  // await smsService.send({
  //   to: user.phone,
  //   message: data.message
  // })
}

export const notificationTemplates = {
  orderConfirmed: (orderId: string) => ({
    title: 'Order Confirmed',
    message: `Your order #${orderId} has been confirmed and is being processed.`
  }),

  sponsorshipApproved: (sellerName: string) => ({
    title: 'Sponsorship Approved',
    message: `Your sponsorship proposal for ${sellerName} has been approved by the admin.`
  }),

  sponsorshipRejected: (sellerName: string) => ({
    title: 'Sponsorship Declined',
    message: `Your sponsorship proposal for ${sellerName} has been declined by the admin.`
  }),

  sponsorshipReceived: (companyName: string) => ({
    title: 'New Sponsorship Offer',
    message: `${companyName} has approved a sponsorship partnership with you.`
  }),

  sponsorshipDeclined: (companyName: string) => ({
    title: 'Sponsorship Declined',
    message: `The sponsorship proposal from ${companyName} has been declined.`
  }),
  orderPacked: (orderNumber: string) => ({
    title: 'Order Packed',
    message: `Your order #${orderNumber} has been packed and is ready for delivery.`
  }),

  orderDispatched: (orderNumber: string, trackingId: string, agentName: string) => ({
    title: 'Order Dispatched',
    message: `Your order #${orderNumber} has been dispatched. Tracking ID: ${trackingId}. Delivery agent: ${agentName}`
  }),

  orderPickedUp: (orderNumber: string, trackingId: string) => ({
    title: 'Order Picked Up',
    message: `Your order #${orderNumber} has been picked up by our delivery agent. Tracking ID: ${trackingId}`
  }),

  orderInTransit: (orderNumber: string, trackingId: string) => ({
    title: 'Order In Transit',
    message: `Your order #${orderNumber} is now in transit. Tracking ID: ${trackingId}`
  }),

  orderOutForDelivery: (orderNumber: string, trackingId: string) => ({
    title: 'Order Out for Delivery',
    message: `Your order #${orderNumber} is out for delivery. Tracking ID: ${trackingId}`
  }),

  orderDelivered: (orderNumber: string) => ({
    title: 'Order Delivered',
    message: `Your order #${orderNumber} has been delivered successfully.`
  }),

  orderRejected: (orderNumber: string, reason: string) => ({
    title: 'Order Rejected',
    message: `Your order #${orderNumber} has been rejected. Reason: ${reason}`
  }),

  newOrder: (orderNumber: string, paymentType: string) => ({
    title: 'New Order Received',
    message: `You have received a new order #${orderNumber}. Payment type: ${paymentType.replace('_', ' ').toLowerCase()}.`
  }),

  paymentSubmitted: (orderNumber: string) => ({
    title: 'Payment Submitted for Approval',
    message: `Customer has submitted payment details for order #${orderNumber}. Please review and approve.`
  }),

  paymentApproved: (orderNumber: string) => ({
    title: 'Payment Approved',
    message: `Your payment for order #${orderNumber} has been approved. Your order will be processed shortly.`
  }),

  paymentRejected: (orderNumber: string, reason?: string) => ({
    title: 'Payment Rejected',
    message: `Your payment for order #${orderNumber} has been rejected. ${reason ? `Reason: ${reason}` : 'Please contact support for assistance.'}`
  }),

  applicationApproved: (role: string) => ({
    title: 'Application Approved',
    message: `Congratulations! Your application to become a ${role} has been approved.`
  }),

  applicationRejected: (role: string) => ({
    title: 'Application Update',
    message: `Your application to become a ${role} has been reviewed. Please check your dashboard for details.`
  }),

  reviewReceived: (productName: string, rating: number) => ({
    title: 'New Review Received',
    message: `You received a ${rating}-star review for ${productName}.`
  }),

  deliveryAssigned: (orderNumber: string, customerName: string) => ({
    title: 'New Delivery Assignment',
    message: `You have been assigned to deliver order #${orderNumber} for ${customerName}.`
  })
}