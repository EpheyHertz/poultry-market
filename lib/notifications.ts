import { prisma } from './prisma'
import { NotificationType } from '@prisma/client'
import { sendEmail, emailTemplates } from './email'
import  mainSendSMS  from './sms'

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

    // Get user email for email notifications
    if (data.type === 'EMAIL') {
      const user = await prisma.user.findUnique({
        where: { id: data.receiverId },
        select: { email: true, name: true }
      })

      if (user?.email) {
        await sendEmailNotification(data, user.email, user.name)
      }
    } else if (data.type === 'SMS') {
        const user = await prisma.user.findUnique({
        where: { id: data.receiverId },
        select: { phone: true, name: true }
      })
      await sendSMS(data, user?.phone || '', user?.name || '')
    }

    return notification
  } catch (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

async function sendEmailNotification(data: NotificationData, userEmail: string, userName: string) {
  try {
    // Map notification types to email templates
    let emailTemplate: string

    switch (data.title) {
      case 'Order Confirmed':
        emailTemplate = emailTemplates.orderConfirmed(userName, data.message)
        break
      case 'New Order Received':
        emailTemplate = emailTemplates.newOrder(userName, data.message)
        break
      case 'Payment Submitted for Approval':
        emailTemplate = emailTemplates.paymentSubmitted(userName, data.message)
        break
      case 'Payment Approved':
        emailTemplate = emailTemplates.paymentApproved(userName, data.message)
        break
      case 'Payment Rejected':
        emailTemplate = emailTemplates.paymentRejected(userName, data.message)
        break
      case 'Order Packed':
        emailTemplate = emailTemplates.orderPacked(userName, data.message)
        break
      case 'Order Dispatched':
        emailTemplate = emailTemplates.orderDispatched(userName, data.message)
        break
      case 'Order Picked Up':
        emailTemplate = emailTemplates.orderPickedUp(userName, data.message)
        break
      case 'Order In Transit':
        emailTemplate = emailTemplates.orderInTransit(userName, data.message)
        break
      case 'Order Out for Delivery':
        emailTemplate = emailTemplates.orderOutForDelivery(userName, data.message)
        break
      case 'Order Delivered':
        emailTemplate = emailTemplates.orderDelivered(userName, data.message)
        break
      case 'Order Rejected':
        emailTemplate = emailTemplates.orderRejected(userName, data.message)
        break
      case 'Application Approved':
        emailTemplate = emailTemplates.applicationApproved(userName, data.message)
        break
      case 'Application Update':
        emailTemplate = emailTemplates.applicationRejected(userName, data.message)
        break
      case 'Sponsorship Approved':
        emailTemplate = emailTemplates.sponsorshipApproved(userName, data.message)
        break
      case 'Sponsorship Declined':
        emailTemplate = emailTemplates.sponsorshipRejected(userName, data.message)
        break
      case 'New Sponsorship Offer':
        emailTemplate = emailTemplates.sponsorshipReceived(userName, data.message)
        break
      case 'Sponsorship Declined':
        emailTemplate = emailTemplates.sponsorshipDeclined(userName, data.message)
        break
      case 'New Review Received':
        emailTemplate = emailTemplates.reviewReceived(userName, data.message)
        break
      case 'New Delivery Assignment':
        emailTemplate = emailTemplates.deliveryAssigned(userName, data.message)
        break
      default:
        // Generic notification template
        emailTemplate = emailTemplates.genericNotification(userName, data.title, data.message)
        break
    }

    await sendEmail({
      to: userEmail,
      subject: data.title,
      html: emailTemplate
    })

    console.log(`Email notification sent to ${userEmail}: ${data.title}`)
  } catch (error) {
    console.error('Failed to send email notification:', error)
  }
}

async function sendSMS(data: NotificationData, userPhone: string, userName: string) {
  // Integration with SMS service (e.g., Twilio, Africa's Talking, etc.)
  console.log('Sending SMS:', data.title, 'to user:', data.receiverId)
  try {
    if (!userPhone) {
      console.warn('No phone number provided for SMS notification')
      return
    }
    const message = `${data.title}\n${data.message}`

    // Example implementation for sending SMS
    await mainSendSMS(userPhone, message)

    console.log(`SMS notification sent to ${userPhone}: ${data.title}`)
  } catch (error) {
    console.error('Failed to send SMS notification:', error)
  }

  // Example implementation for Africa's Talking or Twilio:
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