import { createHash } from "crypto"

const SMS_CONFIG = {
  apiUrl: "https://sms.textsms.co.ke/api/services/sendsms/",
  apiKey: process.env.SMS_API_KEY!,
  partnerID: process.env.SMS_PARTNER_ID!,
  senderID: process.env.SMS_SENDER_ID!,
}

async function mainSendSMS(phone: string, message: string) {
  try {
    // Validate phone number format first
    if (!/^(254|0|\\+254)[17][0-9]{8}$/.test(phone)) {
      throw new Error("Invalid phone number format")
    }

    // Format phone number consistently
    const formattedPhone = phone.startsWith("254") 
      ? phone 
      : phone.startsWith("+254") 
        ? phone.substring(1) 
        : `254${phone.slice(-9)}`

    // Add timeout protection
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(SMS_CONFIG.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: SMS_CONFIG.apiKey,
        partnerID: SMS_CONFIG.partnerID,
        message,
        shortcode: SMS_CONFIG.senderID,
        mobile: formattedPhone,
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    // Check HTTP response status
    if (!response.ok) {
      throw new Error(`SMS API responded with status ${response.status}`)
    }

    const result = await response.json()
    // console.log("SMS Response:", result)

    // FIXED THE TYPO HERE: Changed "respose-code" to "response-code"
    if (!result.responses || result.responses[0]["response-code"] !== 200) {
      throw new Error(result.responses?.[0]["response-description"] || "Failed to send SMS")
    }

    return { success: true }
  } catch (error) {
    console.error("SMS Error:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "SMS service error",
      retryable: !(error instanceof TypeError) // Network errors are retryable
    }
  }
}

export default mainSendSMS;