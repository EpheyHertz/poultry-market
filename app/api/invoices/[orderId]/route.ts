import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateInvoicePDF } from '@/lib/invoice'
import { uploadToCloudinary } from '@/lib/cloudinary'

export async function GET(
  request: NextRequest
) {
  try {
       const orderId = request.nextUrl.pathname.split('/').pop() || ''
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: {
                seller: true
              }
            }
          }
        },
        invoice: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check permissions
    const isCustomer = user.id === order.customerId
    const isSeller = order.items.some(item => item.product.sellerId === user.id)
    const isAdmin = user.role === 'ADMIN'

    if (!isCustomer && !isSeller && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Generate invoice if it doesn't exist
    if (!order.invoice && order.status === 'DELIVERED') {
      const invoiceNumber = `INV-${Date.now()}`
      
      const invoiceData = {
        invoiceNumber,
        order,
        customer: order.customer,
        seller: order.items[0].product.seller,
        items: order.items,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        total: order.total,
        voucherCode: order.voucherCode
      }

      // Generate PDF buffer
      const pdfBuffer = await generateInvoicePDF(invoiceData)
      
      // Convert buffer to File object
      const pdfFile = new File([pdfBuffer], `${invoiceNumber}.pdf`, {
        type: 'application/pdf',
      })

      // Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(
        pdfFile,
        `invoices/${invoiceNumber}`
      )

      if (!cloudinaryUrl) {
        throw new Error('Failed to upload invoice to Cloudinary')
      }

      // Save invoice reference in database
      await prisma.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber,
          fileName: `${invoiceNumber}.pdf`,
          filePath: cloudinaryUrl,
          // Note: Your upload function doesn't return public_id, so we can't store it
          // If you need public_id, you'll need to modify the upload function to return it
        }
      })

      return NextResponse.json({ 
        downloadUrl: cloudinaryUrl,
        invoiceNumber 
      })
    }

    if (order.invoice) {
      return NextResponse.json({ 
        downloadUrl: order.invoice.filePath,
        invoiceNumber: order.invoice.invoiceNumber 
      })
    }

    return NextResponse.json({ error: 'Invoice not available' }, { status: 404 })
  } catch (error) {
    console.error('Invoice generation error:', error)
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}