import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    await transporter.sendMail({
      from: `"PoultryMarket" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (error) {
    console.error('Email sending failed:', error)
    return { success: false, error }
  }
}

export const emailTemplates = {
  verification: (name: string, verificationUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🐔 PoultryMarket</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Fresh Farm Products Delivered</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Welcome to PoultryMarket, ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            Thank you for joining our marketplace! To complete your registration and start shopping for fresh farm products, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #10b981; word-break: break-all;">${verificationUrl}</a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
            This verification link will expire in 24 hours for security reasons.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © 2024 PoultryMarket. All rights reserved.<br>
            Fresh farm products delivered to your door.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  passwordReset: (name: string, resetUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🔒 Password Reset</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket Security</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            Hi ${name}, we received a request to reset your password for your PoultryMarket account. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 20px 0 0 0;">
            This reset link will expire in 1 hour for security reasons. If you didn't request this reset, please ignore this email.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © 2024 PoultryMarket. All rights reserved.<br>
            If you have questions, contact our support team.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  contactForm: (name: string, email: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📧 Contact Form</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">New Message Received</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">New Contact Form Submission</h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Contact Details:</h3>
            <p style="color: #4b5563; margin: 5px 0; font-size: 16px;"><strong>Name:</strong> ${name}</p>
            <p style="color: #4b5563; margin: 5px 0; font-size: 16px;"><strong>Email:</strong> ${email}</p>
          </div>
          
          <h3 style="color: #374151; margin: 20px 0 10px 0; font-size: 18px;">Message:</h3>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <p style="color: #1f2937; line-height: 1.6; margin: 0; font-size: 16px; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
            <strong>Submitted:</strong> ${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} (EAT)
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            This message was sent from the contact form on poultrymarket.co.ke
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  contactConfirmation: (name: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Message Received - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">✅ Message Received</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket Support</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Thank you, ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            We've received your message and appreciate you reaching out to PoultryMarket. Our team will review your inquiry and get back to you within 24 hours.
          </p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 18px;">What happens next?</h3>
            <ul style="color: #1f2937; margin: 0; padding-left: 20px;">
              <li style="margin: 5px 0;">Our support team will review your message</li>
              <li style="margin: 5px 0;">You'll receive a personalized response within 24 hours</li>
              <li style="margin: 5px 0;">For urgent matters, call us at +254 700 000 000</li>
            </ul>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 20px 0 0 0; font-size: 16px;">
            In the meantime, feel free to explore our marketplace and discover fresh poultry products from trusted local farmers.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            Fresh farm products delivered to your door.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Order-related email templates
  orderConfirmed: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmed - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Order Confirmed</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Next Steps:</strong></p>
            <ul style="color: #4b5563; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Your order is being prepared</li>
              <li>You'll receive updates on delivery progress</li>
              <li>Estimated delivery within 24-48 hours</li>
            </ul>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  newOrder: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order Received - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🛒 New Order</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket Seller Portal</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Action Required:</strong></p>
            <ul style="color: #4b5563; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Review the order details in your dashboard</li>
              <li>Confirm availability of products</li>
              <li>Prepare items for packaging</li>
            </ul>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Payment-related templates
  paymentSubmitted: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Submitted - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">💳 Payment Submitted</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Payment is under review and will be processed shortly.</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  paymentApproved: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Approved - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">✅ Payment Approved</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Great news, ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  paymentRejected: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Issue - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">⚠️ Payment Issue</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Please contact our support team for assistance.</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Delivery status templates
  orderPacked: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Packed - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📦 Order Packed</h1>
          <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderDispatched: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Dispatched - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🚚 Order Dispatched</h1>
          <p style="color: #cffafe; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderPickedUp: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Picked Up - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Order Picked Up</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderInTransit: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order In Transit - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🚛 Order In Transit</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderOutForDelivery: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Out for Delivery - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🏃‍♂️ Out for Delivery</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Your order will arrive soon!</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderDelivered: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Delivered - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Delivered!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Thank you for choosing PoultryMarket!</strong></p>
            <p style="color: #4b5563; margin: 10px 0 0 0;">Please rate your experience and help us serve you better.</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderRejected: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Order Update</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Our support team is here to help. Please contact us for assistance.</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Application templates
  applicationApproved: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Approved - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Congratulations!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Welcome to the PoultryMarket community!</strong></p>
            <p style="color: #4b5563; margin: 10px 0 0 0;">You can now access your dashboard and start using our platform.</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  applicationRejected: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Update - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Application Update</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Thank you for your interest in PoultryMarket.</strong></p>
            <p style="color: #4b5563; margin: 10px 0 0 0;">Please feel free to contact our support team if you have any questions.</p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Sponsorship templates
  sponsorshipApproved: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sponsorship Approved - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🤝 Sponsorship Approved</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  sponsorshipRejected: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sponsorship Update - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Sponsorship Update</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  sponsorshipReceived: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Sponsorship Offer - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 New Sponsorship</h1>
          <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  sponsorshipDeclined: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sponsorship Update - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📋 Sponsorship Update</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Review and delivery templates
  reviewReceived: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Review - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">⭐ New Review</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  deliveryAssigned: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Delivery Assignment - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🚚 New Delivery</h1>
          <p style="color: #cffafe; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket Delivery</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
          <div style="background-color: #cffafe; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4;">
            <p style="color: #1f2937; margin: 0; font-size: 16px;"><strong>Please check your delivery dashboard for details.</strong></p>
          </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // Generic notification template
  genericNotification: (name: string, title: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🔔 ${title}</h1>
          <p style="color: #e5e7eb; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">${message}</p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
}