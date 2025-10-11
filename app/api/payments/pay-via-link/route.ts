import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { phone, amount, link_slug } = await request.json();

    if (!phone || !amount || !link_slug) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: phone, amount, or link_slug'
      }, { status: 400 });
    }

    const LIPIA_API_KEY = process.env.LIPIA_API_KEY;
    
    if (!LIPIA_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Payment service not configured'
      }, { status: 500 });
    }

    // Call the pay-via-link API
    const response = await axios.post(
      'https://lipia-api.kreativelabske.com/api/pay-via-link',
      {
        phone: phone.replace(/\s/g, ''), // Remove spaces
        amount: Number(amount),
        link_slug
      },
      {
        headers: {
          Authorization: `Bearer ${LIPIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Pay via link error:', error);

    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data || {};
      return NextResponse.json({
        success: false,
        error: errorData.message || error.message,
        customerMessage: errorData.customerMessage || 'Payment processing failed',
        details: errorData
      }, { status: error.response?.status || 500 });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    }, { status: 500 });
  }
}