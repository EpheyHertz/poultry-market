import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { OrderStatus, PaymentType, PaymentStatus, DeliveryStatus } from '@prisma/client'
import { createNotification, notificationTemplates } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (user.role === 'CUSTOMER') {
      where.customerId = user.id
    } else if (user.role === 'SELLER' || user.role === 'COMPANY') {
      where.items = {
        some: {
          product: {
            sellerId: user.id
          }
        }
      }
    }
    
    if (status) {
      where.status = status as OrderStatus
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          items: {
            include: {
              product: {
                include: {
                  seller: {
                    select: {
                      id: true,
                      name: true,
                      role: true
                    }
                  }
                }
              }
            }
          },
          delivery: true,
          paymentApprovals: {
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where })
    ])

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}


export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      items,
      deliveryAddress,
      paymentType = 'MPESA',
      paymentDetails,
      voucherCode,
      discountAmount: clientDiscountAmount = 0,
      subtotal: clientSubtotal,
      deliveryFee: clientDeliveryFee = 0,
      deliveryVoucherCode,
      total: clientTotal,
      notes
    } = body;

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    if (paymentType === 'MPESA' && (!paymentDetails?.phone || !paymentDetails?.reference)) {
      return NextResponse.json({ error: 'M-Pesa payment requires phone number and transaction reference' }, { status: 400 });
    }

    let serverSubtotal = 0;
    const orderItems = [];
    const productTypes = new Set<string>();

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.isActive) return NextResponse.json({ error: `Product ${item.productId} unavailable` }, { status: 400 });
      if (product.stock < item.quantity) return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });

      let itemPrice = product.price;
      let discountApplied = 0;
      const now = new Date();
      if (product.hasDiscount && product.discountStartDate <= now && product.discountEndDate >= now) {
        if (product.discountType === 'PERCENTAGE') discountApplied = product.price * (product.discountAmount / 100);
        if (product.discountType === 'FIXED_AMOUNT') discountApplied = product.discountAmount;
        itemPrice = Math.max(0, product.price - discountApplied);
      }

      serverSubtotal += itemPrice * item.quantity;
      orderItems.push({ productId: item.productId, quantity: item.quantity, price: itemPrice, discountApplied });
      productTypes.add(product.type);
    }

    let serverDeliveryFee = 0;
    if (deliveryAddress) {
      const defaultFee = await prisma.deliveryFee.findFirst({ where: { isDefault: true } });
      serverDeliveryFee = defaultFee?.amount || 0;
    }

    let serverDiscountAmount = 0;
    let serverDeliveryDiscountAmount = 0;
    let validVoucher = null;
    let validDeliveryVoucher = null;

    if (voucherCode) {
      validVoucher = await prisma.voucher.findFirst({
        where: {
          code: voucherCode,
          isActive: true,
          validFrom: { lte: new Date() },
          validUntil: { gte: new Date() },
          usedCount: { lt: prisma.voucher.fields.maxUses }
        }
      });
      if (!validVoucher) return NextResponse.json({ error: 'Invalid voucher' }, { status: 400 });

      if (validVoucher.applicableProductTypes?.length > 0) {
        const applicable = Array.from(productTypes).some(type => validVoucher.applicableProductTypes.includes(type));
        if (!applicable) return NextResponse.json({ error: 'Voucher not applicable to cart items' }, { status: 400 });
      }

      if (validVoucher.minOrderAmount > 0 && serverSubtotal < validVoucher.minOrderAmount) {
        return NextResponse.json({ error: `Minimum order amount is Ksh ${validVoucher.minOrderAmount}` }, { status: 400 });
      }

      serverDiscountAmount = validVoucher.discountType === 'PERCENTAGE'
        ? serverSubtotal * (validVoucher.discountValue / 100)
        : Math.min(validVoucher.discountValue, serverSubtotal);

      if (validVoucher.maxDiscountAmount && serverDiscountAmount > validVoucher.maxDiscountAmount) {
        serverDiscountAmount = validVoucher.maxDiscountAmount;
      }
    }

    if (deliveryVoucherCode) {
      validDeliveryVoucher = await prisma.deliveryVoucher.findFirst({
        where: {
          code: deliveryVoucherCode,
          isActive: true,
          OR: [{ expiresAt: { gte: new Date() } }, { expiresAt: null }],
          usedCount: { lt: prisma.deliveryVoucher.fields.maxUses }
        }
      });

      if (!validDeliveryVoucher) return NextResponse.json({ error: 'Invalid delivery voucher' }, { status: 400 });

      if (validDeliveryVoucher.minOrderAmount > 0 && serverSubtotal < validDeliveryVoucher.minOrderAmount) {
        return NextResponse.json({ error: `Minimum order amount is Ksh ${validDeliveryVoucher.minOrderAmount}` }, { status: 400 });
      }

      if (validDeliveryVoucher.discountType === 'PERCENTAGE') {
        serverDeliveryDiscountAmount = serverDeliveryFee * (validDeliveryVoucher.discountValue / 100);
      } else if (validDeliveryVoucher.discountType === 'FIXED_AMOUNT') {
        serverDeliveryDiscountAmount = Math.min(validDeliveryVoucher.discountValue, serverDeliveryFee);
      } else if (validDeliveryVoucher.discountType === 'FREE_SHIPPING') {
        serverDeliveryDiscountAmount = serverDeliveryFee;
      }
    }

    const finalDeliveryFee = Math.max(0, serverDeliveryFee - serverDeliveryDiscountAmount);
    const serverTotal = Math.max(0, serverSubtotal - serverDiscountAmount + finalDeliveryFee);

    if (Math.abs(serverSubtotal - clientSubtotal) > 1 ||
        Math.abs(serverDiscountAmount - clientDiscountAmount) > 1 ||
        Math.abs(serverTotal - clientTotal) > 1) {
      return NextResponse.json({ error: 'Client/server mismatch in amounts' }, { status: 400 });
    }

    const initialStatus = paymentType === 'MPESA' ? 'CONFIRMED' : 'PENDING';
    const initialPaymentStatus = paymentType === 'MPESA' ? 'PAID' : 'UNPAID';

    const [order, payment] = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          customerId: user.id,
          total: serverTotal,
          subtotal: serverSubtotal,
          status: initialStatus,
          paymentType,
          paymentStatus: initialPaymentStatus,
          discountAmount: serverDiscountAmount,
          voucherCode: validVoucher?.code || null,
          paymentDetails: paymentDetails?.details || (deliveryVoucherCode ? `Delivery Voucher: ${deliveryVoucherCode}` : null),
          paymentPhone: paymentDetails?.phone || null,
          paymentReference: paymentDetails?.reference || null,
          notes: notes || null,
          items: { create: orderItems },
          delivery: deliveryAddress ? {
            create: {
              address: deliveryAddress,
              trackingId: `TRK${Date.now()}`,
              status: 'IN_TRANSIT',
              fee: finalDeliveryFee,
              deliveryNotes: deliveryVoucherCode ? `Applied voucher: ${deliveryVoucherCode}` : null
            }
          } : undefined
        },
        include: {
          items: { include: { product: { include: { seller: true } } } },
          delivery: true
        }
      });

      let paymentRecord;
      if (paymentType === 'MPESA') {
        paymentRecord = await tx.payment.create({
          data: {
            order: { connect: { id: createdOrder.id } },
            user: { connect: { id: user.id } },
            amount: serverTotal,
            method: 'MPESA',
            status: 'APPROVED',
            phoneNumber: paymentDetails?.phone,
            transactionCode: paymentDetails?.reference,
            mpesaMessage: paymentDetails?.details,
            referenceNumber: `PAY-${Date.now()}`
          }
        });
      }

      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity }, updatedAt: new Date() }
        });
      }

      if (validVoucher) {
        await tx.voucher.update({ where: { code: validVoucher.code }, data: { usedCount: { increment: 1 } } });
      }

      if (validDeliveryVoucher) {
        await tx.deliveryVoucher.update({ where: { code: validDeliveryVoucher.code }, data: { usedCount: { increment: 1 } } });
      }

      return [createdOrder, paymentRecord];
    }, { timeout: 15000 }); // Increased timeout to avoid P2028 error

    const sellerIds = [...new Set(order.items.map(item => item.product.sellerId))];
    for (const sellerId of sellerIds) {
      const template = notificationTemplates.newOrder(order.id.slice(-8), paymentType);
      await createNotification({
        receiverId: sellerId,
        senderId: user.id,
        orderId: order.id,
        type: 'EMAIL',
        title: template.title,
        message: template.message
      });
    }

    return NextResponse.json({ ...order, payment });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: 'Failed to create order', details: error instanceof Error ? error.message : undefined }, { status: 500 });
  }
}
