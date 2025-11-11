import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { logPaymentConfirmed } from '@/lib/order-timeline';
import { createNotification, notificationTemplates } from '@/lib/notifications';

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
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
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
    let newStatus: PaymentStatus;
    let failureReason: string | null = null;

    if (callbackData.ResultCode === 0) {
      // Successful payment
      newStatus = PaymentStatus.CONFIRMED;
    } else if (callbackData.ResultCode === 1032) {
      // User cancelled
      newStatus = PaymentStatus.REJECTED;
      failureReason = 'Payment cancelled by user';
    } else {
      // Payment failed
      newStatus = PaymentStatus.FAILED;
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
    if (newStatus === PaymentStatus.CONFIRMED) {
      // Update order in transaction
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.CONFIRMED,
            status: OrderStatus.PAID,
            updatedAt: new Date()
          }
        });

        // Create payment approval log
        await tx.paymentApprovalLog.create({
          data: {
            orderId: orderId,
            approverId: 'SYSTEM',
            action: 'APPROVED',
            notes: `M-Pesa payment automatically verified. Receipt: ${callbackData.MpesaReceiptNumber}`,
          },
        });
      });

      // Log timeline event
      await logPaymentConfirmed(orderId, 'SYSTEM', 'System', true);

      // Get sellers from order items
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: {
                  seller: true,
                },
              },
            },
          },
        },
      });

      if (order) {
        const sellerIds = new Set(
          order.items.map((item) => item.product.sellerId)
        );

        // Notify sellers
        for (const sellerId of Array.from(sellerIds)) {
          const template = notificationTemplates.paymentConfirmed(
            orderId.slice(-8),
            order.total
          );

          await createNotification({
            receiverId: sellerId,
            orderId: orderId,
            type: 'EMAIL',
            title: template.title,
            message: template.message,
          });

          await createNotification({
            receiverId: sellerId,
            orderId: orderId,
            type: 'SMS',
            title: template.title,
            message: template.message,
          });
        }

        // Notify customer
        const customerTemplate = notificationTemplates.paymentConfirmed(
          orderId.slice(-8),
          order.total
        );

        await createNotification({
          receiverId: order.customerId,
          orderId: orderId,
          type: 'EMAIL',
          title: customerTemplate.title,
          message: customerTemplate.message,
        });

        await createNotification({
          receiverId: order.customerId,
          orderId: orderId,
          type: 'SMS',
          title: customerTemplate.title,
          message: customerTemplate.message,
        });
      }
      
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
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;
  
  return NextResponse.json({
    message: 'STK Push callback endpoint',
    orderId,
    method: 'POST',
    description: 'This endpoint receives STK Push payment callbacks from Lipia'
  });
}