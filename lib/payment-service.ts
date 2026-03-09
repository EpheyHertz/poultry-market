/**
 * Unified Payment Service
 * 
 * Ties IntaSend API calls to local Prisma Wallet/WalletTransaction records.
 * Covers: wallet lifecycle, deposits (STK/checkout), withdrawals (M-Pesa B2C/B2B, bank),
 * intra-wallet transfers, refunds/chargebacks, and balance syncing.
 */

import { prisma } from '@/lib/prisma';
import {
  createWallet as intasendCreateWallet,
  getWalletDetails,
  getWalletTransactions as intasendGetTransactions,
  fundWalletMpesa,
  fundWalletCheckout,
  initiateMpesaB2CPayout,
  initiateMpesaB2BPayout,
  initiateBankPayout,
  approvePayout,
  checkPaymentStatus as intasendCheckPaymentStatus,
  checkPayoutStatus,
  interpretPayoutStatus,
  normalizePhoneNumber,
  calculateFees,
  validateWithdrawalAmount,
  validateBankWithdrawalAmount,
  SUPPORT_CONFIG,
  BANK_CODES,
  type WalletResponse,
  type PayoutResponse,
  type MpesaB2BPaybillTransaction,
  type MpesaB2BTillTransaction,
  type BankTransaction,
} from '@/lib/intasend-wallets';
import {
  initiateStkPush,
  checkPaymentStatus,
  formatPaymentAmount,
  generateExternalReference,
} from '@/lib/intasend';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface CreateWalletInput {
  userId: string;
  label: string;
  canDisburse?: boolean;
  isPrimary?: boolean;
}

export interface DepositMpesaInput {
  walletId: string; // Our local wallet ID
  userId: string;
  amount: number;
  phoneNumber: string;
  narrative?: string;
}

export interface DepositCheckoutInput {
  walletId: string;
  userId: string;
  amount: number;
  email: string;
  redirectUrl: string;
  narrative?: string;
}

export interface WithdrawMpesaInput {
  walletId: string;
  userId: string;
  amount: number;
  recipientName: string;
  mpesaNumber: string;
  narrative?: string;
}

export interface WithdrawB2BInput {
  walletId: string;
  userId: string;
  amount: number;
  businessName: string;
  accountType: 'PayBill' | 'TillNumber';
  account: string;
  accountReference?: string;
  narrative?: string;
}

export interface WithdrawBankInput {
  walletId: string;
  userId: string;
  amount: number;
  accountName: string;
  bankAccount: string;
  bankCode: string;
  narrative?: string;
}

export interface IntraTransferInput {
  fromWalletId: string;
  toWalletId: string;
  userId: string;
  amount: number;
  narrative?: string;
}

export interface RefundInput {
  userId: string;
  invoiceId: string;
  amount: number;
  reason: string;
  reasonDetails?: string;
  walletId?: string; // Optional — wallet to credit
}

export type WalletWithBalance = {
  id: string;
  userId: string;
  intasendId: string;
  walletType: string;
  currency: string;
  label: string;
  canDisburse: boolean;
  currentBalance: number;
  availableBalance: number;
  isActive: boolean;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// ═══════════════════════════════════════════
// WALLET LIFECYCLE
// ═══════════════════════════════════════════

/**
 * Create a new IntaSend WORKING wallet for a user and persist it locally.
 */
export async function createUserWallet(input: CreateWalletInput): Promise<WalletWithBalance> {
  const { userId, label, canDisburse = true, isPrimary = false } = input;

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!user) throw new Error('User not found');

  // If this is to be primary, un-primary any existing
  if (isPrimary) {
    await prisma.wallet.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  // Create on IntaSend
  const intasendWallet = await intasendCreateWallet(label);

  // Persist locally
  const wallet = await prisma.wallet.create({
    data: {
      userId,
      intasendId: intasendWallet.wallet_id,
      walletType: 'WORKING',
      currency: intasendWallet.currency || 'KES',
      label,
      canDisburse,
      currentBalance: parseFloat(intasendWallet.current_balance) || 0,
      availableBalance: parseFloat(intasendWallet.available_balance) || 0,
      isPrimary,
    },
  });

  return wallet;
}

/**
 * List all wallets for a user (local records).
 */
export async function listUserWallets(userId: string): Promise<WalletWithBalance[]> {
  return prisma.wallet.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
}

/**
 * Get wallet details — sync balance from IntaSend then return local record.
 */
export async function getWallet(walletId: string, userId?: string) {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) throw new Error('Wallet not found');
  if (userId && wallet.userId !== userId) throw new Error('Unauthorized');

  // Sync from IntaSend
  try {
    const remote = await getWalletDetails(wallet.intasendId);
    const currentBalance = parseFloat(remote.current_balance) || 0;
    const availableBalance = parseFloat(remote.available_balance) || 0;

    if (currentBalance !== wallet.currentBalance || availableBalance !== wallet.availableBalance) {
      await prisma.wallet.update({
        where: { id: walletId },
        data: { currentBalance, availableBalance, updatedAt: new Date() },
      });
      return { ...wallet, currentBalance, availableBalance };
    }
  } catch (e) {
    console.warn('Balance sync failed, using cached:', e);
  }

  return wallet;
}

/**
 * Get or create a user's primary wallet.
 */
export async function getOrCreatePrimaryWallet(userId: string): Promise<WalletWithBalance> {
  const existing = await prisma.wallet.findFirst({
    where: { userId, isPrimary: true, isActive: true },
  });

  if (existing) return existing;

  // Find user label
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const label = `${user?.name || user?.email || userId}-primary`;

  return createUserWallet({ userId, label, isPrimary: true });
}

// ═══════════════════════════════════════════
// DEPOSITS
// ═══════════════════════════════════════════

/**
 * Deposit via M-Pesa STK Push → wallet.
 * Creates a PENDING WalletTransaction and triggers the STK push.
 */
export async function depositViaMpesa(input: DepositMpesaInput) {
  const { walletId, userId, amount, phoneNumber, narrative } = input;

  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet || wallet.userId !== userId) throw new Error('Wallet not found');

  const externalRef = generateExternalReference('deposit', walletId);

  // Initiate STK push targeted at the IntaSend wallet
  const stkResult = await initiateStkPush({
    amount: formatPaymentAmount(amount),
    phone_number: phoneNumber,
    api_ref: externalRef,
    wallet_id: wallet.intasendId,
  });

  // Record transaction locally
  const tx = await prisma.walletTransaction.create({
    data: {
      walletId,
      userId,
      type: 'DEPOSIT',
      status: 'PENDING',
      amount,
      fee: 0,
      netAmount: amount,
      currency: wallet.currency,
      invoiceId: stkResult.invoice.invoice_id,
      externalReference: externalRef,
      narrative: narrative || 'M-Pesa deposit',
    },
  });

  return {
    transaction: tx,
    stkPush: stkResult,
    invoiceId: stkResult.invoice.invoice_id,
  };
}

/**
 * Deposit via Checkout Link (M-Pesa or Card) → wallet.
 * Returns a URL to redirect the user to.
 */
export async function depositViaCheckout(input: DepositCheckoutInput) {
  const { walletId, userId, amount, email, redirectUrl, narrative } = input;

  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet || wallet.userId !== userId) throw new Error('Wallet not found');

  const externalRef = generateExternalReference('checkout', walletId);

  const checkout = await fundWalletCheckout({
    first_name: '',
    last_name: '',
    email,
    host: '',
    amount,
    currency: wallet.currency,
    api_ref: externalRef,
    redirect_url: redirectUrl,
    wallet_id: wallet.intasendId,
  });

  const tx = await prisma.walletTransaction.create({
    data: {
      walletId,
      userId,
      type: 'DEPOSIT',
      status: 'PENDING',
      amount,
      fee: 0,
      netAmount: amount,
      currency: wallet.currency,
      invoiceId: checkout.id,
      externalReference: externalRef,
      narrative: narrative || 'Checkout deposit',
    },
  });

  return {
    transaction: tx,
    checkoutUrl: checkout.url,
    checkoutId: checkout.id,
  };
}

/**
 * Confirm deposit after IntaSend webhook / polling confirms COMPLETE.
 */
export async function confirmDeposit(invoiceId: string) {
  const tx = await prisma.walletTransaction.findFirst({
    where: { invoiceId, type: 'DEPOSIT' },
    include: { wallet: true },
  });

  if (!tx) throw new Error('Transaction not found');
  if (tx.status === 'COMPLETED') return tx;

  // Check with IntaSend
  const status = await checkPaymentStatus(invoiceId);
  const state = status.invoice.state;

  if (state === 'COMPLETE') {
    const netAmount = parseFloat(status.invoice.net_amount) || tx.amount;

    const updated = await prisma.$transaction(async (prismaClient) => {
      // Update transaction
      const updatedTx = await prismaClient.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: 'COMPLETED',
          netAmount,
          fee: tx.amount - netAmount,
          mpesaReference: status.invoice.mpesa_reference,
          runningBalance: (tx.wallet.currentBalance || 0) + netAmount,
        },
      });

      // Update wallet balance
      await prismaClient.wallet.update({
        where: { id: tx.walletId },
        data: {
          currentBalance: { increment: netAmount },
          availableBalance: { increment: netAmount },
        },
      });

      return updatedTx;
    });

    return updated;
  } else if (state === 'FAILED') {
    await prisma.walletTransaction.update({
      where: { id: tx.id },
      data: {
        status: 'FAILED',
        failedReason: status.invoice.failed_reason,
        failedCode: status.invoice.failed_code,
      },
    });
  }

  return prisma.walletTransaction.findUnique({ where: { id: tx.id } });
}

// ═══════════════════════════════════════════
// WITHDRAWALS
// ═══════════════════════════════════════════

/**
 * Withdraw to M-Pesa (B2C).
 */
export async function withdrawToMpesa(input: WithdrawMpesaInput) {
  const { walletId, userId, amount, recipientName, mpesaNumber, narrative } = input;

  const wallet = await getWallet(walletId, userId);
  if (!wallet.canDisburse) throw new Error('This wallet cannot disburse');

  // Validate
  const validation = validateWithdrawalAmount(amount, wallet.availableBalance, 0);
  if (!validation.valid) throw new Error(validation.error);

  const externalRef = generateExternalReference('mpesa_b2c', walletId);

  // Create PENDING transaction
  const tx = await prisma.walletTransaction.create({
    data: {
      walletId,
      userId,
      type: 'WITHDRAWAL_MPESA',
      status: 'PROCESSING',
      amount,
      fee: 0,
      netAmount: amount,
      currency: wallet.currency,
      externalReference: externalRef,
      narrative: narrative || `M-Pesa withdrawal to ${mpesaNumber}`,
    },
  });

  // Deduct balance immediately (optimistic)
  await prisma.wallet.update({
    where: { id: walletId },
    data: {
      availableBalance: { decrement: amount },
    },
  });

  try {
    // Initiate payout via IntaSend SDK
    const payout = await initiateMpesaB2CPayout(
      recipientName,
      mpesaNumber,
      amount,
      narrative || 'Withdrawal',
      false // auto-approve
    );

    // Update transaction with tracking info
    await prisma.walletTransaction.update({
      where: { id: tx.id },
      data: {
        trackingId: payout.tracking_id,
        metadata: JSON.stringify({ payout }),
      },
    });

    return { transaction: tx, payout };
  } catch (error) {
    // Rollback balance on failure
    await prisma.$transaction([
      prisma.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: 'FAILED',
          failedReason: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      prisma.wallet.update({
        where: { id: walletId },
        data: { availableBalance: { increment: amount } },
      }),
    ]);
    throw error;
  }
}

/**
 * Withdraw to PayBill or Till (B2B).
 */
export async function withdrawToB2B(input: WithdrawB2BInput) {
  const { walletId, userId, amount, businessName, accountType, account, accountReference, narrative } = input;

  const wallet = await getWallet(walletId, userId);
  if (!wallet.canDisburse) throw new Error('This wallet cannot disburse');

  const validation = validateWithdrawalAmount(amount, wallet.availableBalance, 0);
  if (!validation.valid) throw new Error(validation.error);

  const externalRef = generateExternalReference('b2b', walletId);

  const tx = await prisma.walletTransaction.create({
    data: {
      walletId,
      userId,
      type: 'WITHDRAWAL_B2B',
      status: 'PROCESSING',
      amount,
      fee: 0,
      netAmount: amount,
      currency: wallet.currency,
      externalReference: externalRef,
      narrative: narrative || `B2B to ${accountType} ${account}`,
    },
  });

  await prisma.wallet.update({
    where: { id: walletId },
    data: { availableBalance: { decrement: amount } },
  });

  try {
    const transaction = accountType === 'PayBill'
      ? [{
          name: businessName,
          account,
          account_reference: accountReference || '',
          account_type: 'PayBill' as const,
          amount,
          narrative: narrative || 'Payment',
        }]
      : [{
          name: businessName,
          account,
          account_type: 'TillNumber' as const,
          amount,
          narrative: narrative || 'Payment',
        }];

    const payout = await initiateMpesaB2BPayout(transaction, false);

    await prisma.walletTransaction.update({
      where: { id: tx.id },
      data: {
        trackingId: payout.tracking_id,
        metadata: JSON.stringify({ payout }),
      },
    });

    return { transaction: tx, payout };
  } catch (error) {
    await prisma.$transaction([
      prisma.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: 'FAILED',
          failedReason: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      prisma.wallet.update({
        where: { id: walletId },
        data: { availableBalance: { increment: amount } },
      }),
    ]);
    throw error;
  }
}

/**
 * Withdraw to Bank account (PesaLink).
 */
export async function withdrawToBank(input: WithdrawBankInput) {
  const { walletId, userId, amount, accountName, bankAccount, bankCode, narrative } = input;

  const wallet = await getWallet(walletId, userId);
  if (!wallet.canDisburse) throw new Error('This wallet cannot disburse');

  const validation = validateBankWithdrawalAmount(amount, wallet.availableBalance, 0);
  if (!validation.valid) throw new Error(validation.error);

  const externalRef = generateExternalReference('bank', walletId);

  const tx = await prisma.walletTransaction.create({
    data: {
      walletId,
      userId,
      type: 'WITHDRAWAL_BANK',
      status: 'PROCESSING',
      amount,
      fee: 0,
      netAmount: amount,
      currency: wallet.currency,
      externalReference: externalRef,
      narrative: narrative || `Bank transfer to ${accountName}`,
    },
  });

  await prisma.wallet.update({
    where: { id: walletId },
    data: { availableBalance: { decrement: amount } },
  });

  try {
    const bankTx: BankTransaction[] = [{
      name: accountName,
      account: bankAccount,
      bank_code: bankCode,
      amount,
      narrative: narrative || 'Withdrawal',
    }];

    const payout = await initiateBankPayout(bankTx, false);

    await prisma.walletTransaction.update({
      where: { id: tx.id },
      data: {
        trackingId: payout.tracking_id,
        metadata: JSON.stringify({ payout }),
      },
    });

    return { transaction: tx, payout };
  } catch (error) {
    await prisma.$transaction([
      prisma.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: 'FAILED',
          failedReason: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      prisma.wallet.update({
        where: { id: walletId },
        data: { availableBalance: { increment: amount } },
      }),
    ]);
    throw error;
  }
}

/**
 * Update withdrawal status from IntaSend callback or polling.
 */
export async function updateWithdrawalStatus(trackingId: string) {
  const tx = await prisma.walletTransaction.findFirst({
    where: { trackingId },
    include: { wallet: true },
  });
  if (!tx) throw new Error('Transaction not found for tracking_id');

  const statusResult = await checkPayoutStatus(trackingId);
  const interpreted = interpretPayoutStatus(statusResult.status);

  if (interpreted.isSuccess && tx.status !== 'COMPLETED') {
    return prisma.$transaction(async (pc) => {
      const updated = await pc.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: 'COMPLETED',
          runningBalance: (tx.wallet.currentBalance || 0) - tx.amount,
        },
      });
      await pc.wallet.update({
        where: { id: tx.walletId },
        data: { currentBalance: { decrement: tx.amount } },
      });
      return updated;
    });
  }

  if (interpreted.isFailed && tx.status !== 'FAILED') {
    return prisma.$transaction(async (pc) => {
      const updated = await pc.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: 'FAILED',
          failedReason: interpreted.description,
        },
      });
      // Refund available balance
      await pc.wallet.update({
        where: { id: tx.walletId },
        data: { availableBalance: { increment: tx.amount } },
      });
      return updated;
    });
  }

  return tx;
}

// ═══════════════════════════════════════════
// INTRA-WALLET TRANSFERS
// ═══════════════════════════════════════════

/**
 * Transfer funds between two wallets (both must be owned by accounts on the platform).
 * Uses IntaSend's intra-transfer API under the hood.
 */
export async function intraWalletTransfer(input: IntraTransferInput) {
  const { fromWalletId, toWalletId, userId, amount, narrative } = input;

  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findUnique({ where: { id: fromWalletId } }),
    prisma.wallet.findUnique({ where: { id: toWalletId } }),
  ]);

  if (!fromWallet || !toWallet) throw new Error('Wallet not found');
  if (fromWallet.userId !== userId) throw new Error('Unauthorized');
  if (amount <= 0) throw new Error('Amount must be positive');
  if (amount > fromWallet.availableBalance) throw new Error('Insufficient balance');

  const externalRef = generateExternalReference('transfer', fromWalletId);

  // Create paired transactions inside a DB transaction
  const result = await prisma.$transaction(async (pc) => {
    const outTx = await pc.walletTransaction.create({
      data: {
        walletId: fromWalletId,
        userId,
        type: 'INTERNAL_OUT',
        status: 'COMPLETED',
        amount,
        fee: 0,
        netAmount: amount,
        currency: fromWallet.currency,
        counterpartyWalletId: toWalletId,
        externalReference: externalRef,
        narrative: narrative || 'Transfer out',
        runningBalance: fromWallet.currentBalance - amount,
      },
    });

    const inTx = await pc.walletTransaction.create({
      data: {
        walletId: toWalletId,
        userId: toWallet.userId,
        type: 'INTERNAL_IN',
        status: 'COMPLETED',
        amount,
        fee: 0,
        netAmount: amount,
        currency: toWallet.currency,
        counterpartyWalletId: fromWalletId,
        externalReference: externalRef,
        narrative: narrative || 'Transfer in',
        runningBalance: toWallet.currentBalance + amount,
      },
    });

    await pc.wallet.update({
      where: { id: fromWalletId },
      data: {
        currentBalance: { decrement: amount },
        availableBalance: { decrement: amount },
      },
    });

    await pc.wallet.update({
      where: { id: toWalletId },
      data: {
        currentBalance: { increment: amount },
        availableBalance: { increment: amount },
      },
    });

    return { outTransaction: outTx, inTransaction: inTx };
  });

  return result;
}

// ═══════════════════════════════════════════
// REFUNDS / CHARGEBACKS
// ═══════════════════════════════════════════

const INTASEND_BASE_URL = 'https://api.intasend.com/api/v1';
const INTASEND_SECRET_KEY = process.env.INTASEND_API_KEY;

/**
 * Create a refund / chargeback via IntaSend.
 */
export async function createRefund(input: RefundInput) {
  const { userId, invoiceId, amount, reason, reasonDetails, walletId } = input;

  if (!INTASEND_SECRET_KEY) throw new Error('IntaSend API key not configured');

  // Call IntaSend chargeback API
  const res = await fetch(`${INTASEND_BASE_URL}/chargebacks/`, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'authorization': `Bearer ${INTASEND_SECRET_KEY}`,
    },
    body: JSON.stringify({
      invoice: invoiceId,
      amount,
      reason,
      reason_details: reasonDetails || reason,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('IntaSend refund error:', errorText);
    throw new Error(`Refund failed: ${res.status}`);
  }

  const refundResult = await res.json();

  // If we have a target wallet, record the credit
  if (walletId) {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (wallet) {
      await prisma.walletTransaction.create({
        data: {
          walletId,
          userId,
          type: 'REFUND',
          status: 'PENDING',
          amount,
          fee: 0,
          netAmount: amount,
          currency: wallet.currency,
          invoiceId,
          externalReference: refundResult.chargeback_id || refundResult.id,
          narrative: `Refund: ${reason}`,
        },
      });
    }
  }

  return refundResult;
}

/**
 * List refunds from IntaSend.
 */
export async function listRefunds() {
  if (!INTASEND_SECRET_KEY) throw new Error('IntaSend API key not configured');

  const res = await fetch(`${INTASEND_BASE_URL}/chargebacks/`, {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${INTASEND_SECRET_KEY}`,
    },
  });

  if (!res.ok) throw new Error(`Failed to list refunds: ${res.status}`);
  return res.json();
}

/**
 * Get refund details by ID.
 */
export async function getRefundDetails(chargebackId: string) {
  if (!INTASEND_SECRET_KEY) throw new Error('IntaSend API key not configured');

  const res = await fetch(`${INTASEND_BASE_URL}/chargebacks/${chargebackId}/`, {
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${INTASEND_SECRET_KEY}`,
    },
  });

  if (!res.ok) throw new Error(`Failed to get refund: ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════
// TRANSACTION HISTORY
// ═══════════════════════════════════════════

/**
 * Get paginated transaction history for a wallet.
 */
export async function getTransactionHistory(
  walletId: string,
  userId: string,
  options: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  const { page = 1, limit = 20, type, status, startDate, endDate } = options;

  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet || wallet.userId !== userId) throw new Error('Wallet not found');

  const where: any = { walletId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ═══════════════════════════════════════════
// BALANCE SYNC
// ═══════════════════════════════════════════

/**
 * Sync all active wallet balances from IntaSend.
 * Useful as a periodic cron job.
 */
export async function syncAllWalletBalances() {
  const wallets = await prisma.wallet.findMany({ where: { isActive: true } });
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const wallet of wallets) {
    try {
      const remote = await getWalletDetails(wallet.intasendId);
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          currentBalance: parseFloat(remote.current_balance) || 0,
          availableBalance: parseFloat(remote.available_balance) || 0,
        },
      });
      results.push({ id: wallet.id, success: true });
    } catch (e) {
      results.push({ id: wallet.id, success: false, error: String(e) });
    }
  }

  return results;
}

// ═══════════════════════════════════════════
// SALE CREDIT (POS / Order proceeds → seller wallet)
// ═══════════════════════════════════════════

/**
 * Credit a seller's wallet when a sale/order is completed.
 * Deducts commission and deposits net amount.
 */
export async function creditSaleToWallet(params: {
  sellerId: string;
  amount: number;
  commissionRate?: number;
  orderId?: string;
  saleId?: string;
  narrative?: string;
}) {
  const { sellerId, amount, commissionRate = 5, orderId, saleId, narrative } = params;

  // Get or create the seller's primary wallet
  const wallet = await getOrCreatePrimaryWallet(sellerId);

  const commission = Math.round(amount * (commissionRate / 100) * 100) / 100;
  const netAmount = Math.round((amount - commission) * 100) / 100;

  const result = await prisma.$transaction(async (pc) => {
    // Credit transaction
    const creditTx = await pc.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: sellerId,
        type: 'SALE_CREDIT',
        status: 'COMPLETED',
        amount,
        fee: commission,
        netAmount,
        currency: wallet.currency,
        orderId,
        saleId,
        narrative: narrative || `Sale credit${orderId ? ` (order ${orderId.slice(-8)})` : ''}`,
        runningBalance: wallet.currentBalance + netAmount,
      },
    });

    // Commission transaction (deduction record)
    if (commission > 0) {
      await pc.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: sellerId,
          type: 'COMMISSION',
          status: 'COMPLETED',
          amount: commission,
          fee: 0,
          netAmount: commission,
          currency: wallet.currency,
          orderId,
          saleId,
          narrative: `${commissionRate}% commission on sale`,
        },
      });
    }

    // Update wallet balance
    await pc.wallet.update({
      where: { id: wallet.id },
      data: {
        currentBalance: { increment: netAmount },
        availableBalance: { increment: netAmount },
      },
    });

    return creditTx;
  });

  return result;
}

// Re-export bank codes for convenience
export { BANK_CODES, SUPPORT_CONFIG };
