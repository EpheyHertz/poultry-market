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
  welcome: (name: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to PoultryMarket - Start Shopping Fresh!</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🎉 Welcome to PoultryMarket!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 18px;">Fresh Farm Products at Your Fingertips</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 28px;">Welcome aboard, ${name}! 🐔</h2>
          
          <p style="color: #4b5563; line-height: 1.8; margin: 0 0 25px 0; font-size: 16px;">
            ${message}
          </p>
          
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 20px;">🚀 What You Can Do Now:</h3>
            <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Browse fresh eggs, chicken meat, and feed from verified sellers</li>
              <li style="margin-bottom: 8px;">Find trusted local farmers and suppliers in Kenya</li>
              <li style="margin-bottom: 8px;">Enjoy secure payments and reliable delivery services</li>
              <li style="margin-bottom: 8px;">Track your orders in real-time</li>
              <li>Connect directly with sellers through our chat system</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.NEXTAUTH_URL}/products" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              🛒 Start Shopping Now
            </a>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">💡 Pro Tips for New Users:</h4>
            <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">
              • Use filters to find products near you for faster delivery<br>
              • Check seller ratings and reviews before ordering<br>
              • Join our WhatsApp community for exclusive deals and updates<br>
              • Download our mobile app for the best shopping experience
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0 20px 0;">
            <p style="color: #6b7280; font-size: 16px; margin: 0 0 15px 0;">Follow us for daily updates and special offers:</p>
            <div style="margin: 15px 0;">
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background-color: #1877f2; color: white; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px;">📘</a>
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background-color: #1da1f2; color: white; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px;">🐦</a>
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background-color: #25d366; color: white; text-decoration: none; border-radius: 50%; width: 40px; height: 40px; text-align: center; line-height: 20px;">📱</a>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            Supporting Kenyan farmers and delivering fresh products to your door.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Need help? Contact us at support@poultrymarket.co.ke or call +254 700 000 000
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

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
            © 2025 PoultryMarket. All rights reserved.<br>
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
              <li style="margin: 5px 0;">For urgent matters, call us at +254 705 423 479</li>
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
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🎉 Order Confirmed!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 18px;">Thank you for choosing PoultryMarket</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 28px;">Hello ${name}! 🛒</h2>
          
          <p style="color: #4b5563; line-height: 1.8; margin: 0 0 25px 0; font-size: 16px;">
            Great news! ${message}
          </p>
          
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 20px;">📋 What Happens Next:</h3>
            <ul style="color: #374151; line-height: 1.7; margin: 0; padding-left: 20px; font-size: 15px;">
              <li style="margin-bottom: 10px;">📦 <strong>Order Processing:</strong> Your order is being prepared by our sellers</li>
              <li style="margin-bottom: 10px;">🔔 <strong>Status Updates:</strong> You'll receive SMS and email notifications</li>
              <li style="margin-bottom: 10px;">🚚 <strong>Delivery:</strong> Expected within 24-48 hours in Nairobi, 2-3 days elsewhere</li>
              <li style="margin-bottom: 10px;">📱 <strong>Track Order:</strong> Monitor progress in real-time through our app</li>
              <li>💬 <strong>Support:</strong> Chat directly with sellers for any questions</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">💡 Delivery Tips:</h4>
            <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">
              • Ensure someone is available at the delivery address<br>
              • Have your phone accessible for delivery agent contact<br>
              • Fresh products are best consumed within 24-48 hours<br>
              • Rate your experience to help us serve you better
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.NEXTAUTH_URL}/customer/orders" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              📋 Track Your Order
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            Supporting Kenyan farmers and delivering fresh products to your door.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Questions? Contact us at support@comradehomes.me| epheynyaga@gmail.com or call +254 705 423 479
          </p>
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
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">🛒 New Order Alert!</h1>
          <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 18px;">You have a new customer order</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 28px;">Hello ${name}! 🎯</h2>
          
          <p style="color: #4b5563; line-height: 1.8; margin: 0 0 25px 0; font-size: 16px;">
            Excellent! ${message}
          </p>
          
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px;">⚡ Action Required:</h3>
            <ul style="color: #374151; line-height: 1.7; margin: 0; padding-left: 20px; font-size: 15px;">
              <li style="margin-bottom: 10px;">✅ <strong>Review Order:</strong> Check order details in your seller dashboard</li>
              <li style="margin-bottom: 10px;">📦 <strong>Confirm Stock:</strong> Ensure products are available and fresh</li>
              <li style="margin-bottom: 10px;">⏰ <strong>Process Quickly:</strong> Aim to pack within 2-4 hours</li>
              <li style="margin-bottom: 10px;">📞 <strong>Contact Customer:</strong> Use our chat system for any clarifications</li>
              <li>🚚 <strong>Arrange Delivery:</strong> Schedule pickup or delivery as per your settings</li>
            </ul>
          </div>
          
          <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #22c55e;">
            <h4 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">💰 Seller Success Tips:</h4>
            <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.5;">
              • Fast processing leads to better customer ratings<br>
              • Good packaging ensures product quality during delivery<br>
              • Proactive communication builds customer trust<br>
              • Consistent quality increases repeat orders
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${process.env.NEXTAUTH_URL}/seller/orders" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
              📋 Process Order Now
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            © 2025 PoultryMarket. All rights reserved.<br>
            Empowering sellers to reach more customers across Kenya.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            Need help? Contact seller support at seller-support@comradehomes.com || epheynyaga@gmail.com
          </p>
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

  // Delivery photo notification templates
  deliveryPhotoUploaded: (name: string, trackingId: string, uploaderName: string, uploaderRole: string, photoType: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Photo Uploaded - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📸 Delivery Photo Uploaded</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            A new delivery photo has been uploaded for your order.
          </p>
          
          <!-- Delivery Info Card -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #15803d; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">📦 Delivery Details</h3>
            <div style="color: #166534;">
              <p style="margin: 5px 0;"><strong>Tracking ID:</strong> #${trackingId}</p>
              <p style="margin: 5px 0;"><strong>Photo Type:</strong> ${photoType}</p>
              <p style="margin: 5px 0;"><strong>Uploaded by:</strong> ${uploaderName} (${uploaderRole.replace('_', ' ')})</p>
            </div>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
            You can view this photo and track your delivery progress by clicking the button below.
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/order" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              View Delivery Photos
            </a>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Tip:</strong> Delivery photos help ensure transparency and provide proof of delivery condition.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            Thank you for choosing PoultryMarket for your fresh poultry needs!
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2025 PoultryMarket. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `,

  deliveryPhotoReminder: (name: string, trackingId: string, userRole: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Photo Reminder - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📸 Delivery Photo Reminder</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            ${userRole === 'DELIVERY_AGENT' 
              ? 'Please remember to upload delivery photos for completed deliveries to maintain transparency with customers.'
              : 'You can upload photos of your received delivery to provide feedback and help us improve our service.'
            }
          </p>
          
          <!-- Delivery Info Card -->
          <div style="background-color: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #ea580c; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">📦 Delivery Information</h3>
            <div style="color: #c2410c;">
              <p style="margin: 5px 0;"><strong>Tracking ID:</strong> #${trackingId}</p>
              <p style="margin: 5px 0;"><strong>Action Required:</strong> Upload delivery photo</p>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL}/order" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Upload Photo Now
            </a>
          </div>
          
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>📋 Why upload photos?</strong><br>
              • Provides proof of delivery condition<br>
              • Helps resolve disputes quickly<br>
              • Improves service quality<br>
              • Builds trust in our platform
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            Thank you for helping us maintain quality service!
          </p>
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2025 PoultryMarket. All rights reserved.
          </p>
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

  // Professional Announcement Email Template
  announcement: (name: string, announcementType: string, title: string, content: string, authorName: string, viewUrl: string) => {
    // Define announcement type configurations
    const typeConfig: { [key: string]: { icon: string, color: string, bgColor: string, description: string } } = {
      'GENERAL': { 
        icon: '📢', 
        color: '#2563eb', 
        bgColor: '#dbeafe',
        description: 'General Information' 
      },
      'URGENT': { 
        icon: '🚨', 
        color: '#dc2626', 
        bgColor: '#fee2e2',
        description: 'Urgent Notice' 
      },
      'EVENT': { 
        icon: '📅', 
        color: '#7c3aed', 
        bgColor: '#f3e8ff',
        description: 'Event Announcement' 
      },
      'PROMOTION': { 
        icon: '🏷️', 
        color: '#ea580c', 
        bgColor: '#fed7aa',
        description: 'Special Promotion' 
      },
      'SALE': { 
        icon: '💰', 
        color: '#059669', 
        bgColor: '#d1fae5',
        description: 'Sale Alert' 
      },
      'PRODUCT_LAUNCH': { 
        icon: '🚀', 
        color: '#0891b2', 
        bgColor: '#cffafe',
        description: 'Product Launch' 
      },
      'DISCOUNT': { 
        icon: '🎁', 
        color: '#c2410c', 
        bgColor: '#fed7aa',
        description: 'Discount Offer' 
      },
      'SLAUGHTER_SCHEDULE': { 
        icon: '📋', 
        color: '#7c2d12', 
        bgColor: '#fef3c7',
        description: 'Slaughter Schedule' 
      }
    };

    const config = typeConfig[announcementType] || typeConfig['GENERAL'];
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - PoultryMarket Announcement</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
      <div style="max-width: 650px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); margin-top: 20px; margin-bottom: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); padding: 50px 30px; text-align: center; position: relative; overflow: hidden;">
          <!-- Background Pattern -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%);"></div>
          
          <div style="position: relative; z-index: 1;">
            <div style="font-size: 48px; margin-bottom: 15px;">${config.icon}</div>
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">New ${config.description}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px; font-weight: 500;">PoultryMarket Kenya</p>
            <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 15px;">
              <span style="color: white; font-size: 14px; font-weight: 600;">📍 Published by ${authorName}</span>
            </div>
          </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 45px 30px;">
          <div style="text-align: center; margin-bottom: 35px;">
            <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 28px; font-weight: 700; line-height: 1.3;">${title}</h2>
            <div style="background: ${config.bgColor}; color: ${config.color}; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; font-weight: 600;">
              ${config.icon} ${config.description}
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border-left: 4px solid ${config.color};">
            <h3 style="color: #334155; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">📋 Announcement Details</h3>
            <div style="color: #475569; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${content}</div>
          </div>
          
          <!-- Call to Action -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); color: white; text-decoration: none; padding: 18px 36px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); transition: all 0.3s ease;">
              📖 View Full Announcement
            </a>
          </div>
          
          <!-- Why This Matters -->
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #0ea5e9;">
            <h4 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">💡 Why This Matters</h4>
            <p style="color: #164e63; margin: 0; font-size: 15px; line-height: 1.7;">
              Stay informed with the latest updates from PoultryMarket Kenya. Our announcements help you discover new opportunities, stay updated on important changes, and make the most of our platform.
            </p>
          </div>
          
          <!-- Quick Actions -->
          <div style="background: #fafafa; padding: 25px; border-radius: 12px; margin: 25px 0;">
            <h4 style="color: #374151; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; text-align: center;">🚀 Quick Actions</h4>
            <div style="display: table; width: 100%; border-collapse: separate; border-spacing: 10px;">
              <div style="display: table-row;">
                <div style="display: table-cell; text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <a href="${process.env.NEXTAUTH_URL}/announcements" style="text-decoration: none; color: #4f46e5; font-weight: 600; font-size: 14px;">📢 All Announcements</a>
                </div>
                <div style="display: table-cell; text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <a href="${process.env.NEXTAUTH_URL}/products" style="text-decoration: none; color: #059669; font-weight: 600; font-size: 14px;">🛒 Browse Products</a>
                </div>
                <div style="display: table-cell; text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <a href="${process.env.NEXTAUTH_URL}/chatbot" style="text-decoration: none; color: #ea580c; font-weight: 600; font-size: 14px;">🤖 AI Assistant</a>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Social & Community -->
          <div style="text-align: center; margin: 35px 0 20px 0;">
            <p style="color: #6b7280; font-size: 16px; margin: 0 0 20px 0; font-weight: 500;">Stay connected with our community:</p>
            <div style="margin: 20px 0;">
              <a href=" https://www.facebook.com/groups/4228746564014783/?ref=share&mibextid=NSMWBT
" style="display: inline-block; margin: 0 8px; padding: 12px; background-color: #1877f2; color: white; text-decoration: none; border-radius: 50%; width: 44px; height: 44px; text-align: center; line-height: 20px; font-size: 18px; box-shadow: 0 4px 12px rgba(24, 119, 242, 0.3);">📘</a>
              <a href="https://chat.whatsapp.com/IbiitCQgb1KB4Aowo23nBQ?mode=ac_t
" style="display: inline-block; margin: 0 8px; padding: 12px; background-color: #25d366; color: white; text-decoration: none; border-radius: 50%; width: 44px; height: 44px; text-align: center; line-height: 20px; font-size: 18px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">💬</a>
              <a href="${process.env.NEXTAUTH_URL}" style="display: inline-block; margin: 0 8px; padding: 12px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 50%; width: 44px; height: 44px; text-align: center; line-height: 20px; font-size: 18px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">🌐</a>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 30px 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <div style="margin-bottom: 20px;">
            <img src="https://res.cloudinary.com/dgvslio7u/image/upload/v1734690503/poultry-marketplace/logo_hd2q5e.png" alt="PoultryMarket" style="height: 40px; width: auto;">
          </div>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">
            © 2025 PoultryMarket Kenya. All rights reserved.<br>
            Connecting farmers, buyers, and the poultry community across Kenya.
          </p>
          <p style="color: #94a3b8; font-size: 13px; margin: 10px 0 0 0;">
            Need help? Contact us at <a href="mailto:support@poultrymarketke.com" style="color: #4f46e5; text-decoration: none;">support@poultrymarketke.com</a><br>
            <a href="${process.env.NEXTAUTH_URL}/unsubscribe" style="color: #94a3b8; text-decoration: underline; font-size: 12px;">Unsubscribe from announcements</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  },

  // Delivery photo notification template
  deliveryPhotoNotification: (name: string, trackingId: string, uploaderName: string, uploaderRole: string, photoType: string, viewUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Photo Uploaded - PoultryMarket</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">📸 Delivery Photo Uploaded</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">PoultryMarket Delivery Update</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
          <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
            A new delivery photo has been uploaded for your order.
          </p>
          
          <!-- Order Info -->
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📦 Delivery Details</h3>
            <div style="color: #4b5563; line-height: 1.6;">
              <p style="margin: 0 0 10px 0;"><strong>Tracking ID:</strong> #${trackingId}</p>
              <p style="margin: 0 0 10px 0;"><strong>Photo Type:</strong> ${photoType}</p>
              <p style="margin: 0 0 10px 0;"><strong>Uploaded by:</strong> ${uploaderName} (${uploaderRole})</p>
            </div>
          </div>
          
          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${viewUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
              View Photo & Order Details
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
            This photo helps ensure transparency and quality in our delivery process. You can view all delivery photos and track your order progress in your dashboard.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
            Need help? Contact our support team at <a href="mailto:epheynyaga@gmail.com" style="color: #059669;">epheynyaga@gmail.com</a>
          </p>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 PoultryMarket. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
}