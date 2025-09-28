import { NextRequest, NextResponse } from 'next/server';

// General callback handler for non-order STK Push payments
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

export async function POST(request: NextRequest) {
  try {
    const callbackData: LipiaCallbackData = await request.json();

    console.log('Received general STK Push callback:', callbackData);

    // Determine payment status
    let status: 'completed' | 'failed' | 'cancelled';
    
    if (callbackData.ResultCode === 0) {
      status = 'completed';
    } else if (callbackData.ResultCode === 1032) {
      status = 'cancelled';
    } else {
      status = 'failed';
    }

    // Log the callback for debugging
    console.log('STK Push callback processed:', {
      transactionReference: callbackData.TransactionReference,
      resultCode: callbackData.ResultCode,
      status,
      amount: callbackData.Amount,
      mpesaReceipt: callbackData.MpesaReceiptNumber,
      externalReference: callbackData.ExternalReference
    });

    // TODO: Here you can add logic to:
    // 1. Update any related records in your database
    // 2. Send notifications to users
    // 3. Trigger other business logic based on payment status
    // 4. Store callback data for audit purposes

    // For now, just return success to acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Callback processed successfully',
      status
    });

  } catch (error) {
    console.error('General STK Push callback processing error:', error);
    
    // Return success to prevent Lipia from retrying
    return NextResponse.json({
      success: false,
      message: 'Error processing callback',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/payments/callback/general',
    method: 'POST',
    description: 'General callback endpoint for STK Push payments',
    note: 'This endpoint receives payment callbacks from Lipia for non-order payments'
  });
}