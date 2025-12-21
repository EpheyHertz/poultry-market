import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  fundWalletMpesa,
  fundWalletCheckout,
  validateSupportAmount,
  calculateFees,
  normalizePhoneNumber,
  SUPPORT_CONFIG 
} from '@/lib/intasend-wallets';

// Simple in-memory rate limiting (consider using Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 payment attempts per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  record.count++;
  return true;
}

// Input sanitization
function sanitizeString(input: string | undefined | null, maxLength: number = 500): string {
  if (!input) return '';
  return input
    .toString()
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

function validatePhoneNumber(phone: string): boolean {
  // Kenyan phone number validation
  const normalized = normalizePhoneNumber(phone);
  return /^254[0-9]{9}$/.test(normalized);
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

interface RouteContext {
  params: Promise<{ authorId: string }>;
}

/**
 * GET /api/support/[authorId]
 * Get author support info for the public support page
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { authorId } = await context.params;

    // Get author profile with wallet
    const authorProfile = await prisma.authorProfile.findUnique({
      where: { id: authorId },
      include: {
        wallet: {
          select: {
            id: true,
            status: true,
            supportersCount: true,
            transactionsCount: true,
          },
        },
        user: {
          select: { name: true, avatar: true },
        },
      },
    });

    if (!authorProfile) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }

    if (!authorProfile.wallet || authorProfile.wallet.status !== 'ACTIVE') {
      return NextResponse.json({
        author: {
          id: authorProfile.id,
          displayName: authorProfile.displayName,
          username: authorProfile.username,
          avatarUrl: authorProfile.avatarUrl || authorProfile.user.avatar,
          bio: authorProfile.bio,
          tagline: authorProfile.tagline,
        },
        supportEnabled: false,
        message: 'This author has not set up support yet.',
      });
    }

    // Get recent supporters (public, non-anonymous)
    const recentSupporters = await prisma.supportTransaction.findMany({
      where: {
        walletId: authorProfile.wallet.id,
        status: 'COMPLETED',
        isAnonymous: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        supporterName: true,
        message: true,
        createdAt: true,
        supporter: {
          select: { name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      author: {
        id: authorProfile.id,
        displayName: authorProfile.displayName,
        username: authorProfile.username,
        avatarUrl: authorProfile.avatarUrl || authorProfile.user.avatar,
        bio: authorProfile.bio,
        tagline: authorProfile.tagline,
        isVerified: authorProfile.isVerified,
      },
      supportEnabled: true,
      config: {
        minAmount: SUPPORT_CONFIG.MIN_SUPPORT_AMOUNT,
        presetAmounts: SUPPORT_CONFIG.PRESET_AMOUNTS,
        platformFeePercent: SUPPORT_CONFIG.PLATFORM_FEE_PERCENT,
        currency: SUPPORT_CONFIG.CURRENCY,
      },
      stats: {
        supportersCount: authorProfile.wallet.supportersCount,
        transactionsCount: authorProfile.wallet.transactionsCount,
      },
      recentSupporters: recentSupporters.map(s => ({
        name: s.supporter?.name || s.supporterName || 'Supporter',
        avatar: s.supporter?.avatar,
        message: s.message,
        createdAt: s.createdAt,
      })),
    });

  } catch (error) {
    console.error('Error getting author support info:', error);
    return NextResponse.json(
      { error: 'Failed to load support info' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/[authorId]
 * Initiate a support payment to an author
 * This endpoint is PUBLIC - allows unauthenticated users to support authors
 * Security measures:
 * - Rate limiting per IP
 * - Input sanitization
 * - Phone/email validation
 * - Amount validation
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const { authorId } = await context.params;
    const body = await request.json();
    
    const {
      amount,
      paymentMethod, // 'MPESA_STK' or 'CARD_CHECKOUT'
      phoneNumber,   // Required for MPESA_STK
      email,         // Required for checkout
      name,
      message,
      isAnonymous = false,
      blogPostId,    // Optional - if supporting from a specific post
    } = body;

    // Sanitize inputs
    const sanitizedName = sanitizeString(name, 100);
    const sanitizedMessage = sanitizeString(message, 500);
    const sanitizedEmail = sanitizeString(email, 254);
    const sanitizedPhone = sanitizeString(phoneNumber, 20);

    // Validate amount
    const validation = validateSupportAmount(amount);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Validate amount is a reasonable number (prevent overflow attacks)
    if (typeof amount !== 'number' || amount < 0 || amount > 1000000 || !isFinite(amount)) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!['MPESA_STK', 'CARD_CHECKOUT'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Validate phone for M-Pesa
    if (paymentMethod === 'MPESA_STK') {
      if (!sanitizedPhone || !validatePhoneNumber(sanitizedPhone)) {
        return NextResponse.json(
          { error: 'Valid Kenyan phone number is required for M-Pesa payment' },
          { status: 400 }
        );
      }
    }

    // Validate email for card checkout
    if (paymentMethod === 'CARD_CHECKOUT') {
      if (!sanitizedEmail || !validateEmail(sanitizedEmail)) {
        return NextResponse.json(
          { error: 'Valid email is required for card payment' },
          { status: 400 }
        );
      }
    }

    // Validate authorId format (CUID)
    if (!/^c[a-z0-9]{24}$/.test(authorId)) {
      return NextResponse.json(
        { error: 'Invalid author ID' },
        { status: 400 }
      );
    }

    // Get author's wallet
    const authorProfile = await prisma.authorProfile.findUnique({
      where: { id: authorId },
      include: {
        wallet: true,
        user: { select: { name: true } },
      },
    });

    if (!authorProfile) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }

    if (!authorProfile.wallet || authorProfile.wallet.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This author has not enabled support yet' },
        { status: 400 }
      );
    }

    // Get current user if logged in
    const currentUser = await getCurrentUser();

    // Calculate fees
    const fees = calculateFees(amount);

    // Validate blogPostId if provided (must be valid CUID)
    if (blogPostId && !/^c[a-z0-9]{24}$/.test(blogPostId)) {
      return NextResponse.json(
        { error: 'Invalid blog post ID' },
        { status: 400 }
      );
    }

    // Create transaction record with sanitized inputs
    const transaction = await prisma.supportTransaction.create({
      data: {
        walletId: authorProfile.wallet.id,
        supporterId: currentUser?.id || null,
        supporterName: isAnonymous ? null : sanitizedName || null,
        supporterEmail: sanitizedEmail || null,
        isAnonymous,
        amount: fees.grossAmount,
        platformFee: fees.platformFee,
        netAmount: fees.netAmount,
        currency: SUPPORT_CONFIG.CURRENCY,
        paymentMethod,
        message: sanitizedMessage || null,
        blogPostId: blogPostId || null,
        status: 'PENDING',
      },
    });

    const apiRef = `support-${transaction.id}`;
    const host = process.env.NEXT_PUBLIC_APP_URL || 'https://poultrymarketkenya.com';

    try {
      if (paymentMethod === 'MPESA_STK') {
        // Phone already validated above

        // Initiate M-Pesa STK Push directly to author's wallet
        const normalizedPhone = normalizePhoneNumber(sanitizedPhone);
        const mpesaResponse = await fundWalletMpesa({
          first_name: sanitizedName || 'Supporter',
          last_name: '',
          email: sanitizedEmail || 'support@poultrymarketkenya.com',
          host,
          amount: fees.grossAmount,
          phone_number: normalizedPhone,
          api_ref: apiRef,
          wallet_id: authorProfile.wallet.intasendWalletId,
        });

        // Update transaction with IntaSend invoice ID
        await prisma.supportTransaction.update({
          where: { id: transaction.id },
          data: {
            intasendInvoiceId: mpesaResponse.invoice.invoice_id,
          },
        });

        return NextResponse.json({
          success: true,
          paymentMethod: 'MPESA_STK',
          message: 'Please check your phone and enter your M-Pesa PIN to complete the payment.',
          transactionId: transaction.id,
          transaction: {
            id: transaction.id,
            invoiceId: mpesaResponse.invoice.invoice_id,
            amount: fees.grossAmount,
            status: 'PENDING',
          },
        });

      } else if (paymentMethod === 'CARD_CHECKOUT') {
        // Email already validated above

        // Create checkout for card payment
        const checkoutResponse = await fundWalletCheckout({
          first_name: sanitizedName || 'Supporter',
          last_name: '',
          email: sanitizedEmail,
          host,
          amount: fees.grossAmount,
          currency: SUPPORT_CONFIG.CURRENCY,
          api_ref: apiRef,
          redirect_url: `${host}/support/${authorId}/thank-you?tx=${transaction.id}`,
          wallet_id: authorProfile.wallet.intasendWalletId,
        });

        // Update transaction with checkout ID
        await prisma.supportTransaction.update({
          where: { id: transaction.id },
          data: {
            intasendCheckoutId: checkoutResponse.id,
          },
        });

        return NextResponse.json({
          success: true,
          paymentMethod: 'CARD_CHECKOUT',
          checkoutUrl: checkoutResponse.url,
          transaction: {
            id: transaction.id,
            checkoutId: checkoutResponse.id,
            amount: fees.grossAmount,
            status: 'PENDING',
          },
        });

      } else {
        return NextResponse.json(
          { error: 'Invalid payment method. Use MPESA_STK or CARD_CHECKOUT.' },
          { status: 400 }
        );
      }

    } catch (paymentError) {
      // Update transaction as failed
      await prisma.supportTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          failedReason: paymentError instanceof Error ? paymentError.message : 'Payment initiation failed',
        },
      });

      throw paymentError;
    }

  } catch (error) {
    console.error('Error initiating support payment:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment. Please try again.' },
      { status: 500 }
    );
  }
}
