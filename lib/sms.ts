import { createHash } from "crypto"

const SMS_CONFIG = {
  apiUrl: "https://sms.textsms.co.ke/api/services/sendsms/",
  apiKey: process.env.SMS_API_KEY!,
  partnerID: process.env.SMS_PARTNER_ID!,
  senderID: process.env.SMS_SENDER_ID || "PoultryMarket",
}

interface SMSResponse {
  success: boolean
  message: string
  messageId?: string
  error?: string
}

// Enhanced phone number validation and formatting
function formatKenyanPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digitsOnly = phone.replace(/\D/g, '')
  
  // Handle different Kenyan number formats
  if (digitsOnly.startsWith('254') && digitsOnly.length === 12) {
    return digitsOnly
  } else if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    return `254${digitsOnly.slice(1)}`
  } else if (digitsOnly.length === 9) {
    return `254${digitsOnly}`
  }
  
  throw new Error(`Invalid Kenyan phone number format: ${phone}`)
}

// Enhanced message formatting with length and character validation
function formatSMSMessage(message: string): string {
  // Remove excessive whitespace and newlines
  const cleanMessage = message.replace(/\s+/g, ' ').trim()
  
  // SMS length limits (160 chars for single SMS, 70 chars per part for multipart)
  if (cleanMessage.length > 640) { // Max 4 parts
    return cleanMessage.substring(0, 637) + '...'
  }
  
  return cleanMessage
}

async function mainSendSMS(phone: string, message: string): Promise<SMSResponse> {
  try {
    // Validate and format inputs
    const formattedPhone = formatKenyanPhoneNumber(phone)
    const formattedMessage = formatSMSMessage(message)
    
    // Log SMS attempt (remove in production)
    console.log(`📱 Sending SMS to ${formattedPhone}: ${formattedMessage.substring(0, 50)}...`)
    
    // Add timeout protection
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const requestBody = {
      apikey: SMS_CONFIG.apiKey,
      partnerID: SMS_CONFIG.partnerID,
      message: formattedMessage,
      shortcode: SMS_CONFIG.senderID,
      mobile: formattedPhone,
    }

    const response = await fetch(SMS_CONFIG.apiUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "PoultryMarket/1.0"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })

    clearTimeout(timeout)

    // Check HTTP response status
    if (!response.ok) {
      throw new Error(`SMS API responded with status ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Enhanced response handling
    if (result.success || result.status === 'success' || result.responseCode === '200') {
      console.log(`✅ SMS sent successfully to ${formattedPhone}`)
      return {
        success: true,
        message: 'SMS sent successfully',
        messageId: result.messageId || result.id
      }
    } else {
      console.error(`❌ SMS failed for ${formattedPhone}:`, result)
      return {
        success: false,
        message: 'SMS sending failed',
        error: result.message || result.error || 'Unknown SMS API error'
      }
    }

  } catch (error) {
    console.error(`💥 SMS sending error for ${phone}:`, error)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'SMS request timed out',
          error: 'Request timeout after 15 seconds'
        }
      }
      return {
        success: false,
        message: 'SMS sending failed',
        error: error.message
      }
    }
    
    return {
      success: false,
      message: 'SMS sending failed',
      error: 'Unknown error occurred'
    }
  }
}

// Enhanced bulk SMS sending with rate limiting
export async function sendBulkSMS(recipients: Array<{phone: string, message: string}>, delayMs: number = 1000): Promise<Array<SMSResponse & {phone: string}>> {
  const results: Array<SMSResponse & {phone: string}> = []
  
  for (const recipient of recipients) {
    const result = await mainSendSMS(recipient.phone, recipient.message)
    results.push({
      ...result,
      phone: recipient.phone
    })
    
    // Rate limiting delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  
  return results
}

// SMS templates for common notifications
export const smsTemplates = {
  welcome: (name: string) => 
    `🎉 Welcome to PoultryMarket, ${name}! Your account is ready. Start shopping fresh poultry products from verified sellers. Download our app: bit.ly/poultrymarket-app`,
  
  orderConfirmed: (orderNumber: string, total: number) =>
    `✅ Order #${orderNumber} confirmed! Total: KSh ${total.toFixed(0)}. We'll notify you when it's ready for delivery. Track: bit.ly/track-order`,
  
  orderDelivered: (orderNumber: string) =>
    `📦 Order #${orderNumber} delivered! Please rate your experience in the app. Thank you for choosing PoultryMarket!`,
  
  paymentReceived: (amount: number, orderNumber: string) =>
    `💰 Payment of KSh ${amount.toFixed(0)} received for order #${orderNumber}. Processing your order now. Thank you!`,
  
  lowStock: (productName: string, stock: number) =>
    `⚠️ Low stock alert! ${productName} has only ${stock} units left. Update your inventory in the seller dashboard.`,
}

// Utility function to send SMS with template
export async function sendTemplatedSMS(phone: string, template: string): Promise<SMSResponse> {
  return await mainSendSMS(phone, template)
}

// Main export (keep existing interface for backward compatibility)
export default mainSendSMS
