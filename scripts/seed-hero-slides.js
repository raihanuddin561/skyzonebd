const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedHeroSlides() {
  try {
    console.log('🌱 Seeding hero slides...');

    // Delete existing slides
    await prisma.heroSlide.deleteMany({});
    console.log('✓ Cleared existing hero slides');

    // Get some products to link to slides
    const products = await prisma.product.findMany({
      take: 3,
      where: {
        availability: 'in_stock'
      }
    });
    console.log(`✓ Found ${products.length} products to feature`);

    // Create sample slides with product links if available
    const slide1 = await prisma.heroSlide.create({
      data: {
        title: products[0] ? `Featured: ${products[0].name}` : 'Summer Electronics Sale',
        subtitle: products[0] ? 'Special offer - Limited stock available!' : 'Up to 50% off on premium electronics',
        imageUrl: products[0]?.imageUrl || 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200',
        linkUrl: products[0] ? `/products/${products[0].id}` : '/products',
        productId: products[0]?.id || null,
        buttonText: 'Shop Now',
        position: 1,
        isActive: true,
        bgColor: '#3B82F6',
        textColor: '#FFFFFF',
      }
    });
    console.log('✓ Created slide 1:', slide1.title);

    const slide2 = await prisma.heroSlide.create({
      data: {
        title: products[1] ? `Hot Deal: ${products[1].name}` : 'Baby Care Essentials',
        subtitle: products[1] ? 'Grab it before it\'s gone!' : 'Everything your little one needs',
        imageUrl: products[1]?.imageUrl || 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1200',
        linkUrl: products[1] ? `/products/${products[1].id}` : '/categories/baby-items',
        productId: products[1]?.id || null,
        buttonText: 'Explore Now',
        position: 2,
        isActive: true,
        bgColor: '#EC4899',
        textColor: '#FFFFFF',
      }
    });
    console.log('✓ Created slide 2:', slide2.title);

    const slide3 = await prisma.heroSlide.create({
      data: {
        title: products[2] ? `Best Seller: ${products[2].name}` : 'Smart Home Devices',
        subtitle: products[2] ? 'Top rated by customers' : 'Make your home intelligent',
        imageUrl: products[2]?.imageUrl || 'https://images.unsplash.com/photo-1558002038-1055907df827?w=1200',
        linkUrl: products[2] ? `/products/${products[2].id}` : '/categories/electronics',
        productId: products[2]?.id || null,
        buttonText: 'View Collection',
        position: 3,
        isActive: true,
        bgColor: '#8B5CF6',
        textColor: '#FFFFFF',
      }
    });
    console.log('✓ Created slide 3:', slide3.title);

    console.log('✅ Hero slides seeded successfully!');
    console.log('Total slides created:', 3);
  } catch (error) {
    console.error('❌ Error seeding hero slides:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedHeroSlides()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
