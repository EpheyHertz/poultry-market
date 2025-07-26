import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '@/lib/email';
import { z } from 'zod';

// Simple in-memory rate limiting (in production, use Redis or a proper rate limiting service)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

// Rate limiting: 5 requests per 15 minutes per IP
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const clientData = rateLimit.get(ip);

  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize rate limit for this IP
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (clientData.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  clientData.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - clientData.count };
}

// Validation schema for contact form
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000, 'Message must be less than 1000 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000 / 60) // minutes
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'Retry-After': (RATE_LIMIT_WINDOW / 1000).toString(),
          }
        }
      );
    }
    const body = await request.json();
    
    // Validate the request body
    const validation = contactSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }

    const { name, email, message } = validation.data;

    // Send email to support team
    const supportEmailResult = await sendEmail({
      to: process.env.SUPPORT_EMAIL || 'support@poultrymarket.co.ke',
      subject: `New Contact Form Submission from ${name}`,
      html: emailTemplates.contactForm(name, email, message),
    });

    if (!supportEmailResult.success) {
      console.error('Failed to send support email:', supportEmailResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send message. Please try again later.' 
        },
        { status: 500 }
      );
    }

    // Send confirmation email to user
    const confirmationEmailResult = await sendEmail({
      to: email,
      subject: 'Message Received - PoultryMarket Support',
      html: emailTemplates.contactConfirmation(name),
    });

    if (!confirmationEmailResult.success) {
      console.warn('Failed to send confirmation email to user:', confirmationEmailResult.error);
      // Don't fail the entire request if confirmation email fails
    }

    // Log the contact form submission (optional)
    console.log(`Contact form submission: ${name} (${email}) - ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you within 24 hours.',
    }, {
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      }
    });

  } catch (error) {
    console.error('Contact form API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred. Please try again later.' 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
