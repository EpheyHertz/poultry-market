import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPaymentStatus } from '@/lib/intasend-wallets';
import { getIntaSendErrorMessage } from '@/lib/intasend';
import { sendEmail } from '@/lib/email';
import {
  generateSupporterThankYouEmail,
  generateAuthorSupportReceivedEmail,
  generateAdminSupportNotificationEmail,
  SupportTransactionEmailData,
} from '@/lib/email-templates';

// Admin email for notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@poultrymarket.co.ke';

// IntaSend webhook challenge - set this in your IntaSend dashboard and environment
const INTASEND_WEBHOOK_CHALLENGE = process.env.INTASEND_WEBHOOK_CHALLENGE || '';

/**
 * IntaSend Collection Webhook Payload
 * Reference: https://developers.intasend.com/apis/webhooks/collection-events
 */
interface IntaSendCollectionPayload {
  invoice_id: string;
  state: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  provider: string; // e.g., 'M-PESA', 'CARD-PAYMENT'
  charges: string;
  net_amount: string;
  currency: string;
  value: string;
  account: string; // Phone number or email
  api_ref: string;
  host: string;
  mpesa_reference?: string;
  failed_reason: string | null;
  failed_code: string | null;
  failed_code_link: string;
  created_at: string;
  updated_at: string;
  challenge: string;
}

/**
 * POST /api/support/webhook
 * Handle IntaSend payment webhooks for support transactions
 * 
 * State Reference:
 * - PENDING: Transaction has just been logged
 * - PROCESSING: Customer is making payment
 * - COMPLETE: Transaction successful
 * - FAILED: Transaction failed
 */
export async function POST(request: NextRequest) {
  try {
    const body: IntaSendCollectionPayload = await request.json();
    
    console.log('[Support Webhook] Received:', JSON.stringify(body, null, 2));

    const {
      invoice_id,
      state,
      api_ref,
      mpesa_reference,
      failed_reason,
      failed_code,
      challenge,
      provider,
      net_amount,
      charges,
      value,
    } = body;

    // Validate webhook challenge for security
    if (INTASEND_WEBHOOK_CHALLENGE && challenge !== INTASEND_WEBHOOK_CHALLENGE) {
      console.error('[Support Webhook] Invalid challenge received:', challenge);
      return NextResponse.json(
        { received: true, error: 'Invalid challenge' },
        { status: 401 }
      );
    }

    // Extract transaction ID from api_ref (format: support-{transactionId})
    const transactionId = api_ref?.startsWith('support-') 
      ? api_ref.replace('support-', '') 
      : null;

    if (!transactionId) {
      console.log('[Support Webhook] Not a support transaction, skipping. api_ref:', api_ref);
      return NextResponse.json({ received: true });
    }

    console.log(`[Support Webhook] Processing transaction ${transactionId}, state: ${state}`);

    // Find the transaction with full details for emails
    const transaction = await prisma.supportTransaction.findUnique({
      where: { id: transactionId },
      include: {
        wallet: {
          include: {
            authorProfile: {
              select: { 
                userId: true, 
                displayName: true,
                username: true,
              },
            },
          },
        },
        supporter: {
          select: { email: true, name: true },
        },
        blogPost: {
          select: { title: true, slug: true },
        },
      },
    });

    if (!transaction) {
      console.error('[Support Webhook] Transaction not found:', transactionId);
      return NextResponse.json({ received: true, error: 'Transaction not found' });
    }

    // Get author's email
    const authorUser = await prisma.user.findUnique({
      where: { id: transaction.wallet.authorProfile.userId },
      select: { email: true },
    });

    // Handle different states
    if (state === 'PROCESSING') {
      // Payment is in progress - update status to show user
      await prisma.supportTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'PENDING', // Keep as pending but log the processing state
          intasendInvoiceId: invoice_id,
        },
      });
      console.log(`[Support Webhook] Transaction ${transactionId} is PROCESSING`);
      
    } else if (state === 'COMPLETE') {
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

      // Send emails asynchronously (don't block the webhook response)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://poultrymarket.co.ke';
      
      // Determine supporter display name:
      // - If anonymous flag is set: "Anonymous"
      // - If name provided: use the name
      // - If no name but not anonymous: "Anonymous" (default for unnamed supporters)
      let displaySupporterName = 'Anonymous';
      if (!transaction.isAnonymous && transaction.supporterName) {
        displaySupporterName = transaction.supporterName;
      } else if (!transaction.isAnonymous && transaction.supporter?.name) {
        displaySupporterName = transaction.supporter.name;
      }
      
      const emailData: SupportTransactionEmailData = {
        supporterName: displaySupporterName,
        supporterEmail: transaction.supporter?.email || transaction.supporterEmail || undefined,
        authorName: transaction.wallet.authorProfile.displayName,
        authorEmail: authorUser?.email || '',
        amount: transaction.amount,
        netAmount: transaction.netAmount,
        platformFee: transaction.platformFee,
        message: transaction.message || undefined,
        blogPostTitle: transaction.blogPost?.title,
        blogPostUrl: transaction.blogPost ? `${baseUrl}/blog/${transaction.blogPost.slug}` : undefined,
        transactionId: transaction.id,
        transactionDate: new Date().toLocaleDateString('en-KE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      // Send emails in background (don't await to avoid blocking webhook)
      Promise.all([
        // Email to supporter (if email available)
        emailData.supporterEmail ? sendEmail({
          to: emailData.supporterEmail,
          subject: `💚 Thank you for supporting ${emailData.authorName}!`,
          html: generateSupporterThankYouEmail(emailData),
        }) : Promise.resolve(),
        
        // Email to author
        emailData.authorEmail ? sendEmail({
          to: emailData.authorEmail,
          subject: `🎉 You received KES ${emailData.amount} support!`,
          html: generateAuthorSupportReceivedEmail(emailData),
        }) : Promise.resolve(),
        
        // Email to admin
        sendEmail({
          to: ADMIN_EMAIL,
          subject: `💰 New Support: KES ${emailData.amount} (Fee: KES ${emailData.platformFee})`,
          html: generateAdminSupportNotificationEmail(emailData),
        }),
      ]).catch(err => {
        console.error('[Support Webhook] Error sending emails:', err);
      });

      console.log(`[Support Webhook] Transaction ${transactionId} COMPLETED successfully`);

    } else if (state === 'FAILED') {
      // Payment failed - get user-friendly error message
      const errorInfo = getIntaSendErrorMessage(failed_code, failed_reason);
      
      await prisma.supportTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          failedReason: errorInfo.userMessage,
          // Store technical details for debugging
          failedCode: failed_code || undefined,
        },
      });

      console.log(`[Support Webhook] Transaction ${transactionId} FAILED: ${failed_code} - ${failed_reason}`);
      console.log(`[Support Webhook] User message: ${errorInfo.userMessage}`);
    }

    return NextResponse.json({ received: true, processed: true });

  } catch (error) {
    console.error('[Support Webhook] Error processing webhook:', error);
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

    // If already completed or failed, return current status with user-friendly messages
    if (transaction.status === 'COMPLETED') {
      return NextResponse.json({
        status: 'COMPLETED',
        amount: transaction.amount,
        authorName: transaction.wallet.authorProfile.displayName,
        mpesaReference: transaction.mpesaReference,
        completedAt: transaction.completedAt,
        message: 'Payment successful! Thank you for your support.',
      });
    }
    
    if (transaction.status === 'FAILED') {
      // Return user-friendly error message
      const failedCode = (transaction as any).failedCode;
      const errorInfo = getIntaSendErrorMessage(failedCode, transaction.failedReason);
      
      return NextResponse.json({
        status: 'FAILED',
        amount: transaction.amount,
        authorName: transaction.wallet.authorProfile.displayName,
        failedReason: transaction.failedReason || errorInfo.userMessage,
        failedCode: failedCode,
        actionRequired: errorInfo.actionRequired,
        canRetry: ['1032', '2006', '1037'].includes(failedCode || ''), // User-recoverable errors
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
            message: 'Payment successful! Thank you for your support.',
          });
        } else if (statusResponse.invoice.state === 'FAILED') {
          // Get user-friendly error message
          const errorInfo = getIntaSendErrorMessage(
            statusResponse.invoice.failed_code, 
            statusResponse.invoice.failed_reason
          );
          
          await prisma.supportTransaction.update({
            where: { id: transactionId },
            data: {
              status: 'FAILED',
              failedReason: errorInfo.userMessage,
              failedCode: statusResponse.invoice.failed_code,
            },
          });

          return NextResponse.json({
            status: 'FAILED',
            amount: transaction.amount,
            failedReason: errorInfo.userMessage,
            failedCode: statusResponse.invoice.failed_code,
            actionRequired: errorInfo.actionRequired,
            canRetry: ['1032', '2006', '1037'].includes(statusResponse.invoice.failed_code || ''),
          });
        }
      } catch {
        // IntaSend status check failed, return current status
        console.warn('[Support Webhook] Failed to check IntaSend status');
      }
    }

    return NextResponse.json({
      status: 'PENDING',
      amount: transaction.amount,
      authorName: transaction.wallet.authorProfile.displayName,
      message: 'Waiting for payment confirmation...',
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
