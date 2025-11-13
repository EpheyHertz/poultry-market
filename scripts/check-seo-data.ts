import { prisma } from '../lib/prisma';

async function checkSEOData() {
  console.log('Checking SEO data...\n');

  // Check products with slugs
  const productsWithSlugs = await prisma.product.count({
    where: {
      slug: {
        not: null
      }
    }
  });
  
  const totalProducts = await prisma.product.count();
  console.log(`Products: ${productsWithSlugs} with slugs out of ${totalProducts} total`);

  // Check blog posts
  const blogPosts = await prisma.blogPost.count({
    where: {
      status: 'PUBLISHED'
    }
  });
  console.log(`Published blog posts: ${blogPosts}`);

  // Check categories
  const categories = await prisma.category.count();
  console.log(`Categories: ${categories}`);

  // Sample products
  const sampleProducts = await prisma.product.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
    take: 5
  });

  console.log('\nSample products:');
  sampleProducts.forEach(p => {
    console.log(`- ${p.name}: slug=${p.slug || 'NO SLUG'}, active=${p.isActive}`);
  });

  // Sample blog posts
  const sampleBlogs = await prisma.blogPost.findMany({
    where: {
      status: 'PUBLISHED'
    },
    select: {
      title: true,
      slug: true,
      author: {
        select: {
          name: true
        }
      }
    },
    take: 5
  });

  console.log('\nSample blog posts:');
  sampleBlogs.forEach(b => {
    const authorSlug = b.author.name.replace(/\s+/g, '-').toLowerCase();
    console.log(`- ${b.title}: /blog/${authorSlug}/${b.slug}`);
  });

  await prisma.$disconnect();
}

checkSEOData().catch(console.error);
