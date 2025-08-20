import { prisma } from './prisma'
import { NotificationType, UserRole } from '@prisma/client'
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
      if (user?.phone) {
      await sendSMS(data, user?.phone || '', user?.name || '')
      }
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
      case 'Welcome to PoultryMarket':
        emailTemplate = emailTemplates.welcome(userName, data.message)
        break
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
        // Check if it's an announcement notification
        if (data.title.includes('announcement:')) {
          // Parse announcement details for professional template
          await sendAnnouncementEmail(data, userEmail, userName)
          return // Exit early as we handled the announcement separately
        }
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

    // Create appropriate SMS message based on notification type
    let message: string

    switch (data.title) {
      case 'Welcome to PoultryMarket':
        message = `🎉 Welcome to PoultryMarket, ${userName}! Your account has been created successfully. Start exploring fresh poultry products from trusted sellers. Download our app for the best experience.`
        break
      case 'Order Confirmed':
        message = `✅ Hi ${userName}, your order has been confirmed! ${data.message} Track your order in the app.`
        break
      case 'New Order Received':
        message = `🛒 New order alert! ${userName}, ${data.message} Check your seller dashboard to process it.`
        break
      case 'Order Delivered':
        message = `📦 Great news ${userName}! ${data.message} Please rate your experience in the app.`
        break
      case 'Payment Approved':
        message = `💰 Payment approved! Hi ${userName}, ${data.message} Your order will be processed shortly.`
        break
      case 'Payment Rejected':
        message = `❌ Payment issue: ${userName}, ${data.message} Please contact support for assistance.`
        break
      case 'Order Dispatched':
        message = `🚚 Your order is on the way! ${userName}, ${data.message} You can track it in real-time.`
        break
      case 'Order Out for Delivery':
        message = `🏃‍♂️ Almost there! ${userName}, ${data.message} Get ready to receive your order.`
        break
      case 'Application Approved':
        message = `🎊 Congratulations ${userName}! ${data.message} Welcome to the PoultryMarket family.`
        break
      case 'New Review Received':
        message = `⭐ Review alert! ${userName}, ${data.message} Thank your customer and keep up the great work!`
        break
      case 'New Delivery Assignment':
        message = `📍 New delivery job! ${userName}, ${data.message} Check the app for pickup details.`
        break
      default:
        message = `Hi ${userName}, ${data.title}: ${data.message} - PoultryMarket`
        break
    }

    // Send SMS with enhanced formatting
    await mainSendSMS(userPhone, message)

    console.log(`SMS notification sent to ${userPhone}: ${data.title}`)
  } catch (error) {
    console.error('Failed to send SMS notification:', error)
  }
}

export const notificationTemplates = {
  welcome: (userName: string) => ({
    title: 'Welcome to PoultryMarket',
    message: `Welcome to PoultryMarket, ${userName}! Your account has been successfully created. Start exploring fresh poultry products from verified sellers across Kenya.`
  }),

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
    message: `You have received a new order #${orderNumber}. Payment type: ${paymentType}.`
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

// Send welcome notification to new users
export async function sendWelcomeNotification(
  user: {
    id: string
    name: string
    email: string
    phone?: string
    role: string
  }
) {
  try {
    console.log(`Sending welcome notification to ${user.name} (${user.email})`)

    // Create in-app notification
    await prisma.notification.create({
      data: {
        receiverId: user.id,
        title: 'Welcome to PoultryMarket',
        message: `Welcome to PoultryMarket, ${user.name}! Your account has been successfully created. Start exploring fresh poultry products from verified sellers across Kenya.`,
        type: 'EMAIL',
        isRead: false
      }
    })

    // Send welcome email
    await sendEmailNotification(
      {
        receiverId: user.id,
        type: 'EMAIL',
        title: 'Welcome to PoultryMarket',
        message: `Your account has been successfully created! Start exploring fresh poultry products from verified sellers across Kenya.`
      },
      user.email,
      user.name
    )

    // Send welcome SMS if phone number is available
    if (user.phone) {
      await sendSMS(
        {
          receiverId: user.id,
          type: 'SMS',
          title: 'Welcome to PoultryMarket',
          message: `Your account has been successfully created! Start exploring fresh poultry products from verified sellers across Kenya.`
        },
        user.phone,
        user.name
      )
    }

    console.log(`Welcome notification sent successfully to ${user.name}`)
  } catch (error) {
    console.error('Failed to send welcome notification:', error)
  }
}

// Send comprehensive order notification with enhanced details
export async function sendOrderNotificationWithDetails(
  orderId: string,
  orderDetails: {
    items: Array<{ name: string; quantity: number; price: number }>
    total: number
    deliveryAddress: string
    estimatedDelivery: string
  }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    // Get customer details
    const customer = await prisma.user.findUnique({
      where: { id: order.customerId }
    })

    if (!customer) {
      throw new Error('Customer not found')
    }

    // Enhanced order confirmation with details
    const orderSummary = orderDetails.items
      .map(item => `${item.quantity}x ${item.name}`)
      .join(', ')

    const message = `Order confirmed! Items: ${orderSummary}. Total: KES ${orderDetails.total}. Delivery to: ${orderDetails.deliveryAddress}. Expected: ${orderDetails.estimatedDelivery}.`

    // Send to customer
    await sendEmailNotification(
      {
        receiverId: customer.id,
        type: 'EMAIL',
        title: 'Order Confirmed',
        message: message
      },
      customer.email,
      customer.name || 'Customer'
    )

    console.log(`Enhanced order notifications sent for order ${orderId}`)
  } catch (error) {
    console.error('Failed to send order notification with details:', error)
  }
}

// Send professional announcement email notification
async function sendAnnouncementEmail(data: NotificationData, userEmail: string, userName: string) {
  try {
    // Extract announcement ID from the notification data
    const titleParts = data.title.split(': ')
    const announcementTitle = titleParts[1] || data.title
    
    // Get the full announcement details from database
    const announcement = await prisma.announcement.findFirst({
      where: { title: announcementTitle },
      include: { author: true },
      orderBy: { createdAt: 'desc' }
    })

    if (!announcement) {
      console.warn('Announcement not found for email template, using generic template')
      const emailTemplate = emailTemplates.genericNotification(userName, data.title, data.message)
      await sendEmail({
        to: userEmail,
        subject: data.title,
        html: emailTemplate
      })
      return
    }

    // Create the announcement view URL
    const viewUrl = `${process.env.NEXTAUTH_URL}/announcements`
    
    // Use the professional announcement email template
    const emailTemplate = emailTemplates.announcement(
      userName,
      announcement.type,
      announcement.title,
      announcement.content,
      announcement.author.name || 'PoultryMarket Team',
      viewUrl
    )

    await sendEmail({
      to: userEmail,
      subject: `📢 ${announcement.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Announcement: ${announcement.title}`,
      html: emailTemplate
    })

    console.log(`Professional announcement email sent to ${userEmail}: ${announcement.title}`)
  } catch (error) {
    console.error('Failed to send announcement email:', error)
    // Fallback to generic template
    const emailTemplate = emailTemplates.genericNotification(userName, data.title, data.message)
    await sendEmail({
      to: userEmail,
      subject: data.title,
      html: emailTemplate
    })
  }
}

// Create and send announcement notifications to users
export async function sendAnnouncementNotifications(
  announcementId: string,
  authorId: string,
  targetRoles: (UserRole | 'ALL')[] = ['ALL']
) {
  try {
    // Get announcement details
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: { author: true }
    })

    if (!announcement) {
      throw new Error('Announcement not found')
    }

    // Determine target users based on roles
    type TargetUser = { id: string; email: string; name: string | null; role: string }
    let targetUsers: TargetUser[] = []
    
    if (targetRoles.includes('ALL')) {
      targetUsers = await prisma.user.findMany({
        where: { 
          isVerified: true,
          id: { not: authorId } // Don't notify the author
        },
        select: { id: true, email: true, name: true, role: true }
      })
    } else {
      const validUserRoles = targetRoles.filter((role): role is UserRole => role !== 'ALL');
      targetUsers = await prisma.user.findMany({
        where: { 
          role: { in: validUserRoles },
          isVerified: true,
          id: { not: authorId }
        },
        select: { id: true, email: true, name: true, role: true }
      })
    }

    // Limit notifications to avoid overwhelming the system
    const maxNotifications = 1000
    const usersToNotify = targetUsers.slice(0, maxNotifications)
    let successCount = 0
    let failureCount = 0

    // Send notifications in batches
    const batchSize = 50
    for (let i = 0; i < usersToNotify.length; i += batchSize) {
      const batch = usersToNotify.slice(i, i + batchSize)
      
      await Promise.allSettled(batch.map(async (user) => {
        try {
          // Create in-app notification
          await prisma.notification.create({
            data: {
              receiverId: user.id,
              senderId: authorId,
              type: 'EMAIL',
              title: `New ${announcement.type.toLowerCase().replace('_', ' ')} announcement: ${announcement.title}`,
              message: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? '...' : ''),
              isRead: false
            }
          })

          // Send professional email notification using the new template
          const viewUrl = `${process.env.NEXTAUTH_URL}/announcements`
          const emailTemplate = emailTemplates.announcement(
            user.name || 'User',
            announcement.type,
            announcement.title,
            announcement.content,
            announcement.author.name || 'PoultryMarket Team',
            viewUrl
          )

          await sendEmail({
            to: user.email,
            subject: `📢 ${announcement.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} Announcement: ${announcement.title}`,
            html: emailTemplate
          })

          // Send SMS for urgent announcements
          if (announcement.type === 'URGENT') {
            await prisma.notification.create({
              data: {
                receiverId: user.id,
                senderId: authorId,
                type: 'SMS',
                title: `URGENT: ${announcement.title}`,
                message: announcement.content.substring(0, 160) + (announcement.content.length > 160 ? '...' : ''),
                isRead: false
              }
            })
          }

          successCount++
        } catch (error) {
          console.error(`Failed to send notification to user ${user.id}:`, error)
          failureCount++
        }
      }))

      // Small delay between batches to avoid overwhelming the email service
      if (i + batchSize < usersToNotify.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`Announcement notifications sent: ${successCount} successful, ${failureCount} failed for announcement: ${announcement.title}`)
    
    return {
      success: true,
      totalTargeted: usersToNotify.length,
      successCount,
      failureCount
    }
  } catch (error) {
    console.error('Failed to send announcement notifications:', error)
    throw error
  }
}