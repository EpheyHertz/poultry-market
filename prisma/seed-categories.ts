import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const POULTRY_CATEGORIES = [
  {
    name: 'Day-Old Chicks',
    slug: 'day-old-chicks',
    description: 'Freshly hatched day-old chicks for broiler and layer farming. Available in various breeds.',
    icon: '🐣',
    sortOrder: 1,
  },
  {
    name: 'Broilers',
    slug: 'broilers',
    description: 'Meat chickens bred for fast growth. Includes live broilers and dressed chicken.',
    icon: '🍗',
    sortOrder: 2,
  },
  {
    name: 'Layers',
    slug: 'layers',
    description: 'Egg-producing hens and pullets. Point-of-lay and mature laying hens available.',
    icon: '🐔',
    sortOrder: 3,
  },
  {
    name: 'Feed',
    slug: 'feed',
    description: 'Poultry feeds including starter, grower, finisher, and layer mash from trusted brands.',
    icon: '🌾',
    sortOrder: 4,
  },
  {
    name: 'Vaccines',
    slug: 'vaccines',
    description: 'Essential poultry vaccines for Newcastle, Gumboro, Fowl Pox, and other diseases.',
    icon: '💉',
    sortOrder: 5,
  },
  {
    name: 'Equipment',
    slug: 'equipment',
    description: 'Poultry farming equipment including feeders, drinkers, heaters, and ventilation systems.',
    icon: '⚙️',
    sortOrder: 6,
  },
  {
    name: 'Incubators',
    slug: 'incubators',
    description: 'Egg incubators and hatching equipment. Manual, semi-automatic, and fully automatic models.',
    icon: '🥚',
    sortOrder: 7,
  },
  {
    name: 'Cages',
    slug: 'cages',
    description: 'Poultry cages and housing systems. Battery cages, free-range enclosures, and brooder cages.',
    icon: '🏠',
    sortOrder: 8,
  },
  {
    name: 'Eggs',
    slug: 'eggs',
    description: 'Fresh table eggs, fertilized hatching eggs, and kienyeji eggs. Wholesale and retail.',
    icon: '🥚',
    sortOrder: 9,
  },
]

async function main() {
  console.log('🐔 Seeding poultry categories...')

  for (const category of POULTRY_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        ...category,
        isActive: true,
      },
    })
    console.log(`  ✅ ${category.name}`)
  }

  console.log(`\n🎉 Seeded ${POULTRY_CATEGORIES.length} poultry categories successfully!`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
