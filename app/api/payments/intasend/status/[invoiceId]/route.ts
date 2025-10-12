import { NextRequest, NextResponse } from 'next/server';
import { checkPaymentStatus, getPaymentSummary } from '@/lib/intasend';
import { updateInvoicePaymentStatus, findPaymentInvoice } from '@/lib/payment-invoices';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await context.params;
    const { searchParams } = new URL(request.url);
    const expectedAmount = searchParams.get('expectedAmount');

    if (!invoiceId) {
      return NextResponse.json({
        success: false,
        error: 'Invoice ID is required'
      }, { status: 400 });
    }

    // Check payment status with IntaSend API
    const statusResponse = await checkPaymentStatus(invoiceId);
    console.log("Status response:", statusResponse);
    
    // Get a simplified summary for frontend use
    const paymentSummary = getPaymentSummary(
      statusResponse, 
      expectedAmount ? parseFloat(expectedAmount) : undefined
    );
    console.log("Payment summary:", paymentSummary);

    // Update invoice status in database
    try {
      const invoice = await findPaymentInvoice(invoiceId);
      if (invoice) {
        await updateInvoicePaymentStatus(
          invoiceId,
          statusResponse.invoice?.state || 'PENDING',
          expectedAmount ? parseFloat(expectedAmount) : undefined
        );
      }
    } catch (dbError) {
      console.error('Failed to update invoice status:', dbError);
      // Continue with response even if DB update fails
    }

    return NextResponse.json({
      success: true,
      ...paymentSummary,
      raw: statusResponse // Include full response for debugging
    });

  } catch (error) {
    console.error('IntaSend payment status check error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check payment status',
      customerMessage: 'Unable to verify payment status. Please try again.'
    }, { status: 500 });
  }
}