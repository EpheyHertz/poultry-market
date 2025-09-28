import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await context.params;

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        userId: user.id
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({ 
        error: 'Payment not found' 
      }, { status: 404 });
    }

    // Parse STK Push data if available
    let stkPushData = null;
    let callbackData = null;
    
    try {
      if (payment.stkPushData) {
        stkPushData = JSON.parse(payment.stkPushData);
      }
      if (payment.callbackData) {
        callbackData = JSON.parse(payment.callbackData);
      }
    } catch (parseError) {
      console.error('Error parsing payment data:', parseError);
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        phoneNumber: payment.phoneNumber,
        transactionCode: payment.transactionCode,
        referenceNumber: payment.referenceNumber,
        externalReference: payment.externalReference,
        callbackReceived: payment.callbackReceived,
        failureReason: payment.failureReason,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      },
      order: payment.order,
      stkPushData,
      callbackData
    });

  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check payment status' 
    }, { status: 500 });
  }
}

// Endpoint to retry failed STK Push
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await context.params;
    const { phoneNumber } = await request.json();

    // Find the failed payment
    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        userId: user.id,
        status: { in: ['REJECTED'] }
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({ 
        error: 'No rejected payment found for retry' 
      }, { status: 404 });
    }

    // Import STK Push functions
    const { 
      initiateStkPush, 
      validatePhoneNumber,
      generateExternalReference,
      generateCallbackUrl,
      createPaymentMetadata,
      formatPaymentAmount
    } = await import('@/lib/lipia');

    // Validate phone number
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ 
        error: phoneValidation.error 
      }, { status: 400 });
    }

    // Create new STK Push request
    const paymentAmount = formatPaymentAmount(payment.order.total);
    const externalReference = generateExternalReference('RETRY_ORDER', orderId);
    const callbackUrl = generateCallbackUrl(`order/${orderId}`);
    
    const metadata = createPaymentMetadata({
      orderId: payment.order.id,
      userId: user.id,
      customerName: payment.order.customer.name,
      customerEmail: payment.order.customer.email,
      paymentType: 'order_payment_retry',
      originalPaymentId: payment.id,
      orderTotal: payment.order.total
    });

    // Initiate new STK Push
    const stkResponse = await initiateStkPush({
      phone_number: phoneValidation.normalized!,
      amount: paymentAmount,
      external_reference: externalReference,
      callback_url: callbackUrl,
      metadata
    });

    // Update payment record with new STK Push data
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PENDING',
        phoneNumber: phoneValidation.normalized,
        referenceNumber: stkResponse.data.TransactionReference,
        externalReference,
        stkPushData: JSON.stringify(stkResponse.data),
        callbackReceived: false,
        failureReason: null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      stkPush: {
        initiated: true,
        transactionReference: stkResponse.data.TransactionReference,
        message: stkResponse.customerMessage
      }
    });

  } catch (error) {
    console.error('Payment retry error:', error);
    return NextResponse.json({ 
      error: 'Failed to retry payment' 
    }, { status: 500 });
  }
}