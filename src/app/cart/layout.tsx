import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shopping Cart | SkyzoneBD',
  description: 'Review your shopping cart and proceed to checkout. Secure online shopping in Bangladesh with multiple payment options.',
  robots: {
    index: false, // Don't index cart pages
    follow: true,
  },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
