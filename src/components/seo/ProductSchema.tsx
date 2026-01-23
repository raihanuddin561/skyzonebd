// Product-specific structured data schemas

type ProductWithRelations = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sku?: string | null;
  price: number;
  wholesalePrice?: number | null;
  stockQuantity: number;
  rating?: number | null;
  category?: { name: string } | null;
  supplier?: { companyName?: string | null } | null;
};

export function ProductSchema({ product }: { product: ProductWithRelations }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `Buy ${product.name} at wholesale prices in Bangladesh`,
    image: product.imageUrl || [],
    sku: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.supplier?.companyName || 'SkyzoneBD Verified Supplier',
    },
    offers: {
      '@type': 'Offer',
      url: `https://skyzonebd.shop/products/${product.id}`,
      priceCurrency: 'BDT',
      price: product.wholesalePrice || product.price,
      availability: product.stockQuantity > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'SkyzoneBD',
      },
    },
    ...(product.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: 1, // Update from reviews table if available
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
