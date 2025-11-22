const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductImages() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        sku: true
      }
    });

    console.log('\n=== Product Image Check ===');
    console.log(`Total products: ${products.length}`);
    
    const withImages = products.filter(p => p.imageUrl);
    const withoutImages = products.filter(p => !p.imageUrl);
    
    console.log(`Products with images: ${withImages.length}`);
    console.log(`Products without images: ${withoutImages.length}`);
    
    console.log('\n=== Products with Images ===');
    withImages.forEach(p => {
      console.log(`- ${p.name} (${p.sku}): ${p.imageUrl}`);
    });
    
    if (withoutImages.length > 0) {
      console.log('\n=== Products WITHOUT Images ===');
      withoutImages.forEach(p => {
        console.log(`- ${p.name} (${p.sku}): NO IMAGE`);
      });
    }

    // Check order items that reference these products
    const orderItems = await prisma.orderItem.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        order: {
          select: {
            orderNumber: true
          }
        }
      },
      take: 10 // Just check first 10
    });

    console.log('\n=== Recent Order Items ===');
    orderItems.forEach(item => {
      console.log(`Order ${item.order.orderNumber}: ${item.product.name} - Image: ${item.product.imageUrl || 'MISSING'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductImages();
