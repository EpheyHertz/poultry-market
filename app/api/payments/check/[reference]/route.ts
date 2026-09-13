import { NextRequest, NextResponse } from 'next/server';
import { checkPaymentStatus, getPaymentSummary, LipiaPaymentError } from '@/lib/lipia';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await context.params;

    if (!reference) {
      return NextResponse.json({
        error: 'Transaction reference is required'
      }, { status: 400 });
    }

    // Check payment status with Lipia API
    const statusResponse = await checkPaymentStatus(reference);
    
    // Get a simplified summary for frontend use very nice
    const paymentSummary = getPaymentSummary(statusResponse);

    return NextResponse.json({
      success: true,
      ...paymentSummary,
      raw: statusResponse // Include full response for debugging
    });

  } catch (error) {
    console.error('Payment status check error:', error);

    if (error instanceof LipiaPaymentError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        customerMessage: error.customerMessage,
        code: error.code
      }, { status: error.statusCode });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check payment status'
    }, { status: 500 });
  }
}