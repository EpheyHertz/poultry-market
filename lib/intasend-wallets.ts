/**
 * IntaSend Wallet Management for Author Support System
 * 
 * This module handles:
 * - Creating IntaSend working wallets for authors
 * - Funding wallets via M-Pesa STK Push or Checkout
 * - Retrieving wallet balances and transactions
 * - Processing withdrawals to M-Pesa B2C, M-Pesa B2B, and Bank
 */

const IntaSend = require('intasend-node');

const INTASEND_BASE_URL = 'https://api.intasend.com/api/v1';
const INTASEND_SECRET_KEY = process.env.INTASEND_API_KEY;
const INTASEND_PUBLISHABLE_KEY = process.env.INTASEND_PUBLISHABLE_KEY;
const IS_SANDBOX = process.env.INTASEND_SANDBOX === 'true';

// Initialize IntaSend SDK
const intasend = new IntaSend(
  INTASEND_PUBLISHABLE_KEY || '',
  INTASEND_SECRET_KEY || '',
  IS_SANDBOX
);

// Platform configuration
export const SUPPORT_CONFIG = {
  MIN_SUPPORT_AMOUNT: 10,        // Minimum support amount in KES
  MIN_WITHDRAWAL_AMOUNT: 200,    // Minimum withdrawal amount in KES
  MIN_BANK_WITHDRAWAL: 100,      // Minimum for bank transfers
  MAX_BANK_WITHDRAWAL: 999999,   // Maximum for bank transfers
  PLATFORM_FEE_PERCENT: 5,       // 5% platform fee
  DAILY_WITHDRAWAL_LIMIT: 50000, // Daily withdrawal limit in KES
  PRESET_AMOUNTS: [10, 20, 30, 50, 100, 200, 500, 1000],
  CURRENCY: 'KES',
};

// Bank codes for PesaLink transfers
export const BANK_CODES = {
  KCB: '1',
  STANDARD_CHARTERED: '2',
  BARCLAYS: '3',
  NCBA: '7',
  PRIME_BANK: '10',
  COOPERATIVE: '11',
  NATIONAL_BANK: '12',
  CITIBANK: '16',
  HABIB_BANK: '17',
  MIDDLE_EAST_BANK: '18',
  BANK_OF_AFRICA: '19',
  CONSOLIDATED_BANK: '23',
  CREDIT_BANK: '25',
  STANBIC: '31',
  ABC_BANK: '35',
  SPIRE_BANK: '49',
  PARAMOUNT_BANK: '50',
  JAMII_BORA: '51',
  GUARANTY_BANK: '53',
  VICTORIA_BANK: '54',
  GUARDIAN_BANK: '55',
  IM_BANK: '57',
  HFCK: '61',
  DTB: '63',
  MAYFAIR_BANK: '65',
  SIDIAN_BANK: '66',
  EQUITY: '68',
  FAMILY_BANK: '70',
  GULF_AFRICAN: '72',
  FIRST_COMMUNITY: '74',
  KWFT_BANK: '78',
};

// ================================
// Type Definitions
// ================================

export type WithdrawalMethod = 'MPESA_B2C' | 'MPESA_B2B_PAYBILL' | 'MPESA_B2B_TILL' | 'BANK';

export interface CreateWalletRequest {
  label: string;
  wallet_type: 'WORKING';
  currency: string;
  can_disburse: boolean;
}

export interface WalletResponse {
  wallet_id: string;
  currency: string;
  wallet_type: string;
  label: string;
  can_disburse: boolean;
  current_balance: string;
  available_balance: string;
  updated_at: string;
}

export interface WalletTransaction {
  invoice: string;
  value: string;
  running_balance: string;
  narrative: string;
  created_at: string;
  updated_at: string;
}

export interface FundWalletMpesaRequest {
  first_name: string;
  last_name: string;
  email: string;
  host: string;
  amount: number;
  phone_number: string;
  api_ref: string;
  wallet_id: string;
}

export interface FundWalletCheckoutRequest {
  first_name: string;
  last_name: string;
  email: string;
  host: string;
  amount: number;
  currency: string;
  api_ref: string;
  redirect_url: string;
  wallet_id: string;
}

export interface CheckoutResponse {
  id: string;
  url: string;
  signature: string;
}

// M-Pesa B2C Transaction
export interface MpesaB2CTransaction {
  name: string;
  account: string;  // Phone number: 254XXXXXXXXX
  amount: string | number;
  narrative: string;
}

// M-Pesa B2B Transaction (PayBill)
export interface MpesaB2BPaybillTransaction {
  name: string;
  account: string;  // PayBill number
  account_reference: string;
  account_type: 'PayBill';
  amount: number;
  narrative: string;
}

// M-Pesa B2B Transaction (Till)
export interface MpesaB2BTillTransaction {
  name: string;
  account: string;  // Till number
  account_type: 'TillNumber';
  amount: number;
  narrative: string;
}

// Bank Transaction
export interface BankTransaction {
  name: string;
  account: string;  // Bank account number
  bank_code: string;
  amount: number;
  narrative: string;
}

export interface MpesaPayoutRequest {
  currency: string;
  wallet_id: string;
  transactions: Array<{
    name: string;
    account: string;
    amount: string;
    narrative: string;
  }>;
}

export interface PayoutResponse {
  tracking_id: string;
  status: string;
  nonce: string;
  transactions: Array<{
    status: string;
    request_reference_id: string;
    name: string;
    account: string;
    amount: string;
    narrative: string;
  }>;
}

export interface PayoutApprovalResponse {
  tracking_id: string;
  status: string;
  transactions: Array<{
    status: string;
    request_reference_id: string;
  }>;
}

// ================================
// Utility Functions
// ================================

/**
 * Normalize phone number to IntaSend format (254XXXXXXXXX)
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  let normalized = phoneNumber.replace(/[\s-]/g, '');
  
  if (normalized.startsWith('+254')) {
    return normalized.substring(1);
  } else if (normalized.startsWith('254')) {
    return normalized;
  } else if (normalized.startsWith('07') || normalized.startsWith('01')) {
    return '254' + normalized.substring(1);
  } else if (normalized.startsWith('7') || normalized.startsWith('1')) {
    return '254' + normalized;
  }
  
  return normalized;
}

/**
 * Calculate platform fee and net amount
 */
export function calculateFees(grossAmount: number): {
  grossAmount: number;
  platformFee: number;
  netAmount: number;
} {
  const platformFee = Math.round((grossAmount * SUPPORT_CONFIG.PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  const netAmount = Math.round((grossAmount - platformFee) * 100) / 100;
  
  return {
    grossAmount,
    platformFee,
    netAmount,
  };
}

/**
 * Validate support amount
 */
export function validateSupportAmount(amount: number): { valid: boolean; error?: string } {
  if (amount < SUPPORT_CONFIG.MIN_SUPPORT_AMOUNT) {
    return { 
      valid: false, 
      error: `Minimum support amount is KES ${SUPPORT_CONFIG.MIN_SUPPORT_AMOUNT}` 
    };
  }
  return { valid: true };
}

/**
 * Validate withdrawal amount
 */
export function validateWithdrawalAmount(
  amount: number, 
  availableBalance: number,
  dailyWithdrawnAmount: number
): { valid: boolean; error?: string } {
  if (amount < SUPPORT_CONFIG.MIN_WITHDRAWAL_AMOUNT) {
    return { 
      valid: false, 
      error: `Minimum withdrawal amount is KES ${SUPPORT_CONFIG.MIN_WITHDRAWAL_AMOUNT}` 
    };
  }
  
  if (amount > availableBalance) {
    return { 
      valid: false, 
      error: `Insufficient balance. Available: KES ${availableBalance.toFixed(2)}` 
    };
  }
  
  const remainingDailyLimit = SUPPORT_CONFIG.DAILY_WITHDRAWAL_LIMIT - dailyWithdrawnAmount;
  if (amount > remainingDailyLimit) {
    return { 
      valid: false, 
      error: `Daily withdrawal limit exceeded. Remaining today: KES ${remainingDailyLimit.toFixed(2)}` 
    };
  }
  
  return { valid: true };
}

/**
 * Validate bank withdrawal amount
 */
export function validateBankWithdrawalAmount(
  amount: number, 
  availableBalance: number,
  dailyWithdrawnAmount: number
): { valid: boolean; error?: string } {
  if (amount < SUPPORT_CONFIG.MIN_BANK_WITHDRAWAL) {
    return { 
      valid: false, 
      error: `Minimum bank withdrawal is KES ${SUPPORT_CONFIG.MIN_BANK_WITHDRAWAL}` 
    };
  }

  if (amount > SUPPORT_CONFIG.MAX_BANK_WITHDRAWAL) {
    return { 
      valid: false, 
      error: `Maximum bank withdrawal is KES ${SUPPORT_CONFIG.MAX_BANK_WITHDRAWAL.toLocaleString()}` 
    };
  }
  
  if (amount > availableBalance) {
    return { 
      valid: false, 
      error: `Insufficient balance. Available: KES ${availableBalance.toFixed(2)}` 
    };
  }
  
  const remainingDailyLimit = SUPPORT_CONFIG.DAILY_WITHDRAWAL_LIMIT - dailyWithdrawnAmount;
  if (amount > remainingDailyLimit) {
    return { 
      valid: false, 
      error: `Daily withdrawal limit exceeded. Remaining today: KES ${remainingDailyLimit.toFixed(2)}` 
    };
  }
  
  return { valid: true };
}

// ================================
// API Functions
// ================================

/**
 * Create a new IntaSend working wallet for an author
 */
export async function createWallet(label: string): Promise<WalletResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const response = await fetch(`${INTASEND_BASE_URL}/wallets/`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${INTASEND_SECRET_KEY}`,
    },
    body: JSON.stringify({
      label,
      wallet_type: 'WORKING',
      currency: SUPPORT_CONFIG.CURRENCY,
      can_disburse: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('IntaSend create wallet error:', errorText);
    throw new Error(`Failed to create wallet: ${response.status}`);
  }

  return response.json();
}

/**
 * Get wallet details including balance
 */
export async function getWalletDetails(walletId: string): Promise<WalletResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const response = await fetch(`${INTASEND_BASE_URL}/wallets/${walletId}/`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${INTASEND_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('IntaSend get wallet error:', errorText);
    throw new Error(`Failed to get wallet: ${response.status}`);
  }

  return response.json();
}

/**
 * Get wallet transaction history
 */
export async function getWalletTransactions(walletId: string): Promise<WalletTransaction[]> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const response = await fetch(`${INTASEND_BASE_URL}/wallets/${walletId}/transactions/`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${INTASEND_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('IntaSend get transactions error:', errorText);
    throw new Error(`Failed to get transactions: ${response.status}`);
  }

  return response.json();
}

/**
 * Fund wallet via M-Pesa STK Push (direct to wallet)
 */
export async function fundWalletMpesa(data: FundWalletMpesaRequest): Promise<{
  id: string;
  invoice: {
    invoice_id: string;
    state: string;
    value: number;
    account: string;
    api_ref: string;
  };
}> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const normalizedPhone = normalizePhoneNumber(data.phone_number);

  const response = await fetch(`${INTASEND_BASE_URL}/payment/mpesa-stk-push/`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${INTASEND_SECRET_KEY}`,
    },
    body: JSON.stringify({
      ...data,
      phone_number: normalizedPhone,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('IntaSend STK push error:', errorText);
    throw new Error(`Failed to initiate M-Pesa payment: ${response.status}`);
  }

  return response.json();
}

/**
 * Fund wallet via Checkout (M-Pesa/Card) - returns URL to redirect user
 */
export async function fundWalletCheckout(data: FundWalletCheckoutRequest): Promise<CheckoutResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const response = await fetch(`${INTASEND_BASE_URL}/checkout/`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${INTASEND_SECRET_KEY}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('IntaSend checkout error:', errorText);
    throw new Error(`Failed to create checkout: ${response.status}`);
  }

  return response.json();
}

/**
 * Initiate M-Pesa B2C payout (withdrawal to M-Pesa phone)
 * Uses IntaSend SDK for proper signing and approval
 */
export async function initiateMpesaB2CPayout(
  recipientName: string,
  mpesaNumber: string,
  amount: number,
  narrative: string,
  requiresApproval: boolean = false
): Promise<PayoutResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const normalizedPhone = normalizePhoneNumber(mpesaNumber);
  const payouts = intasend.payouts();

  try {
    const response = await payouts.mpesa({
      currency: SUPPORT_CONFIG.CURRENCY,
      requires_approval: requiresApproval ? 'YES' : 'NO',
      transactions: [{
        name: recipientName,
        account: normalizedPhone,
        amount: amount.toString(),
        narrative,
      }],
    });

    return response;
  } catch (error) {
    console.error('IntaSend M-Pesa B2C error:', error);
    throw new Error(`Failed to initiate M-Pesa B2C payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initiate M-Pesa B2B payout (to PayBill or Till)
 */
export async function initiateMpesaB2BPayout(
  transactions: Array<MpesaB2BPaybillTransaction | MpesaB2BTillTransaction>,
  requiresApproval: boolean = false
): Promise<PayoutResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const payouts = intasend.payouts();

  try {
    const response = await payouts.mpesaB2B({
      currency: SUPPORT_CONFIG.CURRENCY,
      requires_approval: requiresApproval ? 'YES' : 'NO',
      transactions: transactions.map(tx => ({
        ...tx,
        amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount as unknown as string),
      })),
    });

    return response;
  } catch (error) {
    console.error('IntaSend M-Pesa B2B error:', error);
    throw new Error(`Failed to initiate M-Pesa B2B payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Initiate Bank payout (PesaLink)
 */
export async function initiateBankPayout(
  transactions: BankTransaction[],
  requiresApproval: boolean = false
): Promise<PayoutResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const payouts = intasend.payouts();

  try {
    const response = await payouts.bank({
      currency: SUPPORT_CONFIG.CURRENCY,
      requires_approval: requiresApproval ? 'YES' : 'NO',
      transactions,
    });

    return response;
  } catch (error) {
    console.error('IntaSend bank payout error:', error);
    throw new Error(`Failed to initiate bank payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Approve a payout (required if requires_approval was YES)
 */
export async function approvePayout(payoutResponse: PayoutResponse): Promise<PayoutApprovalResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const payouts = intasend.payouts();

  try {
    const response = await payouts.approve(payoutResponse);
    return response;
  } catch (error) {
    console.error('IntaSend approve payout error:', error);
    throw new Error(`Failed to approve payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Legacy function for backward compatibility - uses SDK now
 */
export async function initiateWalletPayout(
  walletId: string,
  recipientName: string,
  mpesaNumber: string,
  amount: number,
  narrative: string
): Promise<PayoutResponse> {
  // Use the new SDK-based function
  return initiateMpesaB2CPayout(recipientName, mpesaNumber, amount, narrative, false);
}

/**
 * Legacy function for backward compatibility
 */
export async function approveWalletPayout(trackingId: string): Promise<PayoutApprovalResponse> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const payouts = intasend.payouts();

  try {
    // Create a minimal response object for approval
    const response = await payouts.approve({ tracking_id: trackingId } as PayoutResponse);
    return response;
  } catch (error) {
    console.error('IntaSend approve payout error:', error);
    throw new Error(`Failed to approve payout: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check payment status by invoice ID
 */
export async function checkPaymentStatus(invoiceId: string): Promise<{
  invoice: {
    invoice_id: string;
    state: 'PENDING' | 'COMPLETE' | 'FAILED';
    mpesa_reference: string | null;
    failed_reason: string | null;
    failed_code: string | null;
  };
}> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const response = await fetch(`${INTASEND_BASE_URL}/payment/status/`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${INTASEND_SECRET_KEY}`,
    },
    body: JSON.stringify({
      invoice_id: invoiceId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('IntaSend status check error:', errorText);
    throw new Error(`Failed to check payment status: ${response.status}`);
  }

  return response.json();
}

/**
 * Check payout/withdrawal status using SDK
 */
export async function checkPayoutStatus(trackingId: string): Promise<{
  tracking_id: string;
  status: string;
  transactions: Array<{
    status: string;
    request_reference_id: string;
  }>;
}> {
  if (!INTASEND_SECRET_KEY) {
    throw new Error('IntaSend API key is not configured');
  }

  const payouts = intasend.payouts();

  try {
    const response = await payouts.status({ tracking_id: trackingId });
    return response;
  } catch (error) {
    console.error('IntaSend payout status error:', error);
    throw new Error(`Failed to check payout status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get list of supported bank codes for PesaLink
 */
export async function getBankCodes(): Promise<Array<{ bank_name: string; bank_code: string }>> {
  const response = await fetch(`${INTASEND_BASE_URL}/send-money/bank-codes/ke/`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
    },
  });

  if (!response.ok) {
    // Return cached bank codes if API fails
    return Object.entries(BANK_CODES).map(([name, code]) => ({
      bank_name: name.replace(/_/g, ' '),
      bank_code: code,
    }));
  }

  return response.json();
}

// Payout status codes for reference
export const PAYOUT_BATCH_STATUS = {
  BP101: 'New batch or request, reading in progress',
  BF102: 'Batch/request failed',
  BP103: 'Batch/request waiting approval',
  BP104: 'Queued to check for float balance',
  BF105: 'Failed checking float balance',
  BP106: 'Float/balance check in progress',
  BF107: 'Failed advance float check issue',
  BP108: 'Advance internal validations in progress',
  BP109: 'Payment to beneficiary in progress',
  BP110: 'Sending payments to beneficiary in progress',
  BC100: 'Completed sending all transactions',
  BE111: 'Batch/request ended or cancelled early',
};

export const PAYOUT_TRANSACTION_STATUS = {
  TP101: 'New transaction, processing pending',
  TP102: 'Transaction processing started',
  TF103: 'Failed to initiate or process',
  TP104: 'Transaction results processing in progress',
  TF105: 'Status cannot be determined',
  TS100: 'Transaction successful',
  TF106: 'Transaction failed',
  TH107: 'Transaction under observation',
  TC108: 'Transaction canceled',
  TR109: 'Transaction queued for retry',
};

/**
 * Interpret payout status code
 */
export function interpretPayoutStatus(code: string): {
  isSuccess: boolean;
  isFailed: boolean;
  isPending: boolean;
  description: string;
} {
  const batchDescription = PAYOUT_BATCH_STATUS[code as keyof typeof PAYOUT_BATCH_STATUS];
  const txDescription = PAYOUT_TRANSACTION_STATUS[code as keyof typeof PAYOUT_TRANSACTION_STATUS];
  const description = batchDescription || txDescription || 'Unknown status';

  return {
    isSuccess: code === 'BC100' || code === 'TS100',
    isFailed: code.startsWith('BF') || code.startsWith('TF') || code === 'TC108',
    isPending: !code.startsWith('BC') && !code.startsWith('TS') && !code.startsWith('BF') && !code.startsWith('TF') && code !== 'TC108',
    description,
  };
}