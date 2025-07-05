
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

interface InvoiceData {
  invoiceNumber: string
  order: any
  customer: any
  seller: any
  items: any[]
  subtotal: number
  discountAmount: number
  total: number
  voucherCode?: string
}

export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  const doc = new PDFDocument({ margin: 50 })
  const fileName = `invoice-${data.invoiceNumber}.pdf`
  const filePath = path.join(process.cwd(), 'public', 'invoices', fileName)
  
  // Ensure directory exists
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const stream = fs.createWriteStream(filePath)
  doc.pipe(stream)

  // Header
  doc.fontSize(20).text('INVOICE', 50, 50)
  doc.fontSize(10).text('Poultry Marketplace', 50, 80)
  
  // Invoice details
  doc.fontSize(12)
    .text(`Invoice #: ${data.invoiceNumber}`, 400, 50)
    .text(`Date: ${new Date().toLocaleDateString()}`, 400, 70)
    .text(`Order ID: ${data.order.id}`, 400, 90)

  // Billing details
  doc.text('Bill To:', 50, 130)
  doc.fontSize(10)
    .text(data.customer.name, 50, 150)
    .text(data.customer.email, 50, 165)
    .text(data.customer.phone || '', 50, 180)

  doc.text('From:', 300, 130)
  doc.fontSize(10)
    .text(data.seller.name, 300, 150)
    .text(data.seller.email, 300, 165)
    .text(data.seller.phone || '', 300, 180)

  // Items table
  let y = 220
  doc.fontSize(12).text('Items:', 50, y)
  y += 20

  // Table headers
  doc.fontSize(10)
    .text('Item', 50, y)
    .text('Qty', 200, y)
    .text('Price', 250, y)
    .text('Total', 350, y)
  
  y += 20
  doc.moveTo(50, y).lineTo(550, y).stroke()
  y += 10

  // Items
  data.items.forEach(item => {
    const itemTotal = item.quantity * item.price
    doc.text(item.product.name, 50, y)
      .text(item.quantity.toString(), 200, y)
      .text(`KSH ${item.price.toFixed(2)}`, 250, y)
      .text(`KSH ${itemTotal.toFixed(2)}`, 350, y)
    y += 20
  })

  // Totals
  y += 20
  doc.moveTo(250, y).lineTo(550, y).stroke()
  y += 10

  doc.text(`Subtotal: KSH ${data.subtotal.toFixed(2)}`, 300, y)
  y += 15

  if (data.discountAmount > 0) {
    doc.text(`Discount: -KSH ${data.discountAmount.toFixed(2)}`, 300, y)
    if (data.voucherCode) {
      doc.text(`(Voucher: ${data.voucherCode})`, 450, y)
    }
    y += 15
  }

  doc.fontSize(12).text(`Total: KSH ${data.total.toFixed(2)}`, 300, y)

  // Footer
  doc.fontSize(8)
    .text('Thank you for your business!', 50, doc.page.height - 100)
    .text('Poultry Marketplace - Fresh Farm Products', 50, doc.page.height - 85)

  doc.end()

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(fileName))
    stream.on('error', reject)
  })
}

