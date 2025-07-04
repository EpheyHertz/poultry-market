import { PrismaClient, UserRole, ProductType, OrderStatus, ApplicationStatus, TagType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@poultry.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  })

  // Create a company
  const company = await prisma.user.create({
    data: {
      email: 'company@poultry.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Premium Poultry Co.',
      role: UserRole.COMPANY,
      dashboardSlug: 'premium-poultry',
    },
  })

  // Create a seller
  const seller = await prisma.user.create({
    data: {
      email: 'seller@poultry.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Farm Fresh Seller',
      role: UserRole.SELLER,
      dashboardSlug: 'farm-fresh',
    },
  })

  // Create a customer
  const customer = await prisma.user.create({
    data: {
      email: 'customer@poultry.com',
      password: await bcrypt.hash('password123', 10),
      name: 'John Customer',
      role: UserRole.CUSTOMER,
    },
  })

  // Add tags to company and seller
  await prisma.userTag.createMany({
    data: [
      { userId: company.id, tag: TagType.VERIFIED },
      { userId: company.id, tag: TagType.TRUSTED },
      { userId: seller.id, tag: TagType.VERIFIED },
      { userId: seller.id, tag: TagType.RECOMMENDED },
    ],
  })

  // Create products for company
  await prisma.product.createMany({
    data: [
      {
        name: 'Premium Chicken Feed',
        description: 'High-quality chicken feed for optimal growth',
        price: 25.99,
        stock: 100,
        type: ProductType.CHICKEN_FEED,
        sellerId: company.id,
        images: ['https://images.pexels.com/photos/162240/chicken-feed-food-eat-162240.jpeg'],
      },
      {
        name: 'Rhode Island Red Chicks',
        description: 'Healthy Rhode Island Red chicks, 1 week old',
        price: 5.99,
        stock: 50,
        type: ProductType.CHICKS,
        sellerId: company.id,
        images: ['https://images.pexels.com/photos/3596906/pexels-photo-3596906.jpeg'],
      },
      {
        name: 'Fertile Hatching Eggs',
        description: 'Premium quality hatching eggs from heritage breeds',
        price: 12.99,
        stock: 200,
        type: ProductType.HATCHING_EGGS,
        sellerId: company.id,
        images: ['https://images.pexels.com/photos/1556707/pexels-photo-1556707.jpeg'],
      },
    ],
  })

  // Create products for seller
  await prisma.product.createMany({
    data: [
      {
        name: 'Fresh Farm Eggs',
        description: 'Free-range chicken eggs, collected daily',
        price: 4.99,
        stock: 500,
        type: ProductType.EGGS,
        sellerId: seller.id,
        images: ['https://images.pexels.com/photos/1556707/pexels-photo-1556707.jpeg'],
      },
      {
        name: 'Organic Chicken Meat',
        description: 'Pasture-raised organic chicken meat',
        price: 8.99,
        stock: 30,
        type: ProductType.CHICKEN_MEAT,
        sellerId: seller.id,
        images: ['https://images.pexels.com/photos/616401/pexels-photo-616401.jpeg'],
      },
    ],
  })

  // Create vouchers
  await prisma.voucher.createMany({
    data: [
      {
        code: 'WELCOME10',
        discount: 10,
        type: 'percentage',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        maxUses: 100,
        createdById: company.id,
      },
      {
        code: 'FRESH20',
        discount: 20,
        type: 'percentage',
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        maxUses: 50,
        createdById: seller.id,
      },
    ],
  })

  // Create sample orders
  const products = await prisma.product.findMany()
  const eggProduct = products.find(p => p.type === ProductType.EGGS)
  
  if (eggProduct) {
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        status: OrderStatus.PENDING,
        total: eggProduct.price * 2,
        items: {
          create: {
            productId: eggProduct.id,
            quantity: 2,
            price: eggProduct.price,
          },
        },
      },
    })

    // Create delivery for the order
    await prisma.delivery.create({
      data: {
        orderId: order.id,
        address: '123 Farm Road, Countryside, FC 12345',
        trackingId: 'TRK001',
        status: 'processing',
      },
    })
  }

  // Create sample applications
  await prisma.application.createMany({
    data: [
      {
        userId: customer.id,
        requestedRole: UserRole.SELLER,
        businessName: 'Local Farm Co.',
        businessType: 'Small Farm',
        documents: ['https://example.com/license.pdf'],
        status: ApplicationStatus.PENDING,
      },
    ],
  })

  // Create sponsorship
  await prisma.sponsorship.create({
    data: {
      companyId: company.id,
      sellerId: seller.id,
      amount: 500,
      description: 'Sponsorship for equipment upgrade',
      status: ApplicationStatus.APPROVED,
    },
  })

  console.log('Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })