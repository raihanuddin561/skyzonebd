import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Products - Shop Wholesale & Retail | SkyzoneBD',
  description: 'Browse thousands of quality products from verified suppliers across Bangladesh. Best wholesale and retail prices on electronics, fashion, baby products, home goods, and more. Free shipping on bulk orders.',
  keywords: 'products bangladesh, wholesale products, retail shopping, buy online bangladesh, electronics bd, fashion bd, baby products bd',
  openGraph: {
    title: 'Shop All Products | SkyzoneBD',
    description: 'Browse thousands of quality products from verified suppliers. Best prices in Bangladesh.',
    type: 'website',
    images: [
      {
        url: '/og-products.jpg',
        width: 1200,
        height: 630,
        alt: 'SkyzoneBD Products',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop All Products | SkyzoneBD',
    description: 'Browse thousands of quality products from verified suppliers. Best prices in Bangladesh.',
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
