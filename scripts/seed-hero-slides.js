const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedHeroSlides() {
  try {
    console.log('🌱 Seeding hero slides...');

    // Delete existing slides
    await prisma.heroSlide.deleteMany({});
    console.log('✓ Cleared existing hero slides');

    // Create sample slides
    const slide1 = await prisma.heroSlide.create({
      data: {
        title: 'Summer Electronics Sale',
        subtitle: 'Up to 50% off on premium electronics',
        imageUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200',
        linkUrl: '/products',
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
        title: 'Baby Care Essentials',
        subtitle: 'Everything your little one needs',
        imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=1200',
        linkUrl: '/categories/baby-items',
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
        title: 'Smart Home Devices',
        subtitle: 'Make your home intelligent',
        imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=1200',
        linkUrl: '/categories/electronics',
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
