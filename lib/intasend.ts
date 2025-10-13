// IntaSend Payment Integration
const INTASEND_BASE_URL = 'https://api.intasend.com/api/v1';
const INTASEND_SECRET_KEY = process.env.INTASEND_API_KEY;
const INTASEND_PUBLISHABLE_KEY = process.env.INTASEND_PUBLISHABLE_KEY;

if (!INTASEND_SECRET_KEY) {
  console.warn('INTASEND_API_KEY is not configured. IntaSend payments will not work.');
}

export interface STKPushRequest {
  amount: string;
  phone_number: string;
  api_ref?: string;
  wallet_id?: string;
}

export interface STKPushResponse {
  id: string;
  invoice: {
    invoice_id: string;
    state: 'PENDING' | 'COMPLETE' | 'FAILED';
    provider: string;
    charges: number;
    net_amount: string;
    currency: string;
    value: number;
    account: string;
    api_ref: string;
    clearing_status?: string;
    mpesa_reference: string | null;
    retry_count: number;
    failed_reason: string | null;
    failed_code: string | null;
    created_at: string;
    updated_at: string;
  };
  customer: {
    customer_id: string;
    phone_number: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    provider: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PaymentStatusRequest {
  invoice_id: string;
  checkout_id?: string;
  signature?: string;
}

export interface PaymentStatusResponse {
  invoice: {
    invoice_id: string;
    state: 'PENDING' | 'COMPLETE' | 'FAILED';
    provider: string;
    charges: number;
    net_amount: string;
    currency: string;
    value: number;
    account: string;
    api_ref: string;
    clearing_status?: string;
    mpesa_reference: string | null;
    retry_count: number;
    failed_reason: string | null;
    failed_code: string | null;
    created_at: string;
    updated_at: string;
  };
  meta: {
    id: string;
    customer: {
      customer_id: string;
      phone_number: string;
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      provider: string;
    };
  };
}

/**
 * Normalize phone number to the format expected by IntaSend (254XXXXXXXXX)
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
 * Initiate STK Push payment
 */
export async function initiateStkPush(requestData: STKPushRequest): Promise<STKPushResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  try {
    const normalizedPhone = normalizePhoneNumber(requestData.phone_number);
    
    const response = await fetch(`${INTASEND_BASE_URL}/payment/mpesa-stk-push/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `Bearer ${INTASEND_SECRET_KEY}`
      },
      body: JSON.stringify({
        amount: requestData.amount,
        phone_number: normalizedPhone,
        api_ref: requestData.api_ref || 'poultry-market-payment',
        wallet_id: requestData.wallet_id
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.detail || 'Failed to initiate STK Push');
    }

    const result = await response.json();
    return result as STKPushResponse;
  } catch (error) {
    throw new Error(`Failed to initiate STK Push: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check payment status using invoice ID
 */
export async function checkPaymentStatus(invoiceId: string): Promise<PaymentStatusResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  try {
    const response = await fetch(`${INTASEND_BASE_URL}/payment/status/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `Bearer ${INTASEND_SECRET_KEY}`
      },
      body: JSON.stringify({
        invoice_id: invoiceId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.detail || 'Failed to check payment status');
    }

    const result = await response.json();
    return result as PaymentStatusResponse;
  } catch (error) {
    throw new Error(`Failed to check payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Poll payment status until completion or timeout
 */
export async function pollPaymentStatus(
  invoiceId: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    onStatusUpdate?: (status: PaymentStatusResponse) => void;
  } = {}
): Promise<PaymentStatusResponse> {
  const { maxAttempts = 30, intervalMs = 5000, onStatusUpdate } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const statusResponse = await checkPaymentStatus(invoiceId);
      
      // Call the optional callback with status update
      if (onStatusUpdate) {
        onStatusUpdate(statusResponse);
      }

      const state = statusResponse.invoice.state;
      
      if (state === 'COMPLETE') {
        console.log('Payment completed successfully:', {
          invoiceId: statusResponse.invoice.invoice_id,
          amount: statusResponse.invoice.net_amount,
          mpesaRef: statusResponse.invoice.mpesa_reference
        });
        return statusResponse;
      } else if (state === 'FAILED') {
        const failedReason = statusResponse.invoice.failed_reason || 'Unknown error';
        console.log('Payment failed:', failedReason);
        throw new Error(`Payment failed: ${failedReason}`);
      }
      
      // Payment is still pending
      console.log(`Payment still pending (attempt ${attempt}/${maxAttempts})`);
      
      // Don't wait after the last attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Payment failed:')) {
        // Re-throw payment failures immediately
        throw error;
      }
      
      console.error(`Error polling payment status (attempt ${attempt}):`, error);
      
      // For API errors, wait and retry unless it's the last attempt
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error(`Payment status polling timeout after ${maxAttempts} attempts`);
}

/**
 * Check if a payment is complete (either COMPLETED or FAILED)
 */
export function isPaymentComplete(statusResponse: PaymentStatusResponse): boolean {
  const state = statusResponse.invoice.state;
  return state === 'COMPLETE' || state === 'FAILED';
}

/**
 * Check if a payment was successful
 */
export function isPaymentSuccessful(statusResponse: PaymentStatusResponse): boolean {
  return statusResponse.invoice.state === 'COMPLETE';
}

/**
 * Get payment result summary with amount validation
 */
export function getPaymentSummary(statusResponse: PaymentStatusResponse, expectedOrderTotal?: number) {
  const invoice = statusResponse.invoice;
  const customer = statusResponse.meta.customer;
  
  // Parse the raw amount from IntaSend
  const rawAmount = parseFloat(invoice.net_amount);
  // Round up to next whole number (12.36 becomes 13)
  const roundedAmount = roundUpPaymentAmount(rawAmount);
  
  const summary = {
    state: invoice.state,
    amount: roundedAmount, // Use rounded amount
    rawAmount: rawAmount, // Keep original for reference
    currency: invoice.currency,
    phone: customer.phone_number,
    mpesaReference: invoice.mpesa_reference,
    invoiceId: invoice.invoice_id,
    clearingStatus: invoice.clearing_status,
    failedReason: invoice.failed_reason,
    failedCode: invoice.failed_code,
    isSuccessful: invoice.state === 'COMPLETE',
    isComplete: invoice.state !== 'PENDING',
    createdAt: invoice.created_at,
    updatedAt: invoice.updated_at
  };

  // Add amount validation if expected amount is provided
  if (expectedOrderTotal !== undefined && invoice.state === 'COMPLETE') {
    const validation = validatePaymentAmount(
      roundedAmount, // Use rounded amount for validation
      expectedOrderTotal
    );
    
    return {
      ...summary,
      amountValidation: validation,
      isAmountValid: validation.isValid
    };
  }

  return summary;
}

/**
 * Generate external reference for tracking
 */
export function generateExternalReference(prefix: string, id: string): string {
  return `${prefix}_${id}_${Date.now()}`;
}

/**
 * Round up payment amount to next whole number
 * Example: 12.36 becomes 13, 12.00 stays 12
 */
export function roundUpPaymentAmount(amount: number): number {
  return Math.ceil(amount);
}

/**
 * Format amount for IntaSend (ensure it's a string)
 */
export function formatPaymentAmount(amount: number): string {
  return Math.round(amount).toString();
}

/**
 * Calculate IntaSend fees (3% + any additional charges)
 */
export function calculateIntaSendFees(amount: number): {
  subtotal: number;
  intaSendFee: number;
  serviceFee: number;
  totalAmount: number;
  netAmount: number; // What the merchant receives after fees
} {
  const subtotal = amount;
  
  // Service fee: 4 KES for orders above 50, 2 KES for orders below 50
  const serviceFee = amount >= 50 ? 4 : 2;
  
  // Amount including our service fee
  const amountWithServiceFee = subtotal + serviceFee;
  
  // IntaSend charges 3% on the total amount
  const intaSendFee = Math.round((amountWithServiceFee * 0.03) * 100) / 100;
  
  // Total amount customer pays
  const totalAmount = amountWithServiceFee + intaSendFee;
  
  // Net amount after IntaSend takes their fee (what we receive)
  const netAmount = amountWithServiceFee;
  
  return {
    subtotal,
    intaSendFee,
    serviceFee,
    totalAmount: Math.round(totalAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100
  };
}

/**
 * Validate payment amount against expected amount (accounting for IntaSend fees)
 */
export function validatePaymentAmount(
  receivedAmount: number, 
  expectedOrderTotal: number,
  tolerance: number = 1.0 // Increased tolerance to 1 KES to handle rounding
): {
  isValid: boolean;
  expectedAmount: number;
  receivedAmount: number;
  difference: number;
  message: string;
} {
  const feeCalculation = calculateIntaSendFees(expectedOrderTotal);
  const expectedAmount = feeCalculation.totalAmount;
  
  // For validation, also consider the rounded up version of expected amount
  const roundedExpectedAmount = roundUpPaymentAmount(expectedAmount);
  
  // Check against both original and rounded expected amounts
  const differenceFromOriginal = Math.abs(receivedAmount - expectedAmount);
  const differenceFromRounded = Math.abs(receivedAmount - roundedExpectedAmount);
  
  // Use the smaller difference
  const difference = Math.min(differenceFromOriginal, differenceFromRounded);
  
  // Payment is valid if it matches either the exact amount or the rounded amount within tolerance
  const isValid = difference <= tolerance;
  
  let message = '';
  if (isValid) {
    if (receivedAmount === roundedExpectedAmount) {
      message = `Payment amount verified successfully (rounded up from ${expectedAmount} to ${roundedExpectedAmount})`;
    } else {
      message = 'Payment amount verified successfully';
    }
  } else if (receivedAmount < expectedAmount) {
    message = `Payment amount too low. Expected: ${expectedAmount} KES (or ${roundedExpectedAmount} KES rounded), Received: ${receivedAmount} KES`;
  } else {
    message = `Payment amount too high. Expected: ${expectedAmount} KES (or ${roundedExpectedAmount} KES rounded), Received: ${receivedAmount} KES`;
  }
  
  return {
    isValid,
    expectedAmount: roundedExpectedAmount, // Return the rounded expected amount
    receivedAmount,
    difference,
    message
  };
}