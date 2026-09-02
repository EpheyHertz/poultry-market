/**
 * In-app refund for a blog support payment.
 *
 *   POST /api/support/transactions/:transactionId/refund
 *
 * This reverses our own wallet ledger - it does NOT call IntaSend's refund or
 * chargeback API. The actual money movement back to the supporter is handled
 * off-platform; this endpoint only makes our books reflect it.
 *
 * Authorisation is enforced in `refundSupportTransaction()`: an ADMIN, or the
 * author who received the payment. Everything else (status, refund window,
 * balance, single-use) is validated there too, so this handler stays a thin
 * auth + input-shape wrapper.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
    MAX_REFUND_REASON_LENGTH,
    RefundFailureCode,
    refundSupportTransaction,
} from '@/lib/blog/support-refunds';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const CUID_PATTERN = /^c[a-z0-9]{24}$/;

/** Map service-level failures onto HTTP codes without leaking internals. */
const STATUS_BY_CODE: Record<RefundFailureCode, number> = {
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    NOT_REFUNDABLE: 409,
    WINDOW_EXPIRED: 409,
    INSUFFICIENT_BALANCE: 409,
    ALREADY_PROCESSED: 409,
    INVALID_REASON: 400,
};

type RouteContext = { params: Promise<{ transactionId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
        }

        const { transactionId } = await params;
        if (!CUID_PATTERN.test(transactionId)) {
            return NextResponse.json(
                { error: 'Invalid transaction reference' },
                { status: 400, headers: NO_STORE }
            );
        }

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: NO_STORE });
        }

        const reason = (body as { reason?: unknown } | null)?.reason;
        if (typeof reason !== 'string' || reason.length > MAX_REFUND_REASON_LENGTH * 2) {
            return NextResponse.json(
                { error: 'A refund reason is required.' },
                { status: 400, headers: NO_STORE }
            );
        }

        const result = await refundSupportTransaction({
            transactionId,
            actorUserId: user.id,
            actorRole: user.role,
            reason,
        });

        if (!result.success) {
            const status = result.code ? STATUS_BY_CODE[result.code] : 400;
            return NextResponse.json(
                { error: result.error || 'Refund failed', code: result.code },
                { status, headers: NO_STORE }
            );
        }

        return NextResponse.json({ success: true, refund: result.refund }, { headers: NO_STORE });
    } catch (error) {
        console.error('Support refund error:', error);
        return NextResponse.json(
            { error: 'Unable to process the refund right now. Please try again.' },
            { status: 500, headers: NO_STORE }
        );
    }
}
