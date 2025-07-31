import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { KENYA_PROVINCES, KENYA_COUNTIES, COUNTY_TO_PROVINCE } from '@/lib/kenya-locations'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { items, deliveryLocation } = await request.json()

    if (!items?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    if (!deliveryLocation?.county) {
      return NextResponse.json({ error: 'Delivery location required' }, { status: 400 })
    }

    const deliveryProvince = COUNTY_TO_PROVINCE[deliveryLocation.county]
    if (!deliveryProvince) {
      return NextResponse.json({ error: 'Invalid delivery location' }, { status: 400 })
    }

    // Group items by seller
    const sellerGroups = new Map()
    
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              role: true,
              offersDelivery: true,
              offersPayAfterDelivery: true,
              offersFreeDelivery: true,
              deliveryProvinces: true,
              deliveryCounties: true,
              minOrderForFreeDelivery: true,
              deliveryFeePerKm: true,
            }
          }
        }
      })

      if (!product || !product.isActive) {
        return NextResponse.json(
          { error: `Product ${item.productId} is unavailable` },
          { status: 400 }
        )
      }

      const sellerId = product.sellerId
      if (!sellerGroups.has(sellerId)) {
        sellerGroups.set(sellerId, {
          seller: product.seller,
          items: [],
          subtotal: 0
        })
      }

      const group = sellerGroups.get(sellerId)
      const itemPrice = product.price * item.quantity
      group.items.push({
        product,
        quantity: item.quantity,
        price: itemPrice
      })
      group.subtotal += itemPrice
    }

    // Calculate delivery options for each seller group
    const deliveryOptions: any[] = []

    for (const [sellerId, group] of sellerGroups) {
      const seller = group.seller
      const subtotal = group.subtotal

      let deliveryOption = {
        sellerId,
        sellerName: seller.name,
        sellerRole: seller.role,
        items: group.items,
        subtotal,
        canDeliver: false,
        deliveryAvailable: false,
        paymentOptions: ['BEFORE_DELIVERY'], // Default
        deliveryFee: 0,
        freeDeliveryEligible: false,
        deliveryMessage: '',
        requiresPlatformDelivery: false
      }

      // Check if seller offers delivery
      if (!seller.offersDelivery) {
        deliveryOption.requiresPlatformDelivery = true
        deliveryOption.deliveryMessage = 'This seller uses platform delivery service'
        // Use platform default delivery fee
        const platformDeliveryFee = await prisma.deliveryFee.findFirst({
          where: { isDefault: true }
        })
        deliveryOption.deliveryFee = platformDeliveryFee?.amount || 200
      } else {
        // Check if seller delivers to this location
        const deliversToProvince = seller.deliveryProvinces.includes(deliveryProvince)
        const deliversToCounty = seller.deliveryCounties.includes(deliveryLocation.county)

        if (!deliversToProvince && !deliversToCounty) {
          deliveryOption.canDeliver = false
          deliveryOption.deliveryMessage = `${seller.name} doesn't deliver to ${deliveryLocation.county}`
        } else {
          deliveryOption.canDeliver = true
          deliveryOption.deliveryAvailable = true

          // Add pay after delivery option if seller supports it
          if (seller.offersPayAfterDelivery) {
            deliveryOption.paymentOptions.push('AFTER_DELIVERY')
          }

          // Calculate delivery fee
          if (seller.offersFreeDelivery) {
            const minForFree = seller.minOrderForFreeDelivery || 0
            if (subtotal >= minForFree) {
              deliveryOption.freeDeliveryEligible = true
              deliveryOption.deliveryFee = 0
              deliveryOption.deliveryMessage = 'Free delivery available'
            } else {
              deliveryOption.deliveryFee = seller.deliveryFeePerKm || 100
              deliveryOption.deliveryMessage = `Ksh ${minForFree - subtotal} more for free delivery`
            }
          } else {
            deliveryOption.deliveryFee = seller.deliveryFeePerKm || 100
            deliveryOption.deliveryMessage = 'Standard delivery fee applies'
          }
        }
      }

      deliveryOptions.push(deliveryOption)
    }

    // Check if any items can't be delivered
    const undeliverableItems = deliveryOptions.filter(option => !option.canDeliver && !option.requiresPlatformDelivery)
    
    return NextResponse.json({
      deliveryLocation: {
        county: deliveryLocation.county,
        province: deliveryProvince
      },
      deliveryOptions,
      canProceedWithOrder: undeliverableItems.length === 0,
      totalDeliveryFee: deliveryOptions.reduce((sum, option) => sum + option.deliveryFee, 0),
      undeliverableItems: undeliverableItems.length > 0 ? undeliverableItems : null,
      hasPayAfterDeliveryOptions: deliveryOptions.some(option => option.paymentOptions.includes('AFTER_DELIVERY')),
      message: undeliverableItems.length > 0 
        ? 'Some items cannot be delivered to your location'
        : 'All items can be delivered to your location'
    })

  } catch (error) {
    console.error('Delivery options error:', error)
    return NextResponse.json({ error: 'Failed to calculate delivery options' }, { status: 500 })
  }
}
