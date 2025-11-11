import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { OrderStatus, PaymentMethod, PaymentStatus, PaymentType, ProductType, VoucherType, Voucher, DeliveryVoucher } from '@prisma/client'
import { createNotification, notificationTemplates } from '@/lib/notifications'
import { COUNTY_TO_PROVINCE } from '@/lib/kenya-locations'
import { markInvoiceAsUsed, canUseInvoice } from '@/lib/payment-invoices'
import { 
  initiateStkPush, 
  validatePhoneNumber,
  generateExternalReference,
  generateCallbackUrl,
  createPaymentMetadata,
  formatPaymentAmount,
  LipiaPaymentError
} from '@/lib/lipia'
import { logOrderCreated, logPaymentSubmitted } from '@/lib/order-timeline'
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
      paymentType ,
      paymentDetails,
      paymentPreference,
      voucherCode,
      discountAmount: clientDiscountAmount = 0,
      subtotal: clientSubtotal,
      deliveryFee: clientDeliveryFee = 0,
      deliveryVoucherCode,
      total: clientTotal,
      notes
    } = body
    console.log('Order creation request:', body)

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })
    }

    // Validate MPESA payment details for prepaid orders
    if (paymentType === PaymentMethod.MPESA && paymentPreference === 'BEFORE_DELIVERY') {
      if (!paymentDetails?.phone) {
        return NextResponse.json(
          { error: 'Phone number is required for M-Pesa payments' },
          { status: 400 }
        )
      }
      
      // Validate phone number format
      const phoneValidation = validatePhoneNumber(paymentDetails.phone)
      if (!phoneValidation.isValid) {
        return NextResponse.json(
          { error: phoneValidation.error },
          { status: 400 }
        )
      }

      // For manual payments, require transaction reference
      if (paymentDetails.method === 'MANUAL' && !paymentDetails.reference) {
        return NextResponse.json(
          { error: 'Transaction reference is required for manual M-Pesa payments' },
          { status: 400 }
        )
      }
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
    const freeDeliveryEligible = body?.deliveryOptions?.[0]?.freeDeliveryEligible

    if (!body?.canDeliver && !body?.deliveryAvailable && freeDeliveryEligible) {
      if (deliveryAddress) {
        const defaultFee = await prisma.deliveryFee.findFirst({
          where: { isDefault: true }
        })
        serverDeliveryFee = defaultFee?.amount || 0
      }
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
      Math.abs(serverDiscountAmount - clientDiscountAmount) > 1 
      // Math.abs(serverTotal - clientTotal) > 1
    ) {
      return NextResponse.json(
        { error: 'Client/server mismatch in amounts' },
        { status: 400 }
      )
    }

    // Set initial statuses
    const initialStatus: OrderStatus = OrderStatus.PENDING
    const initialPaymentStatus: PaymentStatus =  PaymentStatus.SUBMITTED 

    // Check if manual payment reference is an IntaSend invoice ID
    let isValidInvoice = false
    if (paymentPreference === 'BEFORE_DELIVERY' && 
        body?.paymentDetails?.method === 'MANUAL' && 
        body.paymentDetails.reference) {
      
      try {
        const invoiceCheck = await canUseInvoice(body.paymentDetails.reference)
        if (invoiceCheck.canUse && invoiceCheck.invoice) {
          // Verify the invoice amount matches the order total
          const expectedAmount = invoiceCheck.invoice.amount
          const tolerance = Math.max(1, expectedAmount * 0.02) // 2% tolerance or minimum KES 1
          
          if (Math.abs(expectedAmount - serverTotal) <= tolerance) {
            isValidInvoice = true
          } else {
            return NextResponse.json({
              error: `Payment amount mismatch. Expected: KES ${serverTotal}, Invoice amount: KES ${expectedAmount}`
            }, { status: 400 })
          }
        } else {
          return NextResponse.json({
            error: `Invalid payment reference: ${invoiceCheck.reason}`
          }, { status: 400 })
        }
      } catch (error) {
        console.error('Invoice verification error:', error)
        return NextResponse.json({
          error: 'Failed to verify payment reference'
        }, { status: 400 })
      }
    } 

    // Create order and payment in transaction
    const [order, payment, stkPushResponse] = await prisma.$transaction(async (tx) => {
      // 1. Create the order first
      const createdOrder = await tx.order.create({
        data: {
          customerId: user.id,
          total: serverTotal,
          subtotal: serverSubtotal,
          status: initialStatus,
          paymentType: paymentPreference as PaymentType,
          paymentStatus: initialPaymentStatus,
          deliveryFee: finalDeliveryFee,
          discountAmount: serverDiscountAmount,
          voucherCode: validVoucher?.code || null,
          paymentDetails: paymentPreference === 'BEFORE_DELIVERY' && body?.paymentDetails?.phone 
            ? `Phone: ${body.paymentDetails.phone}` 
            : null,
          paymentPhone: body?.paymentDetails?.phone || null,
          paymentReference: null, // Will be set after STK Push
          notes: notes || null,
          items: {
            create: orderItems.map(({ sellerId, ...item }) => item)
          },
          ...(deliveryAddress ? {
            delivery: {
              create: {
                address: deliveryAddress,
                trackingId: `TRK${Date.now()}`,
                status: 'ASSIGNED',
                fee: finalDeliveryFee,
                deliveryNotes: deliveryVoucherCode
                  ? `Applied voucher: ${deliveryVoucherCode}`
                  : null
              }
            }
          } : {})
        }
      })

      // 2. Create payment record
      const paymentRecord = await tx.payment.create({
        data: {
          orderId: createdOrder.id,
          userId: user.id,
          amount: serverTotal,
          method: paymentPreference === 'BEFORE_DELIVERY' ? PaymentMethod.MPESA : PaymentMethod.CASH_ON_DELIVERY,
          status: PaymentStatus.PENDING,
          phoneNumber: body?.paymentDetails?.phone || null,
          transactionCode: body?.paymentDetails?.method === 'MANUAL' ? body.paymentDetails.reference : null,
          referenceNumber: `PAY-${Date.now()}`,
          description: [
            validVoucher ? `Applied voucher: ${validVoucher.code}` : '',
            validDeliveryVoucher ? `Applied delivery voucher: ${validDeliveryVoucher.code}` : '',
            body?.paymentDetails?.method ? `Payment method: ${body.paymentDetails.method}` : ''
          ].filter(Boolean).join(' | ') || null
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

      return [updatedOrder, paymentRecord, null] // STK Push response will be set if initiated
    }, { timeout: 35000 })

    // Create timeline events for order creation and payment submission
    await logOrderCreated(
      order.id,
      user.id,
      user.name,
      paymentPreference === 'BEFORE_DELIVERY' ? 'Prepaid' : 'Cash on Delivery'
    )

    if (paymentPreference === 'BEFORE_DELIVERY') {
      await logPaymentSubmitted(
        order.id,
        user.id,
        user.name,
        paymentType === PaymentMethod.MPESA ? 'M-Pesa' : 'Cash',
        serverTotal
      )
    }

    // Mark IntaSend invoice as used if this was a manual payment with a valid invoice
    if (isValidInvoice && body?.paymentDetails?.reference) {
      try {
        await markInvoiceAsUsed(body.paymentDetails.reference, order.id)
        console.log(`Marked invoice ${body.paymentDetails.reference} as used for order ${order.id}`)
      } catch (error) {
        console.error('Failed to mark invoice as used:', error)
        // Continue with order processing even if invoice marking fails
      }
    }

    // Initiate STK Push for prepaid STK Push payments (outside transaction to avoid blocking)
    let stkPushData: any = null
    if (paymentPreference === 'BEFORE_DELIVERY' && 
        paymentType === PaymentMethod.MPESA && 
        body?.paymentDetails?.phone &&
        (body?.paymentDetails?.method === 'STK_PUSH' || body?.stkPush === true)) {
      try {
        const phoneValidation = validatePhoneNumber(body.paymentDetails.phone)
        if (!phoneValidation.isValid) {
          // Delete the order if phone validation fails for STK Push
          await prisma.$transaction(async (tx) => {
            // Delete related records first (in correct order to avoid foreign key constraints)
            await tx.payment.delete({ where: { id: payment.id } })
            if (order.delivery) {
              await tx.delivery.delete({ where: { orderId: order.id } })
            }
            await tx.orderItem.deleteMany({ where: { orderId: order.id } })
            await tx.order.delete({ where: { id: order.id } })
            
            // Restore product stocks in parallel for better performance
            const stockUpdates = orderItems.map(item => 
              tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } }
              })
            )
            await Promise.all(stockUpdates)
            
            // Restore voucher usage counts
            if (validVoucher) {
              await tx.voucher.update({
                where: { code: validVoucher.code },
                data: { usedCount: { decrement: 1 } }
              })
            }
            if (validDeliveryVoucher) {
              await tx.deliveryVoucher.update({
                where: { code: validDeliveryVoucher.code },
                data: { usedCount: { decrement: 1 } }
              })
            }
          }, { timeout: 15000 }) // Increase timeout to 15 seconds
          
          return NextResponse.json({
            error: phoneValidation.error
          }, { status: 400 })
        }

        // Format amount for payment
        const paymentAmount = formatPaymentAmount(serverTotal)
        
        // Generate external reference
        const externalReference = generateExternalReference('ORDER', order.id)
        
        // Create callback URL
        const callbackUrl = generateCallbackUrl(`order/${order.id}`)
        
        // Create metadata
        const metadata = createPaymentMetadata({
          orderId: order.id,
          userId: user.id,
          customerName: user.name,
          customerEmail: user.email,
          paymentType: 'order_payment',
          orderTotal: serverTotal
        })

        // Initiate STK Push
        const stkResponse = await initiateStkPush({
          phone_number: phoneValidation.normalized!,
          amount: paymentAmount,
          external_reference: externalReference,
          callback_url: callbackUrl,
          metadata
        })

        // Update payment record with STK Push data
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            referenceNumber: stkResponse.data.TransactionReference,
            externalReference,
            stkPushData: JSON.stringify(stkResponse.data),
            metadata: JSON.stringify(metadata)
          }
        })

        stkPushData = {
          initiated: true,
          transactionReference: stkResponse.data.TransactionReference,
          message: stkResponse.customerMessage
        }
      } catch (error) {
        console.error('STK Push initiation error:', error)
        
        // Check if it's a temporary service issue
        const isTemporaryError = error instanceof Error && 
          (error.message.includes('temporarily unavailable') || 
           error.message.includes('service unavailable') ||
           error.message.includes('timeout'))

        if (isTemporaryError) {
          // For temporary service issues, convert to manual payment instead of deleting order
          console.log('STK Push service temporarily unavailable, converting to manual payment')
          
          // Update payment to require manual confirmation
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'PENDING',
              description: 'STK Push service temporarily unavailable - Manual payment required',
              failureReason: 'STK Push service unavailable - Please pay manually and provide transaction code'
            }
          })

          // Update order status to indicate manual payment needed
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PENDING',
              notes: order.notes ? 
                `${order.notes} | STK Push failed - Manual payment required` : 
                'STK Push failed - Manual payment required'
            }
          })

          stkPushData = {
            initiated: false,
            fallbackToManual: true,
            error: 'STK Push service is temporarily unavailable. Please pay manually using M-Pesa and provide the transaction code.',
            manualPaymentInstructions: {
              paybill: '174379',
              accountNumber: order.id.slice(-8).toUpperCase(),
              amount: serverTotal,
              phone: body.paymentDetails.phone
            }
          }
        } else {
          // For other errors, delete the order and restore everything
          try {
            await prisma.$transaction(async (tx) => {
              // Delete related records first (in correct order to avoid foreign key constraints)
              await tx.payment.delete({ where: { id: payment.id } })
              if (order.delivery) {
                await tx.delivery.delete({ where: { orderId: order.id } })
              }
              await tx.orderItem.deleteMany({ where: { orderId: order.id } })
              await tx.order.delete({ where: { id: order.id } })
              
              // Restore product stocks in parallel for better performance
              const stockUpdates = orderItems.map(item => 
                tx.product.update({
                  where: { id: item.productId },
                  data: { stock: { increment: item.quantity } }
                })
              )
              await Promise.all(stockUpdates)
              
              // Restore voucher usage counts
              if (validVoucher) {
                await tx.voucher.update({
                  where: { code: validVoucher.code },
                  data: { usedCount: { decrement: 1 } }
                })
              }
              if (validDeliveryVoucher) {
                await tx.deliveryVoucher.update({
                  where: { code: validDeliveryVoucher.code },
                  data: { usedCount: { decrement: 1 } }
                })
              }
            }, { timeout: 15000 }) // Increase timeout to 15 seconds
          } catch (rollbackError) {
            console.error('Failed to rollback order after STK Push failure:', rollbackError)
            // Log the specific error for debugging
            if (rollbackError instanceof Error) {
              console.error('Rollback error details:', {
                message: rollbackError.message,
                orderId: order.id,
                paymentId: payment.id
              })
            }
          }

          // Return error for non-temporary STK Push failures
          return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to initiate STK Push payment'
          }, { status: 400 })
        }
      }
    }

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
      await createNotification({
        receiverId: sellerId,
        senderId: user.id,
        orderId: order.id,
        type: 'SMS',
        title: template.title,
        message: template.message
      })
    }

    // Send order confirmation notification to buyer
    const buyerTemplate = notificationTemplates.orderConfirmed(order.id.slice(-8))
    await createNotification({
      receiverId: user.id,
      orderId: order.id,
      type: 'EMAIL',
      title: buyerTemplate.title,
      message: buyerTemplate.message
    })
    await createNotification({
      receiverId: user.id,
      orderId: order.id,
      type: 'SMS',
      title: buyerTemplate.title,
      message: buyerTemplate.message
    })

    const response: any = {
      success: true,
      order,
      payment
    }

    if (stkPushData) {
      response.stkPush = stkPushData
    }

    return NextResponse.json(response)
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