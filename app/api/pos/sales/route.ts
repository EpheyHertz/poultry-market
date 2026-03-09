import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateReceiptNumber, validatePOSStock } from '@/lib/pos';
import { initiateStkPush, formatPaymentAmount } from '@/lib/intasend';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schema for POS sale
const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).default(0),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'At least one item required'),
  paymentMethod: z.enum(['CASH', 'MPESA', 'CARD']),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  discountAmount: z.number().min(0).default(0),
});

/**
 * GET /api/pos/sales
 * List POS sales for the current seller
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const period = searchParams.get('period') || 'today'; // today, week, month, all
    const status = searchParams.get('status') || undefined;

    // Build date filter
    const now = new Date();
    let dateFilter: { gte?: Date; lt?: Date } = {};
    
    if (period === 'today') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter.lt = new Date(dateFilter.gte.getTime() + 24 * 60 * 60 * 1000);
    } else if (period === 'week') {
      const dayOfWeek = now.getDay();
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    } else if (period === 'month') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const where: any = {
      sellerId: user.role === 'ADMIN' ? undefined : user.id,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      ...(status && { status: status as any }),
    };

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: {
            include: { product: { select: { name: true, images: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[POS Sales GET]', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

/**
 * POST /api/pos/sales
 * Create a new POS sale with stock deduction and inventory logging
 */
// export async function POST(request: NextRequest) {
//   try {
//     const user = await getCurrentUser();
//     if (!user || !['SELLER', 'COMPANY', 'ADMIN'].includes(user.role)) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Rate limiting
//     const clientId = getClientIdentifier(request, user.id);
//     const rateCheck = checkRateLimit(clientId, RATE_LIMITS.posSale);
//     if (!rateCheck.allowed) {
//       return NextResponse.json(
//         { error: 'Too many requests. Try again later.', retryAfter: rateCheck.retryAfter },
//         { status: 429 }
//       );
//     }

//     const body = await request.json();
    
//     // Validate input
//     const parsed = createSaleSchema.safeParse(body);
//     if (!parsed.success) {
//       return NextResponse.json(
//         { error: 'Validation failed', details: parsed.error.flatten() },
//         { status: 400 }
//       );
//     }

//     const { items, paymentMethod, customerName, customerPhone, notes, discountAmount } = parsed.data;

//     // Validate stock availability
//     const stockValidation = await validatePOSStock(items, user.id);
//     if (!stockValidation.valid) {
//       return NextResponse.json(
//         { error: 'Stock validation failed', details: stockValidation.errors },
//         { status: 400 }
//       );
//     }

//     // Generate receipt number
//     const receiptNumber = await generateReceiptNumber(user.id);

//     // Calculate totals
//     const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
//     const itemDiscounts = items.reduce((sum, item) => sum + item.discount, 0);
//     const total = subtotal - itemDiscounts - discountAmount;

//     if (total <= 0) {
//       return NextResponse.json({ error: 'Sale total must be positive' }, { status: 400 });
//     }

//     // Create sale in a transaction
//     const sale = await prisma.$transaction(async (tx) => {
//       // Fetch product details for snapshot
//       const productDetails = await Promise.all(
//         items.map((item) =>
//           tx.product.findUniqueOrThrow({
//             where: { id: item.productId },
//             select: { id: true, name: true, stock: true, price: true },
//           })
//         )
//       );

//       // Create the sale
//       const newSale = await tx.sale.create({
//         data: {
//           receiptNumber,
//           sellerId: user.id,
//           subtotal,
//           discountAmount: itemDiscounts + discountAmount,
//           total,
//           paymentMethod,
//           status: paymentMethod === 'MPESA' ? 'COMPLETED' : 'COMPLETED', // MPESA will be updated via webhook if needed
//           customerName,
//           customerPhone,
//           notes,
//           items: {
//             create: items.map((item, index) => ({
//               productId: item.productId,
//               productName: productDetails[index].name,
//               quantity: item.quantity,
//               unitPrice: item.unitPrice,
//               discount: item.discount,
//               total: (item.unitPrice * item.quantity) - item.discount,
//             })),
//           },
//         },
//         include: { items: true },
//       });

//       // Deduct stock and create inventory logs
//       for (let i = 0; i < items.length; i++) {
//         const item = items[i];
//         const product = productDetails[i];
//         const newStock = product.stock - item.quantity;

//         await tx.product.update({
//           where: { id: item.productId },
//           data: { stock: newStock },
//         });

//         await tx.inventoryLog.create({
//           data: {
//             productId: item.productId,
//             userId: user.id,
//             action: 'SALE',
//             quantity: -item.quantity,
//             previousStock: product.stock,
//             newStock,
//             saleId: newSale.id,
//             reason: `POS Sale ${receiptNumber}`,
//           },
//         });
//       }

//       // Update commission tracking
//       await tx.sellerCommission.upsert({
//         where: { sellerId: user.id },
//         create: {
//           sellerId: user.id,
//           totalSales: total,
//           totalCommission: total * 0.05, // Default 5%
//         },
//         update: {
//           totalSales: { increment: total },
//           totalCommission: {
//             increment: total * 0.05,
//           },
//         },
//       });

//       return newSale;
//     });

//     // For M-Pesa payments, initiate STK Push
//     let stkPushResult = null;
//     if (paymentMethod === 'MPESA' && customerPhone) {
//       try {
//         stkPushResult = await initiateStkPush({
//           amount: formatPaymentAmount(total),
//           phone_number: customerPhone,
//           api_ref: `pos-${sale.id}`,
//         });

//         // Store the IntaSend invoice ID
//         await prisma.sale.update({
//           where: { id: sale.id },
//           data: { intasendInvoiceId: stkPushResult.invoice.invoice_id },
//         });
//       } catch (error) {
//         console.error('[POS STK Push Error]', error);
//         // Sale is still created, payment can be retried
//       }
//     }

//     return NextResponse.json({
//       sale,
//       receiptNumber,
//       stkPush: stkPushResult
//         ? {
//             invoiceId: stkPushResult.invoice.invoice_id,
//             state: stkPushResult.invoice.state,
//           }
//         : null,
//     }, { status: 201 });
//   } catch (error) {
//     console.error('[POS Sales POST]', error);
//     return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
//   }
// }
