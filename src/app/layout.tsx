import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartMigration } from "./components/CartMigration";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://skyzonebd.shop'),
  title: {
    default: "SkyzoneBD - Bangladesh B2B Wholesale Electrical Hardware | LED, Bulbs, Wires, Switches",
    template: "%s | SkyzoneBD"
  },
  description: "Bangladesh's #1 B2B wholesale marketplace for electrical hardware. Buy LED lights, bulbs, wires, cable ties, switches, capacitors, regulators, and plugs in bulk at factory prices. Verified suppliers, fast delivery across Bangladesh.",
  keywords: "B2B wholesale Bangladesh, electrical hardware wholesale, LED wholesale Bangladesh, bulk buy electrical, wholesale bulbs Bangladesh, wire cable wholesale, switch socket wholesale, capacitor wholesale, regulator wholesale, electrical supplier Bangladesh, Dhaka wholesale market",
  authors: [{ name: "SkyzoneBD" }],
  creator: "SkyzoneBD",
  publisher: "SkyzoneBD",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_BD',
    url: 'https://skyzonebd.shop',
    siteName: 'SkyzoneBD',
    title: 'SkyzoneBD - Bangladesh B2B Wholesale Electrical Hardware Marketplace',
    description: 'Buy electrical hardware in bulk from verified suppliers. LED, bulbs, wires, switches at wholesale prices.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SkyzoneBD - Wholesale Electrical Hardware Bangladesh',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SkyzoneBD - B2B Wholesale Electrical Hardware',
    description: 'Bangladesh\'s trusted wholesale marketplace for electrical products',
    creator: '@skyzonebd',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://skyzonebd.shop',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OrganizationSchema />
        <WebSiteSchema />
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <CartMigration />
              {children}
              <ToastContainer
                position="top-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                style={{
                  zIndex: 9999,
                }}
                toastStyle={{
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                  fontSize: '15px',
                  fontWeight: 500,
                }}
              />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
