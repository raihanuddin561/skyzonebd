import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard | SkyzoneBD',
  description: 'SkyzoneBD Admin Control Panel',
  robots: {
    index: false, // Never index admin pages
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
