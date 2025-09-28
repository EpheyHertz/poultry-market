import { z } from 'zod';

// Lipia API Configuration
const LIPIA_BASE_URL = process.env.LIPIA_BASE_URL || 'https://lipia-api.kreativelabske.com/api/v2';
const LIPIA_API_KEY = process.env.LIPIA_API_KEY;

if (!LIPIA_API_KEY) {
  console.warn('LIPIA_API_KEY is not configured. STK Push payments will not work.');
}

// Phone number validation schema for the final normalized format (254XXXXXXXXX - 12 digits total)
const phoneNumberSchema = z.string()
  .regex(/^254[0-9]{9}$/, 'Invalid normalized phone number format');

// STK Push request schema
const stkPushSchema = z.object({
  phone_number: phoneNumberSchema,
  amount: z.number().min(1, 'Amount must be at least 1 KSH'),
  external_reference: z.string().optional(),
  callback_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
});

export interface STKPushRequest {
  phone_number: string;
  amount: number;
  external_reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export interface STKPushResponse {
  success: boolean;
  status: string;
  message: string;
  customerMessage: string;
  data: {
    TransactionReference: string;
    ResponseCode: number;
    ResponseDescription: string;
  };
  timestamp: string;
}

export interface LipiaErrorResponse {
  success: false;
  status: 'error';
  message: string;
  customerMessage: string;
  error: {
    code: string;
    field?: string;
    location?: string;
    value?: any;
    expected?: string;
  };
  timestamp: string;
}

/**
 * Normalize phone number to the format expected by Lipia
 * Converts various formats to 254XXXXXXXXX (12 digits total)
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove spaces and dashes
  let normalized = phoneNumber.replace(/[\s-]/g, '');
  
  // Handle different formats
  if (normalized.startsWith('+254')) {
    // +254700086852 -> 254700086852
    return normalized.substring(1);
  } else if (normalized.startsWith('254')) {
    // Already in correct format: 254700086852
    return normalized;
  } else if (normalized.startsWith('07') || normalized.startsWith('01')) {
    // 0700086852 -> 700086852 -> 254700086852
    return '254' + normalized.substring(1);
  } else if (normalized.startsWith('7') || normalized.startsWith('1')) {
    // 700086852 -> 254700086852
    return '254' + normalized;
  }
  
  return normalized;
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phoneNumber: string): { isValid: boolean; normalized?: string; error?: string } {
  try {
    // Remove spaces and dashes for validation
    const cleanNumber = phoneNumber.replace(/[\s-]/g, '');
    
    // Validate input format - accept common Kenyan phone number formats
    const inputValidation = /^(\+254|254)[0-9]{9}$|^0[7|1][0-9]{8}$/;
    
    if (!inputValidation.test(cleanNumber)) {
      return {
        isValid: false,
        error: 'Invalid phone number format. Use formats like 0712345678, 254712345678, or +254712345678'
      };
    }

    const normalized = normalizePhoneNumber(cleanNumber);
    phoneNumberSchema.parse(normalized);
    return { isValid: true, normalized };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Invalid phone number format. Use formats like 0712345678, 254712345678, or +254712345678' 
    };
  }
}

/**
 * Initiate STK Push payment
 */
export async function initiateStkPush(requestData: STKPushRequest): Promise<STKPushResponse> {
  if (!LIPIA_API_KEY) {
    throw new Error('Lipia API key is not configured');
  }

  try {
    // Validate request data
    const validatedData = stkPushSchema.parse({
      ...requestData,
      phone_number: normalizePhoneNumber(requestData.phone_number)
    });

    const response = await fetch(`${LIPIA_BASE_URL}/payments/stk-push`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LIPIA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(validatedData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new LipiaPaymentError(result as LipiaErrorResponse);
    }

    return result as STKPushResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors[0].message}`);
    }
    
    if (error instanceof LipiaPaymentError) {
      throw error;
    }

    throw new Error(`Failed to initiate STK Push: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Custom error class for Lipia API errors
 */
export class LipiaPaymentError extends Error {
  public readonly code: string;
  public readonly customerMessage: string;
  public readonly field?: string;
  public readonly statusCode: number;

  constructor(errorResponse: LipiaErrorResponse, statusCode: number = 400) {
    super(errorResponse.message);
    this.name = 'LipiaPaymentError';
    this.code = errorResponse.error.code;
    this.customerMessage = errorResponse.customerMessage;
    this.field = errorResponse.error.field;
    this.statusCode = statusCode;
  }
}

/**
 * Generate callback URL for the current domain
 */
export function generateCallbackUrl(endpoint: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  return `${baseUrl}/api/payments/callback/${endpoint}`;
}

/**
 * Generate external reference for tracking
 */
export function generateExternalReference(prefix: string, id: string): string {
  return `${prefix}_${id}_${Date.now()}`;
}

/**
 * Payment amount formatter - ensures amount is in whole KSH
 */
export function formatPaymentAmount(amount: number): number {
  return Math.round(amount * 100) / 100; // Round to 2 decimal places, then ensure whole numbers
}

/**
 * Create payment metadata for tracking
 */
export function createPaymentMetadata(data: {
  orderId?: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  paymentType?: string;
  [key: string]: any;
}): Record<string, any> {
  return {
    timestamp: new Date().toISOString(),
    source: 'poultry-marketplace',
    ...data
  };
}