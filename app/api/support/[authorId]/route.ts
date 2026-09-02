import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  fundWalletCheckout,
  validateSupportAmount,
  calculateFees,
  normalizePhoneNumber,
  SUPPORT_CONFIG,
  INTASEND_LIVE,
} from '@/lib/intasend-wallets';

/**
 * Every support payment goes through one IntaSend inline checkout. IntaSend's
 * own modal then offers all the methods enabled on the account (M-Pesa, card,
 * bank), so we no longer branch per method or run our own STK push.
 */
const SUPPORT_PAYMENT_METHOD = 'INTASEND_INLINE';

/** IntaSend requires an email on the checkout; used only when none is given. */
const FALLBACK_SUPPORTER_EMAIL = 'poultrymarket.admin@gmail.com';



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
 * Supports both authorProfile.id and authorProfile.username as the identifier
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { authorId } = await context.params;

    console.log('[Support API] Looking up author:', authorId);

    // Try to find author profile by ID first, then by username
    let authorProfile = await prisma.authorProfile.findUnique({
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
          select: { name: true, avatar: true, email: true },
        },
      },
    });

    // If not found by ID, try by username
    if (!authorProfile) {
      console.log('[Support API] Not found by ID, trying username:', authorId);
      authorProfile = await prisma.authorProfile.findUnique({
        where: { username: authorId.toLowerCase() },
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
            select: { name: true, avatar: true, email: true },
          },
        },
      });
    }

    if (!authorProfile) {
      console.log('[Support API] Author not found:', authorId);
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 404 }
      );
    }

    console.log('[Support API] Found author:', authorProfile.displayName, 'Wallet:', authorProfile.wallet?.status);

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
      phoneNumber,   // Optional - prefills the IntaSend checkout
      email,         // Optional - prefills the IntaSend checkout / receipt
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

    // Contact details are optional - IntaSend's inline checkout collects
    // whatever the chosen payment method needs. We only reject values that were
    // supplied but are clearly malformed.
    if (sanitizedPhone && !validatePhoneNumber(sanitizedPhone)) {
      return NextResponse.json(
        { error: 'Please enter a valid Kenyan phone number' },
        { status: 400 }
      );
    }

    if (sanitizedEmail && !validateEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
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
        paymentMethod: SUPPORT_PAYMENT_METHOD,
        message: sanitizedMessage || null,
        blogPostId: blogPostId || null,
        status: 'PENDING',
      },
    });

    const apiRef = `support-${transaction.id}`;
    const host = process.env.NEXT_PUBLIC_APP_URL || 'https://poultrymarketkenya.com';

    try {
      // One checkout for every supporter. IntaSend's inline modal then lets them
      // pick M-Pesa, card or bank - we never touch their payment credentials.
      const checkoutResponse = await fundWalletCheckout({
        first_name: sanitizedName || 'Supporter',
        last_name: '',
        email: sanitizedEmail || FALLBACK_SUPPORTER_EMAIL,
        phone_number: sanitizedPhone ? normalizePhoneNumber(sanitizedPhone) : undefined,
        host,
        amount: fees.grossAmount,
        currency: SUPPORT_CONFIG.CURRENCY,
        api_ref: apiRef,
        redirect_url: `${host}/support/${authorId}/thank-you?tx=${transaction.id}`,
        wallet_id: authorProfile.wallet.intasendWalletId,
      });

      await prisma.supportTransaction.update({
        where: { id: transaction.id },
        data: {
          intasendCheckoutId: checkoutResponse.id,
        },
      });

      return NextResponse.json({
        success: true,
        paymentMethod: SUPPORT_PAYMENT_METHOD,
        transactionId: transaction.id,
        // Consumed by the IntaSend Payment Button (InlineJS SDK). The amount,
        // currency and destination wallet are already sealed into this
        // checkout server-side, so the browser cannot alter them.
        checkout: {
          checkoutId: checkoutResponse.id,
          signature: checkoutResponse.signature,
          live: INTASEND_LIVE,
        },
        // Fallback for browsers where the SDK cannot load.
        checkoutUrl: checkoutResponse.url,
        transaction: {
          id: transaction.id,
          checkoutId: checkoutResponse.id,
          amount: fees.grossAmount,
          status: 'PENDING',
        },
      });

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
