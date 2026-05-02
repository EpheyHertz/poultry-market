import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type SubscriptionInvoiceMetadata = {
  type?: string;
  plan?: string;
  userId?: string;
  apiRef?: string;
};

function parseMetadata(value: string | null): SubscriptionInvoiceMetadata | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as SubscriptionInvoiceMetadata;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedTake = Number(searchParams.get('take') || 20);
    const take = Math.min(Math.max(requestedTake, 1), 100);

    const invoices = await prisma.paymentInvoice.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const history = invoices
      .map((invoice) => {
        const metadata = parseMetadata(invoice.metadata);
        return {
          invoice,
          metadata,
        };
      })
      .filter(
        ({ metadata }) =>
          metadata?.type === 'subscription' && metadata.userId === user.id
      )
      .slice(0, take)
      .map(({ invoice, metadata }) => ({
        invoiceId: invoice.invoiceId,
        status: invoice.status,
        amount: invoice.amount,
        phoneNumber: invoice.phoneNumber,
        expiresAt: invoice.expiresAt,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        plan: metadata?.plan || null,
        apiRef: metadata?.apiRef || null,
      }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Subscriptions history GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription payment history' }, { status: 500 });
  }
}
