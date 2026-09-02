/**
 * In-app support refunds (ledger reversal).
 *
 * IMPORTANT: this is deliberately NOT an IntaSend refund/chargeback call.
 * Author support money is settled into our own `AuthorWallet` ledger, so a
 * refund here means reversing that ledger entry and marking the transaction
 * REFUNDED. Payouts back to the supporter are handled off-platform by support
 * staff, which keeps us from mutating IntaSend state we do not own.
 *
 * Security notes:
 * - Only an ADMIN or the author who received the money can refund.
 * - Only COMPLETED transactions can be refunded, and only once (guarded by a
 *   conditional update so concurrent requests cannot double-reverse).
 * - The author's wallet must still hold the funds; already-withdrawn money
 *   cannot be clawed back silently.
 */

import { prisma } from '@/lib/prisma';

/** Refunds are only allowed within this many days of the payment completing. */
export const REFUND_WINDOW_DAYS = 30;

/** Maximum length of the human-provided refund reason. */
export const MAX_REFUND_REASON_LENGTH = 500;

export type RefundFailureCode =
    | 'NOT_FOUND'
    | 'FORBIDDEN'
    | 'NOT_REFUNDABLE'
    | 'WINDOW_EXPIRED'
    | 'INSUFFICIENT_BALANCE'
    | 'INVALID_REASON'
    | 'ALREADY_PROCESSED';

export interface RefundResult {
    success: boolean;
    code?: RefundFailureCode;
    error?: string;
    refund?: {
        transactionId: string;
        amount: number;
        netAmount: number;
        platformFee: number;
        currency: string;
        refundedAt: Date;
        reason: string;
    };
}

export interface RefundSupportTransactionInput {
    transactionId: string;
    /** The signed-in user requesting the refund. */
    actorUserId: string;
    /** The signed-in user's role - ADMIN can refund on anyone's behalf. */
    actorRole: string;
    reason: string;
}

function sanitizeReason(reason: unknown): string | null {
    if (typeof reason !== 'string') return null;
    // Strip control characters, collapse whitespace, then bound the length.
    const cleaned = reason
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (cleaned.length < 5 || cleaned.length > MAX_REFUND_REASON_LENGTH) return null;
    return cleaned;
}

/**
 * Reverse a completed support payment inside our own ledger.
 *
 * The wallet counters mirror exactly what `creditSupportTransaction()` in the
 * support webhook increments, so a refund leaves the wallet as if the support
 * had never arrived.
 */
export async function refundSupportTransaction({
    transactionId,
    actorUserId,
    actorRole,
    reason,
}: RefundSupportTransactionInput): Promise<RefundResult> {
    const cleanReason = sanitizeReason(reason);
    if (!cleanReason) {
        return {
            success: false,
            code: 'INVALID_REASON',
            error: `Please provide a refund reason between 5 and ${MAX_REFUND_REASON_LENGTH} characters.`,
        };
    }

    const transaction = await prisma.supportTransaction.findUnique({
        where: { id: transactionId },
        select: {
            id: true,
            walletId: true,
            amount: true,
            netAmount: true,
            platformFee: true,
            currency: true,
            status: true,
            completedAt: true,
            supporterId: true,
            wallet: {
                select: {
                    id: true,
                    availableBalance: true,
                    authorProfile: { select: { userId: true, displayName: true } },
                },
            },
        },
    });

    if (!transaction) {
        return { success: false, code: 'NOT_FOUND', error: 'Support transaction not found.' };
    }

    const isAdmin = actorRole === 'ADMIN';
    const isReceivingAuthor = transaction.wallet.authorProfile.userId === actorUserId;
    if (!isAdmin && !isReceivingAuthor) {
        // Same message for "not yours" and "not found" would be nicer, but the
        // lookup above already confirmed existence to an authenticated user
        // only, so a clear 403 is fine here.
        return {
            success: false,
            code: 'FORBIDDEN',
            error: 'You are not allowed to refund this support payment.',
        };
    }

    if (transaction.status === 'REFUNDED') {
        return { success: false, code: 'ALREADY_PROCESSED', error: 'This support payment was already refunded.' };
    }

    if (transaction.status !== 'COMPLETED') {
        return {
            success: false,
            code: 'NOT_REFUNDABLE',
            error: 'Only completed support payments can be refunded.',
        };
    }

    const completedAt = transaction.completedAt;
    if (!completedAt) {
        return {
            success: false,
            code: 'NOT_REFUNDABLE',
            error: 'This support payment has no settlement date and cannot be refunded automatically.',
        };
    }

    const windowMs = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - completedAt.getTime() > windowMs) {
        return {
            success: false,
            code: 'WINDOW_EXPIRED',
            error: `Refunds are only available within ${REFUND_WINDOW_DAYS} days of payment.`,
        };
    }

    // The author must still be holding the funds - we never let a wallet go
    // negative because the money has already been withdrawn.
    if (transaction.wallet.availableBalance + 0.01 < transaction.netAmount) {
        return {
            success: false,
            code: 'INSUFFICIENT_BALANCE',
            error: 'The author no longer has enough available balance to refund this payment. Please contact support.',
        };
    }

    const refundedAt = new Date();

    // Thrown inside the transaction to force a rollback when the wallet can no
    // longer cover the reversal; caught below and reported as a clean failure.
    const BALANCE_RACE = 'SUPPORT_REFUND_BALANCE_RACE';

    const runReversal = () => prisma.$transaction(async (tx) => {
        // Conditional update = only one concurrent caller can win the refund.
        const claimed = await tx.supportTransaction.updateMany({
            where: { id: transaction.id, status: 'COMPLETED' },
            data: {
                status: 'REFUNDED',
                refundedAt,
                refundReason: cleanReason,
                refundedById: actorUserId,
            },
        });

        if (claimed.count !== 1) return false;

        // Guard the balance again inside the transaction so a concurrent
        // withdrawal cannot push the wallet negative.
        const debited = await tx.authorWallet.updateMany({
            where: { id: transaction.walletId, availableBalance: { gte: transaction.netAmount } },
            data: {
                currentBalance: { decrement: transaction.netAmount },
                availableBalance: { decrement: transaction.netAmount },
                totalReceived: { decrement: transaction.amount },
                platformFeeTotal: { decrement: transaction.platformFee },
                supportersCount: { decrement: 1 },
                transactionsCount: { decrement: 1 },
            },
        });

        if (debited.count !== 1) {
            // Roll the whole thing back - the wallet can no longer cover it.
            throw new Error(BALANCE_RACE);
        }

        const amountLabel = `${transaction.currency} ${transaction.amount.toFixed(2)}`;

        await tx.notification.create({
            data: {
                type: 'PUSH',
                title: 'Support Payment Refunded',
                message: `A support payment of ${amountLabel} was refunded. Reason: ${cleanReason}`,
                receiverId: transaction.wallet.authorProfile.userId,
            },
        });

        if (transaction.supporterId) {
            await tx.notification.create({
                data: {
                    type: 'PUSH',
                    title: 'Your Support Was Refunded',
                    message: `Your ${amountLabel} support to ${transaction.wallet.authorProfile.displayName} has been refunded. Reason: ${cleanReason}`,
                    receiverId: transaction.supporterId,
                },
            });
        }

        return true;
    });

    let reversed: boolean;
    try {
        reversed = await runReversal();
    } catch (error) {
        if (error instanceof Error && error.message === BALANCE_RACE) {
            return {
                success: false,
                code: 'INSUFFICIENT_BALANCE',
                error: 'The author no longer has enough available balance to refund this payment. Please contact support.',
            };
        }
        throw error;
    }

    if (!reversed) {
        return { success: false, code: 'ALREADY_PROCESSED', error: 'This support payment was already refunded.' };
    }

    return {
        success: true,
        refund: {
            transactionId: transaction.id,
            amount: transaction.amount,
            netAmount: transaction.netAmount,
            platformFee: transaction.platformFee,
            currency: transaction.currency,
            refundedAt,
            reason: cleanReason,
        },
    };
}
