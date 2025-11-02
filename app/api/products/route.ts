import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'
import { ProductType } from '@prisma/client'
import { formatProductTypeLabel } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const sellerId = searchParams.get('sellerId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (type) {
      where.type = type as ProductType
    }
    
    if (sellerId) {
      where.sellerId = sellerId
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              role: true,
              dashboardSlug: true,
              tags: {
                select: {
                  tag: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where })
    ])

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Products fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || (user.role !== 'SELLER' && user.role !== 'COMPANY')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, price, stock, type, images, customType } = await request.json()

    const normalizedType = type as ProductType
    const trimmedCustomType = typeof customType === 'string' ? customType.trim() : ''

    // Validate product type based on user role
    if (user.role === 'SELLER') {
      const allowedTypes = ['EGGS', 'CHICKEN_MEAT', 'CUSTOM']
      if (!allowedTypes.includes(normalizedType)) {
        return NextResponse.json({ 
          error: 'Sellers can list eggs, chicken meat, or define a custom product type' 
        }, { status: 400 })
      }
    } else if (user.role === 'COMPANY') {
      const allowedTypes = ['CHICKEN_FEED', 'CHICKS', 'HATCHING_EGGS', 'CUSTOM']
      if (!allowedTypes.includes(normalizedType)) {
        return NextResponse.json({ 
          error: 'Companies can list chicken feed, chicks, hatching eggs, or define a custom product type' 
        }, { status: 400 })
      }
    }

    if (normalizedType === 'CUSTOM' && !trimmedCustomType) {
      return NextResponse.json({
        error: 'Please provide a custom product type name'
      }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        type: normalizedType,
        customType: normalizedType === 'CUSTOM' ? trimmedCustomType : null,
        images: images || [],
        sellerId: user.id,
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            tags: {
              select: {
                tag: true
              }
            }
          }
        }
      }
    })

    // Send email notification to seller about successful product creation
    try {
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin-bottom: 10px;">🐔 PoultryMarket</h1>
            <h2 style="color: #2563eb; margin: 0;">Product Created Successfully!</h2>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
            <h3 style="margin-top: 0; color: #0c4a6e; font-size: 18px;">📦 ${product.name}</h3>
            <div style="color: #475569; font-size: 14px;">
              <p style="margin: 5px 0;"><strong>Product ID:</strong> ${product.id}</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${formatProductTypeLabel(product.type, product.customType)}</p>
              <p style="margin: 5px 0;"><strong>Price:</strong> Ksh ${product.price.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Stock:</strong> ${product.stock} units</p>
              <p style="margin: 5px 0;"><strong>Created on:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>

          <div style="background-color: #fefce8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #eab308;">
            <h4 style="margin-top: 0; color: #a16207; font-size: 16px;">🎉 What's Next?</h4>
            <ul style="color: #713f12; margin: 10px 0; padding-left: 20px;">
              <li>Your product is now live and available for customers to purchase</li>
              <li>Monitor your sales and inventory through the dashboard</li>
              <li>Update product details anytime to keep information current</li>
              <li>Add more high-quality images to attract more buyers</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/seller/products" 
               style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Your Products →
            </a>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #6b7280;">
            <p style="margin: 5px 0; font-size: 13px;">This is an automated notification from your PoultryMarket dashboard.</p>
            <p style="margin: 5px 0; font-size: 13px;">Happy selling! 🚀</p>
            <div style="margin-top: 15px;">
              <p style="margin: 5px 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} PoultryMarket. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      `;

      await sendEmail({
        to: user.email!,
        subject: `Product Created: ${product.name}`,
        html: emailContent
      });

      console.log(`Product creation email sent to ${user.email} for product ${product.name}`);
    } catch (emailError) {
      console.error('Failed to send product creation email:', emailError);
      // Don't fail the request if email fails
    }

    // Notify admin about new product
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      })

      for (const admin of adminUsers) {
        await createNotification({
          receiverId: admin.id,
          senderId: user.id,
          type: 'EMAIL',
          title: 'New Product Created',
          message: `A new product "${name}" has been created by ${user.name}. Please review it in the admin panel.`
        })
      }
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError)
      // Don't fail product creation if notification fails
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}