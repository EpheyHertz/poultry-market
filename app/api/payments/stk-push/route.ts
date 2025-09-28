import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { 
  initiateStkPush, 
  LipiaPaymentError, 
  validatePhoneNumber,
  generateExternalReference,
  generateCallbackUrl,
  createPaymentMetadata,
  formatPaymentAmount,
  type STKPushRequest
} from '@/lib/lipia';
import { z } from 'zod';

// STK Push request schema
const stkPushRequestSchema = z.object({
  phone_number: z.string().min(1, 'Phone number is required'),
  amount: z.number().min(1, 'Amount must be at least 1 KSH'),
  external_reference: z.string().optional(),
  callback_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  // Additional fields for internal tracking
  orderId: z.string().optional(),
  description: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = stkPushRequestSchema.parse(body);

    // Validate phone number
    const phoneValidation = validatePhoneNumber(validatedData.phone_number);
    if (!phoneValidation.isValid) {
      return NextResponse.json({ 
        error: phoneValidation.error 
      }, { status: 400 });
    }

    // Format amount
    const paymentAmount = formatPaymentAmount(validatedData.amount);

    // Generate external reference if not provided
    const externalReference = validatedData.external_reference || 
      generateExternalReference('GENERAL', user.id);

    // Generate callback URL if not provided
    const callbackUrl = validatedData.callback_url || 
      generateCallbackUrl('general');

    // Create metadata
    const metadata = createPaymentMetadata({
      userId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      paymentType: 'general_payment',
      orderId: validatedData.orderId,
      description: validatedData.description,
      ...validatedData.metadata
    });

    // Prepare STK Push request
    const stkPushRequest: STKPushRequest = {
      phone_number: phoneValidation.normalized!,
      amount: paymentAmount,
      external_reference: externalReference,
      callback_url: callbackUrl,
      metadata
    };

    console.log('Initiating STK Push:', {
      userId: user.id,
      phone: phoneValidation.normalized,
      amount: paymentAmount,
      reference: externalReference
    });

    // Initiate STK Push
    const stkResponse = await initiateStkPush(stkPushRequest);

    return NextResponse.json({
      success: true,
      message: 'STK push initiated successfully',
      data: {
        transactionReference: stkResponse.data.TransactionReference,
        responseCode: stkResponse.data.ResponseCode,
        responseDescription: stkResponse.data.ResponseDescription,
        externalReference,
        phoneNumber: phoneValidation.normalized,
        amount: paymentAmount,
        customerMessage: stkResponse.customerMessage
      }
    });

  } catch (error) {
    console.error('STK Push initiation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    if (error instanceof LipiaPaymentError) {
      return NextResponse.json({
        error: error.customerMessage,
        code: error.code,
        field: error.field
      }, { status: error.statusCode });
    }

    return NextResponse.json({
      error: 'Failed to initiate STK Push payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint for testing/documentation
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/payments/stk-push',
    method: 'POST',
    description: 'Initiate STK Push payment',
    requiredFields: {
      phone_number: 'string - Kenyan phone number (e.g., 0712345678)',
      amount: 'number - Amount in KSH (minimum 1)'
    },
    optionalFields: {
      external_reference: 'string - Your reference ID',
      callback_url: 'string - URL for payment callbacks',
      metadata: 'object - Additional data',
      orderId: 'string - Order ID for tracking',
      description: 'string - Payment description'
    },
    phoneFormats: [
      '254712345678',
      '+254712345678', 
      '0712345678',
      '0112345678'
    ],
    example: {
      phone_number: '0712345678',
      amount: 100,
      external_reference: 'order_123',
      description: 'Payment for poultry products',
      metadata: {
        customer_name: 'John Doe',
        order_id: '12345'
      }
    }
  });
}