import { NextRequest, NextResponse } from 'next/server';
import { initiateStkPush, generateExternalReference, calculateIntaSendFees } from '@/lib/intasend';
import { createPaymentInvoice } from '@/lib/payment-invoices';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, amount, orderId, apiRef } = body;

    if (!phone || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Phone number and amount are required'
      }, { status: 400 });
    }

    // Calculate the total amount including fees
    const feeCalculation = calculateIntaSendFees(amount);
    
    // Generate external reference for tracking
    const externalRef = apiRef || generateExternalReference('ORDER', orderId || 'CHECKOUT');

    // Initiate STK Push with the total amount (including all fees)
    const stkResponse = await initiateStkPush({
      phone_number: phone,
      amount: feeCalculation.totalAmount.toString(),
      api_ref: externalRef
    });

    // Create invoice record in database for tracking
    const invoiceExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    
    try {
      await createPaymentInvoice({
        invoiceId: stkResponse.invoice.invoice_id,
        amount: amount, // Original amount without fees
        phoneNumber: phone,
        expiresAt: invoiceExpiry,
        metadata: {
          externalRef,
          orderId: orderId || null,
          feeCalculation,
          stkResponse: {
            state: stkResponse.invoice.state,
            currency: stkResponse.invoice.currency,
            customerId: stkResponse.customer.customer_id,
          }
        }
      });
    } catch (dbError) {
      console.error('Failed to create invoice record:', dbError);
      // Continue with response even if DB insert fails
    }

    return NextResponse.json({
      success: true,
      message: 'STK Push initiated successfully',
      data: {
        invoiceId: stkResponse.invoice.invoice_id,
        state: stkResponse.invoice.state,
        originalAmount: amount,
        serviceFee: feeCalculation.serviceFee,
        intaSendFee: feeCalculation.intaSendFee,
        totalAmount: feeCalculation.totalAmount,
        currency: stkResponse.invoice.currency,
        phone: stkResponse.customer.phone_number,
        customerId: stkResponse.customer.customer_id,
        externalRef
      },
      feeBreakdown: feeCalculation
    });

  } catch (error) {
    console.error('IntaSend STK Push error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate STK Push',
      customerMessage: 'Failed to send payment request to your phone. Please try again or use manual payment.'
    }, { status: 500 });
  }
}