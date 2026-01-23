import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Products - Wholesale Electrical Hardware Bangladesh',
  description: 'Browse 1000+ wholesale electrical hardware products in Bangladesh. LED lights, bulbs, wires, cables, switches, capacitors, regulators, plugs at factory prices. Bulk orders welcome from verified suppliers.',
  keywords: 'wholesale products Bangladesh, electrical hardware, LED wholesale, bulk buy, wholesale electronics, electrical supplier Bangladesh, Dhaka wholesale',
  alternates: {
    canonical: 'https://skyzonebd.shop/products',
  },
  openGraph: {
    title: 'Shop Wholesale Electrical Hardware - SkyzoneBD',
    description: 'Browse 1000+ wholesale products at factory prices',
    type: 'website',
    url: 'https://skyzonebd.shop/products',
    images: [
      {
        url: '/og-products.jpg',
        width: 1200,
        height: 630,
        alt: 'SkyzoneBD Wholesale Products',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop Wholesale Electrical Hardware - SkyzoneBD',
    description: 'Browse 1000+ wholesale products at factory prices',
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
