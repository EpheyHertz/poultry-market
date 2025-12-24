import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createWallet, SUPPORT_CONFIG } from '@/lib/intasend-wallets';
import { sendEmail } from '@/lib/email';
import {
  generateWalletCreatedAuthorEmail,
  generateWalletCreatedAdminEmail,
  WalletCreationEmailData,
} from '@/lib/email-templates';

// Admin email for notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@poultrymarket.co.ke';

/**
 * POST /api/author/wallet/create
 * Create an IntaSend wallet for the authenticated author
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get author profile with user details
    const authorProfile = await prisma.authorProfile.findUnique({
      where: { userId: user.id },
      include: { 
        wallet: true,
        user: {
          select: { email: true, name: true },
        },
      },
    });

    if (!authorProfile) {
      return NextResponse.json(
        { error: 'Author profile not found. Please create an author profile first.' },
        { status: 404 }
      );
    }

    // Check if wallet already exists - Professional response
    if (authorProfile.wallet) {
      return NextResponse.json({
        success: false,
        alreadyExists: true,
        message: 'You already have a support wallet set up.',
        existingWallet: {
          id: authorProfile.wallet.id,
          status: authorProfile.wallet.status,
          createdAt: authorProfile.wallet.createdAt,
          mpesaNumber: authorProfile.wallet.mpesaNumber,
        },
        hint: 'Visit your Support Dashboard to manage your existing wallet.',
        dashboardUrl: '/author/support/dashboard',
      }, { status: 409 }); // 409 Conflict
    }

    // Parse request body for optional M-Pesa number
    const body = await request.json().catch(() => ({}));
    const { mpesaNumber } = body;

    // Create IntaSend wallet
    const walletLabel = `PMK-Author-${authorProfile.username}`;
    const intasendWallet = await createWallet(walletLabel);

    // Save wallet to database
    const wallet = await prisma.authorWallet.create({
      data: {
        authorProfileId: authorProfile.id,
        intasendWalletId: intasendWallet.wallet_id,
        currency: intasendWallet.currency,
        label: intasendWallet.label,
        canDisburse: Boolean(intasendWallet.can_disburse),
        currentBalance: parseFloat(intasendWallet.current_balance) || 0,
        availableBalance: parseFloat(intasendWallet.available_balance) || 0,
        mpesaNumber: mpesaNumber || null,
        dailyWithdrawLimit: SUPPORT_CONFIG.DAILY_WITHDRAWAL_LIMIT,
        status: 'ACTIVE',
        lastSyncedAt: new Date(),
      },
    });

    // Prepare email data
    const emailData: WalletCreationEmailData = {
      authorName: authorProfile.displayName,
      authorEmail: authorProfile.user.email || '',
      authorUsername: authorProfile.username,
      walletId: wallet.id,
      mpesaNumber: mpesaNumber || undefined,
      createdAt: new Date().toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    // Send emails asynchronously (don't block the response)
    Promise.all([
      // Email to author
      emailData.authorEmail ? sendEmail({
        to: emailData.authorEmail,
        subject: '🎉 Your Support Wallet is Ready!',
        html: generateWalletCreatedAuthorEmail(emailData),
      }) : Promise.resolve(),
      
      // Email to admin
      sendEmail({
        to: ADMIN_EMAIL,
        subject: `💼 New Author Wallet: ${emailData.authorName} (@${emailData.authorUsername})`,
        html: generateWalletCreatedAdminEmail(emailData),
      }),
    ]).catch(err => {
      console.error('Error sending wallet creation emails:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Support wallet created successfully!',
      wallet: {
        id: wallet.id,
        walletId: wallet.intasendWalletId,
        currency: wallet.currency,
        balance: wallet.availableBalance,
        status: wallet.status,
      },
    });

  } catch (error) {
    console.error('Error creating author wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet. Please try again.' },
      { status: 500 }
    );
  }
}
