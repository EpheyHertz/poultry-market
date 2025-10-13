import { NextRequest, NextResponse } from 'next/server';
import { checkPaymentStatus, validatePaymentAmount, roundUpPaymentAmount, getIntaSendErrorMessage } from '@/lib/intasend';
import { canUseInvoice, findPaymentInvoice, updateInvoicePaymentStatus } from '@/lib/payment-invoices';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, expectedAmount } = body;

    if (!invoiceId || !expectedAmount) {
      return NextResponse.json({
        success: false,
        error: 'Invoice ID and expected amount are required'
      }, { status: 400 });
    }

    // First check if invoice can be used (not expired, not already used)
    const invoiceCheck = await canUseInvoice(invoiceId);
    
    if (!invoiceCheck.canUse) {
      return NextResponse.json({
        success: false,
        error: invoiceCheck.reason,
        customerMessage: `Payment verification failed: ${invoiceCheck.reason}`,
        details: {
          invoiceStatus: invoiceCheck.invoice?.status,
          isUsed: invoiceCheck.invoice?.isUsed,
          expired: invoiceCheck.invoice?.expiresAt < new Date(),
          associatedOrder: invoiceCheck.invoice?.orderId
        }
      }, { status: 400 });
    }

    // Check payment status with IntaSend
    const statusResponse = await checkPaymentStatus(invoiceId);
    
    if (!statusResponse.invoice || statusResponse.invoice.state !== 'COMPLETE') {
      // Update invoice status in our database
      await updateInvoicePaymentStatus(
        invoiceId,
        statusResponse.invoice?.state || 'FAILED'
      );

      // Get user-friendly error message for failed payments
      let customerMessage = 'Payment verification failed. Payment is not completed.';
      let actionRequired = 'Please try again or contact support.';
      
      if (statusResponse.invoice?.state === 'FAILED') {
        const errorInfo = getIntaSendErrorMessage(
          statusResponse.invoice.failed_code,
          statusResponse.invoice.failed_reason
        );
        customerMessage = errorInfo.userMessage;
        actionRequired = errorInfo.actionRequired;
      } else if (statusResponse.invoice?.state === 'PENDING') {
        customerMessage = 'Payment is still being processed.';
        actionRequired = 'Please wait a moment and try again.';
      }

      return NextResponse.json({
        success: false,
        error: 'Payment not completed',
        customerMessage,
        actionRequired,
        details: {
          paymentState: statusResponse.invoice?.state || 'NOT_FOUND',
          failedCode: statusResponse.invoice?.failed_code,
          failedReason: statusResponse.invoice?.failed_reason,
          intasendResponse: statusResponse
        }
      }, { status: 400 });
    }

    // Validate payment amount
    const receivedAmount = parseFloat(statusResponse.invoice.net_amount);
    const amountValidation = validatePaymentAmount(
      receivedAmount,
      expectedAmount  // This is the original order amount without fees
    );

    if (!amountValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Payment amount mismatch',
        customerMessage: `Payment amount verification failed: ${amountValidation.message}`,
        details: {
          expectedAmount: amountValidation.expectedAmount, // This will be the amount with fees
          actualAmount: receivedAmount,
          difference: amountValidation.difference
        }
      }, { status: 400 });
    }

    // Update invoice status to COMPLETE
    await updateInvoicePaymentStatus(
      invoiceId,
      'COMPLETE',
      expectedAmount
    );

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        invoiceId,
        paymentState: statusResponse.invoice.state,
        amount: receivedAmount,
        currency: statusResponse.invoice.currency,
        paidAt: statusResponse.invoice.updated_at,
        validationDetails: amountValidation
      }
    });

  } catch (error) {
    console.error('Manual payment verification error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment verification failed',
      customerMessage: 'Unable to verify payment. Please try again or contact support.'
    }, { status: 500 });
  }
}