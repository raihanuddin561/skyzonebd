// __tests__/config/schema-indexes.test.ts
// Verifies P1-3: the required @@index directives are present on the models
// that back the highest-traffic queries (product listing/category filter,
// address lookups, RFQ lookups). A missing index here means a migration
// silently regressed a query plan that used to be indexed.

import fs from 'fs';
import path from 'path';

const schema = fs.readFileSync(
  path.join(__dirname, '../../prisma/schema.prisma'),
  'utf-8'
);

function modelBlock(modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`));
  if (!match) throw new Error(`model ${modelName} not found in schema.prisma`);
  return match[0];
}

describe('prisma schema — required indexes (P1-3)', () => {
  it('Address has an index on userId', () => {
    expect(modelBlock('Address')).toMatch(/@@index\(\[userId\]\)/);
  });

  it('Product has indexes on categoryId, sellerId, isActive, isFeatured', () => {
    const product = modelBlock('Product');
    expect(product).toMatch(/@@index\(\[categoryId\]\)/);
    expect(product).toMatch(/@@index\(\[sellerId\]\)/);
    expect(product).toMatch(/@@index\(\[isActive\]\)/);
    expect(product).toMatch(/@@index\(\[isFeatured\]\)/);
  });

  it('RFQ has an index on userId', () => {
    expect(modelBlock('RFQ')).toMatch(/@@index\(\[userId\]\)/);
  });

  it('RFQItem has indexes on rfqId and productId', () => {
    const rfqItem = modelBlock('RFQItem');
    expect(rfqItem).toMatch(/@@index\(\[rfqId\]\)/);
    expect(rfqItem).toMatch(/@@index\(\[productId\]\)/);
  });
});
