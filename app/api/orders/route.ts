import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { OrderStatus, PaymentMethod, PaymentStatus, PaymentType, ProductType, VoucherType, Voucher, DeliveryVoucher } from '@prisma/client'
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
type OrderItemInput = {
  productId: string
  quantity: number
  price: number
  discountApplied: number
  sellerId: string
}

export async function POST(request: NextRequest) {
  try {
    // Authentication and authorization check
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const {
      items,
      deliveryAddress,
      paymentType = PaymentMethod.MPESA,
      paymentDetails,
      voucherCode,
      discountAmount: clientDiscountAmount = 0,
      subtotal: clientSubtotal,
      deliveryFee: clientDeliveryFee = 0,
      deliveryVoucherCode,
      total: clientTotal,
      notes
    } = body
    // console.log('Order creation request:', body)

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })
    }

    // Validate MPESA payment details
    if (paymentType === PaymentMethod.MPESA && (!paymentDetails?.phone || !paymentDetails?.reference)) {
      return NextResponse.json(
        { error: 'MPESA payment requires phone number and transaction reference' },
        { status: 400 }
      )
    }

    // Calculate server-side amounts and validate products
    let serverSubtotal = 0

    const orderItems: OrderItemInput[] = []
    const productTypes = new Set<ProductType>()
    const sellerIds = new Set<string>()

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { seller: true }
      })

      if (!product || !product.isActive) {
        return NextResponse.json(
          { error: `Product ${item.productId} is unavailable` },
          { status: 400 }
        )
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        )
      }

      let itemPrice = product.price
      let discountApplied = 0
      const now = new Date()

      // Apply product discounts if available
// Apply product discounts if available
if (
  product.hasDiscount &&
  product.discountStartDate &&
  product.discountEndDate &&
  product.discountStartDate <= now &&
  product.discountEndDate >= now
) {
  const discount = product.discountAmount ?? 0 // fallback to 0 if null

  if (product.discountType === 'PERCENTAGE') {
    discountApplied = product.price * (discount / 100)
  } else if (product.discountType === 'FIXED_AMOUNT') {
    discountApplied = discount
  }

  itemPrice = Math.max(0, product.price - discountApplied)
}

      serverSubtotal += itemPrice * item.quantity
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        discountApplied,
        sellerId: product.sellerId
      })
      productTypes.add(product.type)
      sellerIds.add(product.sellerId)
    }

    // Calculate delivery fee
    let serverDeliveryFee = 0
    if (deliveryAddress) {
      const defaultFee = await prisma.deliveryFee.findFirst({ 
        where: { isDefault: true } 
      })
      serverDeliveryFee = defaultFee?.amount || 0
    }

    // Validate and apply vouchers
    let serverDiscountAmount = 0
    let serverDeliveryDiscountAmount = 0
    let validVoucher: Voucher | null = null
   let validDeliveryVoucher: DeliveryVoucher | null = null

    if (voucherCode) {
      validVoucher = await prisma.voucher.findFirst({
        where: {
          code: voucherCode,
          isActive: true,
          validFrom: { lte: new Date() },
          validUntil: { gte: new Date() },
          usedCount: { lt: prisma.voucher.fields.maxUses }
        }
      })

      if (!validVoucher) {
        return NextResponse.json({ error: 'Invalid voucher' }, { status: 400 })
      }

      // Check voucher applicability
      if (validVoucher && validVoucher.applicableProductTypes?.length > 0) {
  const applicableTypes = validVoucher.applicableProductTypes
  const applicable = Array.from(productTypes).some(type =>
    applicableTypes.includes(type)
  )
  if (!applicable) {
    return NextResponse.json(
      { error: 'Voucher not applicable to cart items' },
      { status: 400 }
    )
  }
}


      // Check minimum order amount
      if (validVoucher.minOrderAmount > 0 && serverSubtotal < validVoucher.minOrderAmount) {
        return NextResponse.json(
          { error: `Minimum order amount is Ksh ${validVoucher.minOrderAmount}` },
          { status: 400 }
        )
      }

      // Calculate discount
      serverDiscountAmount =
        validVoucher.discountType === VoucherType.PERCENTAGE
          ? serverSubtotal * (validVoucher.discountValue / 100)
          : Math.min(validVoucher.discountValue, serverSubtotal)

      // Apply maximum discount
      if (validVoucher.maxDiscountAmount && serverDiscountAmount > validVoucher.maxDiscountAmount) {
        serverDiscountAmount = validVoucher.maxDiscountAmount
      }
    }

    // Validate and apply delivery voucher
    if (deliveryVoucherCode) {
      validDeliveryVoucher = await prisma.deliveryVoucher.findFirst({
        where: {
          code: deliveryVoucherCode,
          isActive: true,
          OR: [{ expiresAt: { gte: new Date() } }, { expiresAt: null }],
          usedCount: { lt: prisma.deliveryVoucher.fields.maxUses }
        }
      })

      if (!validDeliveryVoucher) {
        return NextResponse.json({ error: 'Invalid delivery voucher' }, { status: 400 })
      }

      if (validDeliveryVoucher.minOrderAmount > 0 && serverSubtotal < validDeliveryVoucher.minOrderAmount) {
        return NextResponse.json(
          { error: `Minimum order amount is Ksh ${validDeliveryVoucher.minOrderAmount}` },
          { status: 400 }
        )
      }

      // Calculate delivery discount
      if (validDeliveryVoucher.discountType === VoucherType.PERCENTAGE) {
        serverDeliveryDiscountAmount = serverDeliveryFee * (validDeliveryVoucher.discountValue / 100)
      } else if (validDeliveryVoucher.discountType === VoucherType.FIXED_AMOUNT) {
        serverDeliveryDiscountAmount = Math.min(validDeliveryVoucher.discountValue, serverDeliveryFee)
      } else if (validDeliveryVoucher.discountType === VoucherType.FREE_SHIPPING) {
        serverDeliveryDiscountAmount = serverDeliveryFee
      }
    }

// Calculate and round final delivery fee
const rawDeliveryFee = Math.max(0, serverDeliveryFee - serverDeliveryDiscountAmount);
const finalDeliveryFee = rawDeliveryFee % 1 <= 0.4
  ? Math.floor(rawDeliveryFee)
  : Math.ceil(rawDeliveryFee);

// Calculate and round server total
const rawTotal = Math.max(0, serverSubtotal - serverDiscountAmount + finalDeliveryFee);
const serverTotal = rawTotal % 1 <= 0.4
  ? Math.floor(rawTotal)
  : Math.ceil(rawTotal);


    // Verify client calculations match server
    if (
      Math.abs(serverSubtotal - clientSubtotal) > 1 ||
      Math.abs(serverDiscountAmount - clientDiscountAmount) > 1 ||
      Math.abs(serverTotal - clientTotal) > 1
    ) {
      return NextResponse.json(
        { error: 'Client/server mismatch in amounts' },
        { status: 400 }
      )
    }

    // Set initial statuses
    const initialStatus: OrderStatus = OrderStatus.PENDING
    const initialPaymentStatus: PaymentStatus =  PaymentStatus.SUBMITTED 

    // Create order and payment in transaction
    const [order, payment] = await prisma.$transaction(async (tx) => {
      // 1. Create the order first
      const createdOrder = await tx.order.create({
        data: {
          customerId: user.id,
          total: serverTotal,
          subtotal: serverSubtotal,
          status: initialStatus,
          paymentType: paymentType as PaymentType,
          paymentStatus: initialPaymentStatus,
          deliveryFee:finalDeliveryFee,
          discountAmount: serverDiscountAmount,
          voucherCode: validVoucher?.code || null,
          paymentDetails:
            (deliveryVoucherCode || voucherCode ? `Delivery Voucher: ${deliveryVoucherCode}. Voucher Code: ${voucherCode}` : `${body?.paymentDetails}`) || null,
          paymentPhone: body?.paymentPhone || null,
          paymentReference: body?.paymentReference || null,
          notes: notes || null,
          items: {
            create: orderItems.map(({ sellerId, ...item }) => item)
          },
          ...(deliveryAddress ? {
            delivery: {
              create: {
                address: deliveryAddress,
                trackingId: `TRK${Date.now()}`,
                status: OrderStatus.PENDING,
                fee: finalDeliveryFee,
                deliveryNotes: deliveryVoucherCode
                  ? `Applied voucher: ${deliveryVoucherCode}`
                  : null
              }
            }
          } : {})
        }
      })

      // 2. Create payment with both order and user relations
      const paymentRecord = await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          userId: user.id,
          amount: serverTotal,
          method:  PaymentMethod.MPESA,
          status: PaymentStatus.PENDING,
          phoneNumber: body?.paymentPhone || null,
          transactionCode: body?.paymentReference || null,
          referenceNumber: `PAY-${Date.now()}`,
          mpesaMessage: body?.paymentDetails|| null,
          description:
            
            (validVoucher ? `Applied voucher: ${validVoucher.code}` : '') +
              (validDeliveryVoucher
                ? ` | Applied delivery voucher: ${validDeliveryVoucher.code}`
                : ''),
         
        }
      })

      // 3. Update order with paymentId
      const updatedOrder = await tx.order.update({
        where: { id: createdOrder.id },
        data: { payment: { connect: { id: paymentRecord.id } } },
        include: {
          items: {
            include: {
              product: {
                include: {
                  seller: true
                }
              }
            }
          },
          delivery: true
        }
      })

      // 4. Update product stocks
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            updatedAt: new Date()
          }
        })
      }

      // 5. Update voucher usage counts
      if (validVoucher) {
        await tx.voucher.update({
          where: { code: validVoucher.code },
          data: { usedCount: { increment: 1 } }
        })
      }

      if (validDeliveryVoucher) {
        await tx.deliveryVoucher.update({
          where: { code: validDeliveryVoucher.code },
          data: { usedCount: { increment: 1 } }
        })
      }

      return [updatedOrder, paymentRecord]
    }, { timeout: 35000 })

    // Send notifications to all sellers involved
    for (const sellerId of Array.from(sellerIds)) {
      const template = notificationTemplates.newOrder(
        order.id.slice(-8),
        paymentType
      )
      await createNotification({
        receiverId: sellerId,
        senderId: user.id,
        orderId: order.id,
        type: 'EMAIL',
        title: template.title,
        message: template.message
      })
    }

    return NextResponse.json({
      success: true,
      order,
      payment
    })
  } catch (error) {
    console.error('Order creation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}