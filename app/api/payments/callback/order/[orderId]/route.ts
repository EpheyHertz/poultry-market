import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Lipia callback response structure
interface LipiaCallbackData {
  TransactionReference: string;
  ResultCode: number;
  ResultDesc: string;
  Amount: number;
  MpesaReceiptNumber?: string;
  TransactionDate?: string;
  PhoneNumber: string;
  ExternalReference?: string;
  CheckoutRequestID?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const callbackData: LipiaCallbackData = await request.json();

    console.log('Received STK Push callback for order:', orderId, callbackData);

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        referenceNumber: callbackData.TransactionReference
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!payment) {
      console.error('Payment not found for callback:', {
        orderId,
        transactionReference: callbackData.TransactionReference
      });
      return NextResponse.json({ 
        error: 'Payment record not found' 
      }, { status: 404 });
    }

    // Determine payment status based on result code
    let newStatus: 'APPROVED' | 'REJECTED';
    let failureReason: string | null = null;

    if (callbackData.ResultCode === 0) {
      // Successful payment
      newStatus = 'APPROVED';
    } else if (callbackData.ResultCode === 1032) {
      // User cancelled
      newStatus = 'REJECTED';
      failureReason = 'Payment cancelled by user';
    } else {
      // Payment failed
      newStatus = 'REJECTED';
      failureReason = callbackData.ResultDesc || 'Payment failed';
    }

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        callbackData: JSON.stringify(callbackData),
        callbackReceived: true,
        failureReason,
        transactionCode: callbackData.MpesaReceiptNumber,
        updatedAt: new Date()
      }
    });

    // Update order status if payment was successful
    if (newStatus === 'APPROVED') {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          updatedAt: new Date()
        }
      });

      // TODO: Send confirmation email to customer
      // TODO: Send notification to seller
      // TODO: Update inventory if needed
      
      console.log('Payment completed successfully:', {
        orderId,
        paymentId: payment.id,
        mpesaReceiptNumber: callbackData.MpesaReceiptNumber,
        amount: callbackData.Amount
      });
    } else {
      console.log('Payment failed or cancelled:', {
        orderId,
        paymentId: payment.id,
        resultCode: callbackData.ResultCode,
        resultDesc: callbackData.ResultDesc
      });
    }

    // Return success response to Lipia
    return NextResponse.json({
      success: true,
      message: 'Callback processed successfully',
      paymentStatus: newStatus
    });

  } catch (error) {
    console.error('STK Push callback processing error:', error);
    
    // Return success to prevent Lipia from retrying, but log the error
    return NextResponse.json({
      success: false,
      message: 'Error processing callback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests (for testing)
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;
  
  return NextResponse.json({
    message: 'STK Push callback endpoint',
    orderId,
    method: 'POST',
    description: 'This endpoint receives STK Push payment callbacks from Lipia'
  });
}