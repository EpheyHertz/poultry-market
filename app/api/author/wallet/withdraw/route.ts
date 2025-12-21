import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  initiateMpesaB2CPayout,
  initiateMpesaB2BPayout,
  initiateBankPayout,
  checkPayoutStatus,
  validateWithdrawalAmount,
  validateBankWithdrawalAmount,
  normalizePhoneNumber,
  interpretPayoutStatus,
  SUPPORT_CONFIG,
  WithdrawalMethod,
  MpesaB2BPaybillTransaction,
  MpesaB2BTillTransaction,
  BankTransaction,
} from '@/lib/intasend-wallets';

interface WithdrawRequestBody {
  amount: number;
  method: WithdrawalMethod;
  // M-Pesa B2C
  mpesaNumber?: string;
  // M-Pesa B2B PayBill
  paybillNumber?: string;
  paybillAccount?: string;
  paybillName?: string;
  // M-Pesa B2B Till
  tillNumber?: string;
  tillName?: string;
  // Bank
  bankCode?: string;
  bankAccount?: string;
  accountName?: string;
  bankName?: string;
  narrative?: string;
}

/**
 * POST /api/author/wallet/withdraw
 * Initiate a withdrawal from the author's wallet
 * Supports M-Pesa B2C, M-Pesa B2B (PayBill/Till), and Bank transfers
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: WithdrawRequestBody = await request.json();
    const { 
      amount, 
      method = 'MPESA_B2C',
      mpesaNumber,
      paybillNumber,
      paybillAccount,
      paybillName,
      tillNumber,
      tillName,
      bankCode,
      bankAccount,
      accountName,
      bankName,
      narrative = 'Author support withdrawal',
    } = body;

    if (!amount) {
      return NextResponse.json(
        { error: 'Amount is required' },
        { status: 400 }
      );
    }

    // Validate method-specific required fields
    switch (method) {
      case 'MPESA_B2C':
        if (!mpesaNumber) {
          return NextResponse.json(
            { error: 'M-Pesa number is required for B2C withdrawal' },
            { status: 400 }
          );
        }
        break;
      case 'MPESA_B2B_PAYBILL':
        if (!paybillNumber || !paybillAccount) {
          return NextResponse.json(
            { error: 'PayBill number and account reference are required' },
            { status: 400 }
          );
        }
        break;
      case 'MPESA_B2B_TILL':
        if (!tillNumber) {
          return NextResponse.json(
            { error: 'Till number is required' },
            { status: 400 }
          );
        }
        break;
      case 'BANK':
        if (!bankCode || !bankAccount || !accountName) {
          return NextResponse.json(
            { error: 'Bank code, account number, and account name are required' },
            { status: 400 }
          );
        }
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid withdrawal method' },
          { status: 400 }
        );
    }

    // Get wallet
    const wallet = await prisma.authorWallet.findFirst({
      where: {
        authorProfile: { userId: user.id },
        status: 'ACTIVE',
      },
      include: {
        authorProfile: {
          select: { displayName: true, username: true },
        },
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Active wallet not found' },
        { status: 404 }
      );
    }

    // Check if daily limit should reset
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let dailyWithdrawnAmount = wallet.dailyWithdrawnAmount;
    if (wallet.lastWithdrawalDate && wallet.lastWithdrawalDate < today) {
      dailyWithdrawnAmount = 0;
    }

    // Validate withdrawal amount based on method
    const validation = method === 'BANK'
      ? validateBankWithdrawalAmount(amount, wallet.availableBalance, dailyWithdrawnAmount)
      : validateWithdrawalAmount(amount, wallet.availableBalance, dailyWithdrawnAmount);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Create withdrawal request record
    const withdrawalData: any = {
      walletId: wallet.id,
      amount,
      method,
      currency: SUPPORT_CONFIG.CURRENCY,
      status: 'PENDING',
    };

    // Add method-specific fields
    switch (method) {
      case 'MPESA_B2C':
        withdrawalData.mpesaNumber = normalizePhoneNumber(mpesaNumber!);
        break;
      case 'MPESA_B2B_PAYBILL':
        withdrawalData.paybillNumber = paybillNumber;
        withdrawalData.paybillAccount = paybillAccount;
        break;
      case 'MPESA_B2B_TILL':
        withdrawalData.tillNumber = tillNumber;
        break;
      case 'BANK':
        withdrawalData.bankCode = bankCode;
        withdrawalData.bankAccount = bankAccount;
        withdrawalData.accountName = accountName;
        withdrawalData.bankName = bankName;
        break;
    }

    const withdrawalRequest = await prisma.withdrawalRequest.create({
      data: withdrawalData,
    });

    try {
      let payoutResponse;
      const authorName = wallet.authorProfile.displayName || 'Author';

      // Initiate payout based on method
      switch (method) {
        case 'MPESA_B2C':
          payoutResponse = await initiateMpesaB2CPayout(
            authorName,
            withdrawalData.mpesaNumber,
            amount,
            narrative,
            false // Auto-approve (no manual approval needed)
          );
          break;

        case 'MPESA_B2B_PAYBILL':
          const paybillTx: MpesaB2BPaybillTransaction = {
            name: paybillName || 'Business',
            account: paybillNumber!,
            account_reference: paybillAccount!,
            account_type: 'PayBill',
            amount,
            narrative,
          };
          payoutResponse = await initiateMpesaB2BPayout([paybillTx], false);
          break;

        case 'MPESA_B2B_TILL':
          const tillTx: MpesaB2BTillTransaction = {
            name: tillName || 'Business',
            account: tillNumber!,
            account_type: 'TillNumber',
            amount,
            narrative,
          };
          payoutResponse = await initiateMpesaB2BPayout([tillTx], false);
          break;

        case 'BANK':
          const bankTx: BankTransaction = {
            name: accountName!,
            account: bankAccount!,
            bank_code: bankCode!,
            amount,
            narrative,
          };
          payoutResponse = await initiateBankPayout([bankTx], false);
          break;
      }

      if (!payoutResponse) {
        throw new Error('Failed to get payout response');
      }

      // Update withdrawal with IntaSend tracking info
      await prisma.withdrawalRequest.update({
        where: { id: withdrawalRequest.id },
        data: {
          intasendPayoutId: payoutResponse.tracking_id,
          status: 'PROCESSING',
        },
      });

      // Update wallet balances and daily amount
      await prisma.authorWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: amount },
          currentBalance: { decrement: amount },
          totalWithdrawn: { increment: amount },
          dailyWithdrawnAmount: dailyWithdrawnAmount + amount,
          lastWithdrawalDate: new Date(),
        },
      });

      // Get method-specific destination for response
      let destination = '';
      switch (method) {
        case 'MPESA_B2C':
          destination = withdrawalData.mpesaNumber;
          break;
        case 'MPESA_B2B_PAYBILL':
          destination = `PayBill ${paybillNumber} (${paybillAccount})`;
          break;
        case 'MPESA_B2B_TILL':
          destination = `Till ${tillNumber}`;
          break;
        case 'BANK':
          destination = `${bankName || 'Bank'} - ${bankAccount}`;
          break;
      }

      return NextResponse.json({
        success: true,
        message: 'Withdrawal initiated successfully. You should receive the funds shortly.',
        withdrawal: {
          id: withdrawalRequest.id,
          amount,
          method,
          destination,
          status: 'PROCESSING',
          trackingId: payoutResponse.tracking_id,
        },
      });

    } catch (payoutError) {
      // Update withdrawal as failed
      await prisma.withdrawalRequest.update({
        where: { id: withdrawalRequest.id },
        data: {
          status: 'FAILED',
          failedReason: payoutError instanceof Error ? payoutError.message : 'Payout failed',
        },
      });

      console.error('Payout error:', payoutError);
      return NextResponse.json(
        { error: payoutError instanceof Error ? payoutError.message : 'Failed to process withdrawal' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json(
      { error: 'Failed to process withdrawal. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/author/wallet/withdraw
 * Get withdrawal history
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const wallet = await prisma.authorWallet.findFirst({
      where: {
        authorProfile: { userId: user.id },
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      withdrawals: withdrawals.map(w => {
        // Build destination based on method
        let destination = '';
        switch (w.method) {
          case 'MPESA_B2C':
            destination = w.mpesaNumber || '';
            break;
          case 'MPESA_B2B_PAYBILL':
            destination = `PayBill ${w.paybillNumber} (${w.paybillAccount})`;
            break;
          case 'MPESA_B2B_TILL':
            destination = `Till ${w.tillNumber}`;
            break;
          case 'BANK':
            destination = `${w.bankName || 'Bank'} - ${w.bankAccount}`;
            break;
          default:
            destination = w.mpesaNumber || '';
        }

        return {
          id: w.id,
          amount: w.amount,
          method: w.method,
          destination,
          mpesaNumber: w.mpesaNumber,
          bankAccount: w.bankAccount,
          bankName: w.bankName,
          status: w.status,
          statusCode: w.statusCode,
          failedReason: w.failedReason,
          mpesaReference: w.mpesaReference,
          createdAt: w.createdAt,
          processedAt: w.processedAt,
        };
      }),
    });

  } catch (error) {
    console.error('Error getting withdrawals:', error);
    return NextResponse.json(
      { error: 'Failed to get withdrawals' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/author/wallet/withdraw
 * Check and update withdrawal status
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { withdrawalId } = await request.json();

    if (!withdrawalId) {
      return NextResponse.json(
        { error: 'Withdrawal ID is required' },
        { status: 400 }
      );
    }

    // Get withdrawal
    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: {
        id: withdrawalId,
        wallet: {
          authorProfile: { userId: user.id },
        },
      },
      include: {
        wallet: true,
      },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    if (!withdrawal.intasendPayoutId) {
      return NextResponse.json(
        { error: 'No tracking ID for this withdrawal' },
        { status: 400 }
      );
    }

    // Check status with IntaSend
    const statusResponse = await checkPayoutStatus(withdrawal.intasendPayoutId);
    const statusInfo = interpretPayoutStatus(statusResponse.status);

    // Update withdrawal status
    let newStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' = 'PROCESSING';
    if (statusInfo.isSuccess) {
      newStatus = 'COMPLETED';
    } else if (statusInfo.isFailed) {
      newStatus = 'FAILED';
    }

    // Get transaction reference if available
    const txRef = statusResponse.transactions?.[0]?.request_reference_id;

    await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: newStatus,
        statusCode: statusResponse.status,
        mpesaReference: txRef || withdrawal.mpesaReference,
        processedAt: statusInfo.isSuccess ? new Date() : withdrawal.processedAt,
        failedReason: statusInfo.isFailed ? statusInfo.description : withdrawal.failedReason,
      },
    });

    // If failed, refund the wallet
    if (statusInfo.isFailed && withdrawal.status !== 'FAILED') {
      await prisma.authorWallet.update({
        where: { id: withdrawal.walletId },
        data: {
          availableBalance: { increment: withdrawal.amount },
          currentBalance: { increment: withdrawal.amount },
          totalWithdrawn: { decrement: withdrawal.amount },
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      statusCode: statusResponse.status,
      statusDescription: statusInfo.description,
      reference: txRef,
    });

  } catch (error) {
    console.error('Error checking withdrawal status:', error);
    return NextResponse.json(
      { error: 'Failed to check withdrawal status' },
      { status: 500 }
    );
  }
}
