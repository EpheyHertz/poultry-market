import { prisma } from './prisma';
import { PaymentInvoiceStatus } from '@prisma/client';

export interface CreateInvoiceData {
  invoiceId: string;
  amount: number;
  phoneNumber?: string;
  expiresAt: Date;
  metadata?: any;
}

export interface UpdateInvoiceData {
  status?: PaymentInvoiceStatus;
  expectedAmount?: number;
  isUsed?: boolean;
  orderId?: string;
  metadata?: any;
}

/**
 * Create a new payment invoice record
 */
export async function createPaymentInvoice(data: CreateInvoiceData) {
  return await prisma.paymentInvoice.create({
    data: {
      invoiceId: data.invoiceId,
      amount: data.amount,
      phoneNumber: data.phoneNumber,
      expiresAt: data.expiresAt,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });
}

/**
 * Find payment invoice by invoice ID
 */
export async function findPaymentInvoice(invoiceId: string) {
  return await prisma.paymentInvoice.findUnique({
    where: { invoiceId },
    include: { order: true },
  });
}

/**
 * Update payment invoice
 */
export async function updatePaymentInvoice(invoiceId: string, data: UpdateInvoiceData) {
  return await prisma.paymentInvoice.update({
    where: { invoiceId },
    data: {
      ...data,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    },
  });
}

/**
 * Check if invoice can be used for payment
 */
export async function canUseInvoice(invoiceId: string): Promise<{
  canUse: boolean;
  reason?: string;
  invoice?: any;
}> {
  const invoice = await findPaymentInvoice(invoiceId);
  
  if (!invoice) {
    return { canUse: false, reason: 'Invoice not found' };
  }

  if (invoice.isUsed) {
    return { canUse: false, reason: 'Invoice already used for another order', invoice };
  }

  if (invoice.expiresAt < new Date()) {
    return { canUse: false, reason: 'Invoice has expired', invoice };
  }

  if (invoice.status === PaymentInvoiceStatus.FAILED) {
    return { canUse: false, reason: 'Payment failed', invoice };
  }

  return { canUse: true, invoice };
}

/**
 * Mark invoice as used when order is created
 */
export async function markInvoiceAsUsed(invoiceId: string, orderId: string) {
  return await updatePaymentInvoice(invoiceId, {
    isUsed: true,
    orderId,
    status: PaymentInvoiceStatus.USED,
  });
}

/**
 * Update invoice status based on payment status
 */
export async function updateInvoicePaymentStatus(
  invoiceId: string,
  paymentStatus: 'COMPLETE' | 'PENDING' | 'FAILED',
  expectedAmount?: number
) {
  let status: PaymentInvoiceStatus;
  
  switch (paymentStatus) {
    case 'COMPLETE':
      status = PaymentInvoiceStatus.COMPLETE;
      break;
    case 'PENDING':
      status = PaymentInvoiceStatus.PENDING;
      break;
    case 'FAILED':
      status = PaymentInvoiceStatus.FAILED;
      break;
    default:
      status = PaymentInvoiceStatus.PENDING;
  }

  return await updatePaymentInvoice(invoiceId, {
    status,
    expectedAmount,
  });
}

/**
 * Clean up expired invoices (can be run as a cron job)
 */
export async function cleanupExpiredInvoices() {
  const expiredInvoices = await prisma.paymentInvoice.updateMany({
    where: {
      expiresAt: { lt: new Date() },
      status: { notIn: [PaymentInvoiceStatus.USED, PaymentInvoiceStatus.EXPIRED] },
    },
    data: {
      status: PaymentInvoiceStatus.EXPIRED,
    },
  });

  return expiredInvoices;
}

/**
 * Get invoice statistics for debugging
 */
export async function getInvoiceStats() {
  const stats = await prisma.paymentInvoice.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
  });

  return stats.reduce((acc, stat) => {
    acc[stat.status] = stat._count.id;
    return acc;
  }, {} as Record<string, number>);
}