import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Products - Find Wholesale Electrical Hardware',
  description: 'Search wholesale electrical hardware products in Bangladesh. Find LEDs, bulbs, wires, switches, capacitors, regulators and more at best prices. Filter by category, price, and availability.',
  keywords: 'search products Bangladesh, find electrical hardware, wholesale search, electrical products finder',
  alternates: {
    canonical: 'https://skyzonebd.shop/search',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Search Wholesale Products - SkyzoneBD',
    description: 'Find the perfect electrical hardware products from verified suppliers',
    type: 'website',
    url: 'https://skyzonebd.shop/search',
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
