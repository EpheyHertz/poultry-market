
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateInvoicePDF } from '@/lib/invoice'
import path from 'path'
import fs from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
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

      const fileName = await generateInvoicePDF(invoiceData)
      const filePath = `/invoices/${fileName}`

      await prisma.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber,
          fileName,
          filePath
        }
      })

      return NextResponse.json({ 
        downloadUrl: filePath,
        invoiceNumber 
      })
    }

    if (order.invoice) {
      const filePath = path.join(process.cwd(), 'public', order.invoice.filePath)
      
      if (fs.existsSync(filePath)) {
        return NextResponse.json({ 
          downloadUrl: order.invoice.filePath,
          invoiceNumber: order.invoice.invoiceNumber 
        })
      }
    }

    return NextResponse.json({ error: 'Invoice not available' }, { status: 404 })
  } catch (error) {
    console.error('Invoice generation error:', error)
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
