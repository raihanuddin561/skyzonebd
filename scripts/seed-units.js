const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function seedUnits() {
  console.log('🌱 Seeding default units...\n');

  const defaultUnits = [
    { name: 'Piece', symbol: 'piece', description: 'Individual unit' },
    { name: 'Pieces', symbol: 'pcs', description: 'Multiple individual units' },
    { name: 'Kilogram', symbol: 'kg', description: 'Weight measurement' },
    { name: 'Gram', symbol: 'g', description: 'Small weight measurement' },
    { name: 'Liter', symbol: 'L', description: 'Liquid volume' },
    { name: 'Milliliter', symbol: 'ml', description: 'Small liquid volume' },
    { name: 'Meter', symbol: 'm', description: 'Length measurement' },
    { name: 'Centimeter', symbol: 'cm', description: 'Small length measurement' },
    { name: 'Box', symbol: 'box', description: 'Boxed items' },
    { name: 'Pack', symbol: 'pack', description: 'Packaged items' },
    { name: 'Dozen', symbol: 'dozen', description: '12 units' },
    { name: 'Pair', symbol: 'pair', description: '2 matching items' },
    { name: 'Set', symbol: 'set', description: 'Group of items' },
    { name: 'Bundle', symbol: 'bundle', description: 'Bundled items' },
    { name: 'Carton', symbol: 'carton', description: 'Carton packaging' },
    { name: 'Bag', symbol: 'bag', description: 'Bagged items' },
    { name: 'Bottle', symbol: 'bottle', description: 'Bottled items' },
    { name: 'Can', symbol: 'can', description: 'Canned items' },
    { name: 'Roll', symbol: 'roll', description: 'Rolled items' },
    { name: 'Sheet', symbol: 'sheet', description: 'Sheet items' },
  ];

  for (const unit of defaultUnits) {
    try {
      const existing = await prisma.unit.findFirst({
        where: {
          OR: [
            { name: unit.name },
            { symbol: unit.symbol },
          ],
        },
      });

      if (!existing) {
        await prisma.unit.create({
          data: {
            name: unit.name,
            symbol: unit.symbol,
            description: unit.description,
            isActive: true,
          },
        });
        console.log(`✓ Created unit: ${unit.name} (${unit.symbol})`);
      } else {
        console.log(`⊘ Unit already exists: ${unit.name}`);
      }
    } catch (error) {
      console.error(`✗ Error creating unit ${unit.name}:`, error);
    }
  }

  console.log('\n✅ Units seeding completed!');
}

seedUnits()
  .catch((e) => {
    console.error('Error seeding units:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
