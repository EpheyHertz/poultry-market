import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPaymentStatus } from '@/lib/intasend-wallets';

/**
 * POST /api/support/webhook
 * Handle IntaSend payment webhooks for support transactions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Support webhook received:', JSON.stringify(body, null, 2));

    const {
      invoice_id,
      state,
      api_ref,
      mpesa_reference,
      failed_reason,
      failed_code,
    } = body;

    // Extract transaction ID from api_ref (format: support-{transactionId})
    const transactionId = api_ref?.startsWith('support-') 
      ? api_ref.replace('support-', '') 
      : null;

    if (!transactionId) {
      console.log('Webhook not for support transaction, skipping');
      return NextResponse.json({ received: true });
    }

    // Find the transaction
    const transaction = await prisma.supportTransaction.findUnique({
      where: { id: transactionId },
      include: {
        wallet: {
          include: {
            authorProfile: {
              select: { userId: true, displayName: true },
            },
          },
        },
      },
    });

    if (!transaction) {
      console.error('Transaction not found:', transactionId);
      return NextResponse.json({ received: true, error: 'Transaction not found' });
    }

    // Update transaction based on state
    if (state === 'COMPLETE') {
      // Payment successful
      await prisma.$transaction(async (tx) => {
        // Update transaction
        await tx.supportTransaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            mpesaReference: mpesa_reference,
            completedAt: new Date(),
          },
        });

        // Update wallet stats
        await tx.authorWallet.update({
          where: { id: transaction.walletId },
          data: {
            currentBalance: { increment: transaction.netAmount },
            availableBalance: { increment: transaction.netAmount },
            totalReceived: { increment: transaction.amount },
            platformFeeTotal: { increment: transaction.platformFee },
            supportersCount: { increment: 1 },
            transactionsCount: { increment: 1 },
          },
        });

        // Create notification for author (if notification system exists)
        try {
          const notificationMessage = transaction.isAnonymous
            ? `Someone sent you KES ${transaction.amount} support!`
            : `${transaction.supporterName || 'A supporter'} sent you KES ${transaction.amount}!`;

          await tx.notification.create({
            data: {
              type: 'PUSH',
              title: '💰 New Support Received!',
              message: notificationMessage,
              receiverId: transaction.wallet.authorProfile.userId,
            },
          });
        } catch {
          // Notification creation failed, but payment is still successful
          console.warn('Failed to create notification for support payment');
        }
      });

      console.log(`Support transaction ${transactionId} completed successfully`);

    } else if (state === 'FAILED') {
      // Payment failed
      await prisma.supportTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          failedReason: failed_reason || `Error code: ${failed_code}`,
        },
      });

      console.log(`Support transaction ${transactionId} failed: ${failed_reason}`);
    }

    return NextResponse.json({ received: true, processed: true });

  } catch (error) {
    console.error('Error processing support webhook:', error);
    return NextResponse.json(
      { received: true, error: 'Webhook processing error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/support/webhook?tx={transactionId}
 * Check payment status for a transaction (polling)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('tx');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    const transaction = await prisma.supportTransaction.findUnique({
      where: { id: transactionId },
      include: {
        wallet: {
          include: {
            authorProfile: {
              select: { displayName: true, username: true },
            },
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // If already completed or failed, return current status
    if (transaction.status === 'COMPLETED' || transaction.status === 'FAILED') {
      return NextResponse.json({
        status: transaction.status,
        amount: transaction.amount,
        authorName: transaction.wallet.authorProfile.displayName,
        mpesaReference: transaction.mpesaReference,
        failedReason: transaction.failedReason,
        completedAt: transaction.completedAt,
      });
    }

    // If pending and has invoice ID, check with IntaSend
    if (transaction.status === 'PENDING' && transaction.intasendInvoiceId) {
      try {
        const statusResponse = await checkPaymentStatus(transaction.intasendInvoiceId);
        
        if (statusResponse.invoice.state === 'COMPLETE') {
          // Update transaction
          await prisma.$transaction(async (tx) => {
            await tx.supportTransaction.update({
              where: { id: transactionId },
              data: {
                status: 'COMPLETED',
                mpesaReference: statusResponse.invoice.mpesa_reference,
                completedAt: new Date(),
              },
            });

            await tx.authorWallet.update({
              where: { id: transaction.walletId },
              data: {
                currentBalance: { increment: transaction.netAmount },
                availableBalance: { increment: transaction.netAmount },
                totalReceived: { increment: transaction.amount },
                platformFeeTotal: { increment: transaction.platformFee },
                supportersCount: { increment: 1 },
                transactionsCount: { increment: 1 },
              },
            });
          });

          return NextResponse.json({
            status: 'COMPLETED',
            amount: transaction.amount,
            authorName: transaction.wallet.authorProfile.displayName,
            mpesaReference: statusResponse.invoice.mpesa_reference,
          });
        } else if (statusResponse.invoice.state === 'FAILED') {
          await prisma.supportTransaction.update({
            where: { id: transactionId },
            data: {
              status: 'FAILED',
              failedReason: statusResponse.invoice.failed_reason,
            },
          });

          return NextResponse.json({
            status: 'FAILED',
            failedReason: statusResponse.invoice.failed_reason,
          });
        }
      } catch {
        // IntaSend status check failed, return current status
        console.warn('Failed to check IntaSend status');
      }
    }

    return NextResponse.json({
      status: 'PENDING',
      amount: transaction.amount,
      authorName: transaction.wallet.authorProfile.displayName,
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
