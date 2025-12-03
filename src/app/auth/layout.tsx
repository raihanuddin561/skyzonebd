import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | SkyzoneBD',
  description: 'Login to your SkyzoneBD account. Access your orders, wishlist, and exclusive wholesale pricing.',
  robots: {
    index: false, // Don't index auth pages
    follow: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
