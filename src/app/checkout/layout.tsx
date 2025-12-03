import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout | SkyzoneBD',
  description: 'Complete your order securely. Multiple payment options available including bKash, Nagad, and cash on delivery.',
  robots: {
    index: false, // Don't index checkout pages
    follow: true,
  },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
